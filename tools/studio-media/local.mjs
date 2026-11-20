import * as NodeChildProcess from 'node:child_process';
import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import { requireId } from './project.mjs';

// oxlint-disable-next-line t3code/no-global-process-runtime -- This standalone Node host selects platform file semantics and the native speech engine.
export const isWindowsHost = process.platform === 'win32';

export function localPath(value, base = process.cwd()) {
  if (typeof value !== 'string' || !value.trim() || /[\x00-\x1f]/.test(value) || /^[\\/]{2}/.test(value))
    throw new Error('Expected an ordinary local file path');
  const windows = isWindowsHost;
  const tail = windows ? value.replace(/^[a-z]:[\\/]/i, '') : value;
  if (/^[a-z][a-z\d+.-]*:/i.test(tail) || (windows && (tail.includes(':') ||
      /(?:^|[\\/])(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?=[ .\\/]|$)/i.test(tail))))
    throw new Error('Expected an ordinary local file path');
  return NodePath.resolve(base, value);
}

export async function checkedFile(value, base) {
  const full = localPath(await NodeFSP.realpath(localPath(value, base)));
  if (!(await NodeFSP.stat(full)).isFile()) throw new Error('Expected a regular local file: ' + full);
  return full;
}

export async function readJson(value) {
  const file = await checkedFile(value);
  const handle = await NodeFSP.open(file, 'r');
  try {
    if ((await handle.stat()).size > 1024 * 1024) throw new Error('JSON input exceeds 1 MiB');
    return JSON.parse((await handle.readFile('utf8')).replace(/^\uFEFF/, ''));
  } finally {
    await handle.close();
  }
}

const demuxers = { '.mp4': 'mov', '.mov': 'mov', '.m4v': 'mov', '.webm': 'matroska', '.mkv': 'matroska' };

export async function readAssets(file, plan) {
  const map = await readJson(file);
  if (!map || Array.isArray(map) || typeof map !== 'object' || Object.keys(map).length > 120)
    throw new Error('Invalid local assets map');
  const assets = new Map();
  for (const [id, value] of Object.entries(map)) {
    requireId(id, 'asset ID');
    const full = await checkedFile(value, NodePath.dirname(localPath(file)));
    const demuxer = demuxers[NodePath.extname(full).toLowerCase()];
    if (!demuxer) throw new Error('Unsupported local video container for ' + id);
    assets.set(id, { full, demuxer });
  }
  for (const scene of plan.scenes) {
    if (!assets.has(scene.source)) throw new Error('Missing local asset: ' + scene.source);
  }
  return assets;
}

// Keep the child's final diagnostics and drain both pipes without retaining its full log.
export function run(binary, args, { cwd, signal, inspect, timeout = 10 * 60 * 1000 } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = NodeChildProcess.spawn(binary, args, { cwd, shell: false, windowsHide: true,
      env: cwd ? { ...process.env, TMP: cwd, TEMP: cwd, TMPDIR: cwd } : process.env,
      stdio: ['ignore', 'pipe', 'pipe'], signal, timeout, killSignal: 'SIGKILL' });
    let out = '', err = '', spawnError;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { out = (out + chunk).slice(-32768); });
    child.stderr.on('data', chunk => {
      err = (err + chunk).slice(-32768);
      inspect?.(chunk);
    });
    child.once('error', error => { spawnError = error; });
    child.once('close', (code, sig) => {
      if (spawnError) return reject(spawnError);
      if (code !== 0) return reject(new Error(NodePath.basename(binary) + ' exited ' +
        (sig || code) + '. ' + err.trim().slice(-3000)));
      resolve({ out, err });
    });
  });
}
