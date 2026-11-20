import * as NodeChildProcess from 'node:child_process';
import * as NodeFS from 'node:fs';
import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import { isWindowsHost } from '../local.mjs';

function localPath(value, label) {
  if (!value || /[\x00-\x1f]/.test(value) || /^[\\/]{2}/.test(value) || (isWindowsHost && value.replace(/^[A-Za-z]:[\\/]/, '').includes(':'))) {
    throw new Error(`${label} must be a local file path.`);
  }
  return NodePath.resolve(value);
}

export async function inputFile(value, extensions, maxBytes) {
  const path = localPath(await NodeFSP.realpath(localPath(value, 'Input')), 'Input');
  if (!extensions.includes(NodePath.extname(path).toLowerCase())) {
    throw new Error(`Input must have one of these extensions: ${extensions.join(', ')}.`);
  }
  const info = await NodeFSP.stat(path);
  if (!info.isFile() || !info.size || info.size > maxBytes) {
    throw new Error(`Input must be a nonempty regular file no larger than ${maxBytes} bytes.`);
  }
  return path;
}

async function assertAbsent(path) {
  try {
    await NodeFSP.lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('Output already exists. Choose a new filename.');
}

export async function outputFile(value, extension) {
  const path = localPath(value, 'Output');
  if (NodePath.extname(path).toLowerCase() !== extension) {
    throw new Error(`Output must use the ${extension} extension.`);
  }
  const parent = localPath(await NodeFSP.realpath(NodePath.dirname(path)), 'Output directory');
  const target = NodePath.join(parent, NodePath.basename(path));
  await assertAbsent(target);
  return target;
}

export async function writeOutput(target, extension, produce, { signal } = {}) {
  signal?.throwIfAborted();
  const lock = `${target}.studio-media-lock`;
  try {
    await (await NodeFSP.open(lock, 'wx')).close();
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('This output is reserved by another media command.', { cause: error });
    throw error;
  }
  let directory;
  try {
    await assertAbsent(target);
    directory = await NodeFSP.mkdtemp(NodePath.join(NodePath.dirname(target), '.studio-media-'));
    const staged = NodePath.join(directory, `result${extension}`);
    const result = await produce(staged, directory);
    if (!(await NodeFSP.lstat(staged)).isFile()) throw new Error('The adapter did not produce a regular output file.');
    signal?.throwIfAborted();
    await NodeFSP.link(staged, target);
    return { output: target, ...result };
  } finally {
    try {
      if (directory) await NodeFSP.rm(directory, { recursive: true, force: true, maxRetries: 4 });
    } finally {
      await NodeFSP.unlink(lock);
    }
  }
}

function trustedPathEntries() {
  return (process.env.PATH ?? '').split(NodePath.delimiter).filter(path => NodePath.isAbsolute(path) && !/^[\\/]{2}/.test(path));
}

export async function executable(name, variable, selection = process.env[variable]) {
  const extension = isWindowsHost ? '.exe' : '';
  const candidates = selection ? [localPath(selection, variable)] : trustedPathEntries().map(directory => NodePath.join(directory, `${name}${extension}`));
  if (selection && (!NodePath.isAbsolute(selection) || (isWindowsHost && NodePath.extname(selection).toLowerCase() !== '.exe'))) {
    throw new Error(`${variable} must identify a local executable by its absolute path.`);
  }
  for (const candidate of candidates) {
    try {
      if (!(await NodeFSP.stat(candidate)).isFile()) continue;
      await NodeFSP.access(candidate, NodeFS.constants.X_OK);
      return localPath(await NodeFSP.realpath(candidate), variable);
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw error;
    }
  }
  throw new Error(`${name} is unavailable. Set ${variable} to the absolute path of your approved installation.`);
}

function terminateChild(child, killTree) {
  if (!killTree || !child.pid || child.exitCode !== null || child.signalCode !== null) {
    child.kill('SIGKILL');
    return;
  }
  if (!isWindowsHost) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    return;
  }
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot || !NodePath.isAbsolute(systemRoot)) {
    child.kill('SIGKILL');
    return;
  }
  const terminator = NodeChildProcess.spawn(NodePath.join(systemRoot, 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], {
    env: { SystemRoot: systemRoot }, shell: false, windowsHide: true, stdio: 'ignore',
  });
  return new Promise(resolve => {
    terminator.once('error', () => {
      child.kill('SIGKILL');
      resolve();
    });
    terminator.once('exit', code => {
      if (code) child.kill('SIGKILL');
      resolve();
    });
  });
}

export async function runTool(binary, args, { cwd, timeout = 15_000, capBytes, capFile, environment = {}, showFailure = false, signal, killTree = false } = {}) {
  signal?.throwIfAborted();
  const env = { PATH: trustedPathEntries().join(NodePath.delimiter) };
  if (cwd) Object.assign(env, { TMP: cwd, TEMP: cwd, TMPDIR: cwd });
  for (const name of ['SystemRoot', 'WINDIR', 'LANG', 'LC_ALL']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return new Promise((accept, reject) => {
    const child = NodeChildProcess.spawn(binary, args, { cwd, env: { ...env, ...environment }, shell: false, windowsHide: true,
      detached: killTree && !isWindowsHost, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    let failure;
    let termination;
    function stop(error) {
      if (failure) return;
      failure = error;
      termination = terminateChild(child, killTree);
    }
    const onAbort = () => stop(signal.reason ?? new Error('The media operation was cancelled.'));
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => stop(new Error(`${NodePath.basename(binary)} exceeded its time limit.`)), timeout);
    const watcher = capFile && setInterval(async () => {
      for (const path of [capFile, `${capFile}.part`]) {
        try {
          if ((await NodeFSP.stat(path)).size > capBytes) stop(new Error(`${NodePath.basename(binary)} exceeded its output size limit.`));
        } catch (error) {
          if (error.code !== 'ENOENT') stop(error);
        }
      }
    }, 150);
    function collect(chunk) {
      log = (log + chunk.toString('utf8')).slice(-12_000);
    }
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('error', error => { failure = error; });
    child.once('close', async code => {
      signal?.removeEventListener('abort', onAbort);
      clearTimeout(timer);
      if (watcher) clearInterval(watcher);
      await termination;
      if (failure) reject(failure);
      else if (code !== 0) {
        const details = showFailure ? `\n${log.replace(/\x1b\[[0-9;]*m/g, '').trim().slice(-2400)}` : '';
        reject(new Error(`${NodePath.basename(binary)} exited with code ${code}.${details}`));
      }
      else accept(log);
    });
  });
}

export function integer(value, label, min, max) {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  }
  return Number(value);
}

export async function responseBytes(response, maxBytes) {
  if (!response.body) throw new Error('The provider response was empty.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('The provider response exceeded its byte limit.');
      chunks.push(value);
    }
    if (!size) throw new Error('The provider response was empty.');
    return Buffer.concat(chunks, size);
  } finally {
    await reader.cancel().catch(() => {});
  }
}
