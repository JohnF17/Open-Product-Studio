#!/usr/bin/env node

import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import * as NodeURL from 'node:url';
import * as NodeUtil from 'node:util';
import { inputFile, executable, runTool } from './adapters/shared.mjs';
import { isWindowsHost, localPath } from './local.mjs';

const rate = 24_000;
const hostScript = NodeURL.fileURLToPath(new URL('./kokoro-host.py', import.meta.url));

function voiceId(voice) {
  if (typeof voice !== 'string' || !/^(?:af|am|bf|bm)_[a-z]{1,24}$/.test(voice)) {
    throw new Error('Choose a named English Kokoro voice from the installed voice bundle.');
  }
  return voice;
}

async function configuredHost() {
  const python = process.env.STUDIO_KOKORO_PYTHON;
  const model = process.env.STUDIO_KOKORO_MODEL;
  const voices = process.env.STUDIO_KOKORO_VOICES;
  if (![python, model, voices].every(file => file && NodePath.isAbsolute(file))) {
    throw new Error('Set STUDIO_KOKORO_PYTHON, STUDIO_KOKORO_MODEL and STUDIO_KOKORO_VOICES to approved absolute local paths.');
  }
  return Promise.all([
    executable('python', 'STUDIO_KOKORO_PYTHON', python),
    inputFile(model, ['.onnx'], 420 * 1024 * 1024),
    inputFile(voices, ['.bin', '.npz'], 64 * 1024 * 1024),
  ]);
}

export async function checkKokoroHost(voices) {
  if (!Array.isArray(voices) || !voices.length || voices.length > 32) throw new Error('Choose installed Kokoro voices.');
  const selected = [...new Set(voices.map(voiceId))];
  const [python, model, archive] = await configuredHost();
  try {
    await runTool(python, ['-I', '-B', hostScript, 'check', model, archive, ...selected], {
      cwd: NodePath.dirname(model), timeout: 8000,
    });
  } catch (error) {
    throw new Error('The local Kokoro host requires kokoro-onnx 0.6.1 and the selected voices in its voice bundle.', { cause: error });
  }
  return true;
}

async function renderHost({ directory, input, signal }) {
  const [python, model, voices] = await configuredHost();
  const request = NodePath.join(directory, 'speech.json');
  await NodeFSP.writeFile(request, JSON.stringify(input), { flag: 'wx' });
  await runTool(python, ['-I', '-B', hostScript, 'render', model, voices, request], {
    cwd: directory, signal, timeout: 300_000, killTree: true,
    environment: { OMP_NUM_THREADS: '4', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' },
  });
}

async function destination(directory, value, suffix) {
  const target = localPath(value);
  if (NodePath.extname(target).toLowerCase() !== suffix) throw new Error(`Kokoro output must use ${suffix}.`);
  const parent = await NodeFSP.realpath(NodePath.dirname(target));
  if (parent !== directory) throw new Error('Kokoro output must be inside the approved working directory.');
  const resolved = NodePath.join(parent, NodePath.basename(target));
  try { await NodeFSP.lstat(resolved); }
  catch (error) {
    if (error.code === 'ENOENT') return resolved;
    throw error;
  }
  throw new Error('A Kokoro output already exists.');
}

async function pcmDuration(path) {
  const stat = await NodeFSP.lstat(path);
  if (!stat.isFile() || stat.size < 46 || stat.size > 44 + rate * 2 * 120) throw new Error('Invalid Kokoro PCM output size.');
  const file = await NodeFSP.open(path);
  const header = Buffer.alloc(44);
  try { await file.read(header, 0, header.length, 0); }
  finally { await file.close(); }
  const pcm = header.readUInt32LE(40);
  if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 16) !== 'WAVEfmt ' ||
      header.readUInt32LE(16) !== 16 || header.readUInt16LE(20) !== 1 || header.readUInt16LE(22) !== 1 ||
      header.readUInt32LE(24) !== rate || header.readUInt32LE(28) !== rate * 2 ||
      header.readUInt16LE(32) !== 2 || header.readUInt16LE(34) !== 16 ||
      header.toString('ascii', 36, 40) !== 'data' || pcm !== stat.size - 44 || pcm % 2 !== 0) {
    throw new Error('Invalid Kokoro PCM WAV.');
  }
  return pcm / (rate * 2);
}

async function verifyLine(directory, index, line) {
  const wav = NodePath.join(directory, `line-${index}.wav`);
  const timings = NodePath.join(directory, `line-${index}.json`);
  const durationSeconds = await pcmDuration(wav);
  const info = await NodeFSP.lstat(timings);
  if (!info.isFile() || info.size > 8192) throw new Error('Invalid Kokoro phrase timings.');
  const bookmarks = JSON.parse(await NodeFSP.readFile(timings, 'utf8'));
  if (!Array.isArray(bookmarks) || bookmarks.length !== line.phrases.length || bookmarks.some((mark, i) =>
    mark?.index !== i || !Number.isFinite(mark.seconds) || mark.seconds >= durationSeconds ||
    (i === 0 ? mark.seconds !== 0 : mark.seconds <= bookmarks[i - 1].seconds))) {
    throw new Error('Invalid Kokoro phrase timings.');
  }
  return { sources: [[wav, line.wav], [timings, line.timings]], durationSeconds, bookmarks };
}

export async function synthesizeKokoro({ jobs, work, voice, speed = 1, signal }, { render = renderHost } = {}) {
  signal?.throwIfAborted();
  const selected = voiceId(voice);
  if (!Number.isFinite(speed) || speed < 0.8 || speed > 1.2) throw new Error('Choose a Kokoro speed from 0.8 to 1.2.');
  if (!Array.isArray(jobs) || jobs.length < 1 || jobs.length > 120) throw new Error('Choose 1–120 narration lines.');
  const directory = await NodeFSP.realpath(localPath(work));
  const used = new Set();
  let totalLength = 0;
  const lines = [];
  for (const job of jobs) {
    const phrases = job?.phrases;
    if (!Array.isArray(phrases) || phrases.length < 1 || phrases.length > 24 || phrases.some(text =>
      typeof text !== 'string' || !text.trim() || text.length > 560 || /[\x00-\x1f\x7f]/.test(text))) {
      throw new Error('Every Kokoro phrase must be one nonempty line of text.');
    }
    totalLength += phrases.reduce((total, phrase) => total + phrase.length, 0);
    if (totalLength > 48_000) throw new Error('The narration text exceeds the Kokoro batch limit.');
    const wav = await destination(directory, job.wav, '.wav');
    const timings = await destination(directory, job.timings, '.json');
    for (const target of [wav, timings]) {
      const key = isWindowsHost ? target.toLowerCase() : target;
      if (used.has(key)) throw new Error('Kokoro output paths must be distinct.');
      used.add(key);
    }
    lines.push({ phrases: phrases.map(text => text.trim()), wav, timings });
  }

  const staging = await NodeFSP.mkdtemp(NodePath.join(directory, '.studio-kokoro-'));
  const added = [];
  try {
    const input = { voice: selected, speed, phrases: lines.map(line => line.phrases) };
    await render({ directory: staging, input, signal });
    const output = await Promise.all(lines.map((line, index) => verifyLine(staging, index, line)));
    for (const item of output) {
      for (const [from, to] of item.sources) {
        signal?.throwIfAborted();
        await NodeFSP.link(from, to);
        added.push([from, to]);
      }
    }
    return { provider: 'Kokoro', voice: selected, sampleRate: rate, lines: lines.map(({ wav, timings }, index) => ({
      wav, timings, durationSeconds: output[index].durationSeconds, bookmarks: output[index].bookmarks,
    })) };
  } catch (error) {
    for (const [from, to] of added.reverse()) {
      const [before, after] = await Promise.all([NodeFSP.stat(from), NodeFSP.lstat(to).catch(() => null)]);
      if (after && before.dev === after.dev && before.ino === after.ino) await NodeFSP.unlink(to);
    }
    throw error;
  } finally {
    await NodeFSP.rm(staging, { recursive: true, force: true, maxRetries: 4 });
  }
}

async function main(args) {
  const { values, tokens } = NodeUtil.parseArgs({ args, tokens: true, options: {
    lines: { type: 'string' }, 'out-dir': { type: 'string' }, voice: { type: 'string' },
    speed: { type: 'string' }, check: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (!args.length || values.help) {
    console.log('node tools/studio-media/kokoro.mjs --voice af_heart --lines lines.txt --out-dir existing-folder [--speed 1.06]\n  Or --voice af_heart --check');
    return;
  }
  if (tokens.length !== Object.keys(values).length) throw new Error('Use each Kokoro option once.');
  const voice = voiceId(values.voice);
  if (values.check) {
    await checkKokoroHost([voice]);
    console.log(JSON.stringify({ provider: 'Kokoro', voice, status: 'prerequisites-found' }));
    return;
  }
  const input = await inputFile(values.lines, ['.txt'], 192 * 1024);
  const work = await NodeFSP.realpath(localPath(values['out-dir']));
  const lines = new TextDecoder('utf-8', { fatal: true }).decode(await NodeFSP.readFile(input)).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const jobs = lines.map((line, index) => {
    const stem = `line-${String(index + 1).padStart(2, '0')}`;
    return { phrases: [line], wav: NodePath.join(work, stem + '.wav'), timings: NodePath.join(work, stem + '.timings.json') };
  });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    console.log(JSON.stringify(await synthesizeKokoro({ jobs, work, voice,
      speed: values.speed === undefined ? 1 : Number(values.speed), signal: controller.signal })));
  } finally {
    process.off('SIGINT', cancel);
    process.off('SIGTERM', cancel);
  }
}

if (process.argv[1] && NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
