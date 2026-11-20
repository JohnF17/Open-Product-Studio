import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import { executable, inputFile, outputFile, runTool, writeOutput } from './shared.mjs';

const maxSeconds = 600;
const sampleRate = 16_000;
const maxFinalPaddingMs = 30_000;
const demuxers = new Map([
  ['.wav', 'wav'], ['.mp4', 'mov'], ['.mov', 'mov'], ['.m4a', 'mov'], ['.mkv', 'matroska'], ['.webm', 'matroska'],
  ['.flac', 'flac'], ['.mp3', 'mp3'], ['.ogg', 'ogg'], ['.opus', 'ogg'], ['.aac', 'aac'],
]);

function pcmDuration(wav) {
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Could not decode a PCM audio track.');
  }
  for (let offset = 12; offset + 8 <= wav.length;) {
    const size = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > wav.length) break;
    if (wav.toString('ascii', offset, offset + 4) === 'data') {
      const seconds = size / (sampleRate * 2);
      if (seconds > maxSeconds) throw new Error(`Choose media with at most ${maxSeconds} seconds of audio.`);
      for (let position = start; position + 1 < start + size; position += 2) {
        if (Math.abs(wav.readInt16LE(position)) >= 32) return seconds;
      }
      throw new Error('The selected audio track is empty or silent.');
    }
    offset = start + size + (size % 2);
  }
  throw new Error('Could not read the decoded PCM audio track.');
}

function timestampMs(value) {
  const [hours, minutes, seconds, milliseconds] = value.split(/[:,]/).map(Number);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

function srtTimestamp(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const pair = (value) => String(value).padStart(2, '0');
  return `${pair(Math.floor(seconds / 3600))}:${pair(Math.floor(seconds / 60) % 60)}:${pair(seconds % 60)},${String(milliseconds % 1000).padStart(3, '0')}`;
}

export function normalizeSrt(contents, duration) {
  const endOfAudio = Math.floor(duration * 1000);
  if (!Number.isSafeInteger(endOfAudio) || endOfAudio < 1) throw new Error('Could not read the recording duration.');
  const blocks = contents.trim().split(/\r?\n[ \t]*\r?\n/);
  let previousStart = 0;
  const normalized = blocks.map((block, index) => {
    const [counter, timing, ...lines] = block.split(/\r?\n/);
    const match = timing?.match(/^(\d{2}:[0-5]\d:[0-5]\d,\d{3}) --> (\d{2}:[0-5]\d:[0-5]\d,\d{3})$/);
    if (counter !== String(index + 1) || !match || !lines.join('').trim()) throw new Error('Whisper did not produce usable SRT captions.');
    const start = timestampMs(match[1]);
    const end = timestampMs(match[2]);
    // Whisper can end its last cue inside a padded inference window.
    const paddedEnd = index === blocks.length - 1 && end <= endOfAudio + maxFinalPaddingMs;
    if (start < previousStart || start >= end || start >= endOfAudio || (end > endOfAudio && !paddedEnd)) {
      throw new Error('Whisper produced invalid caption timestamps.');
    }
    previousStart = start;
    const boundedTiming = end > endOfAudio ? `${match[1]} --> ${srtTimestamp(endOfAudio)}` : timing;
    return [counter, boundedTiming, ...lines].join('\n');
  });
  return { text: normalized.join('\n\n') + '\n', captions: normalized.length };
}

export function validateSrt(contents, duration) {
  return normalizeSrt(contents, duration).captions;
}

export async function whisperBinaries(approvedFfmpeg) {
  const [whisper, ffmpeg] = await Promise.all([
    executable('whisper-cli', 'STUDIO_WHISPER_BIN'),
    executable('ffmpeg', 'STUDIO_FFMPEG_BIN', approvedFfmpeg),
  ]);
  return { whisper, ffmpeg };
}

export async function transcribe(options, { ffmpeg: approvedFfmpeg, signal } = {}) {
  signal?.throwIfAborted();
  const input = await inputFile(options.input, [...demuxers.keys()], 512 * 1024 * 1024);
  const model = await inputFile(options.model, ['.bin'], 4 * 1024 * 1024 * 1024);
  const target = await outputFile(options.output, '.srt');
  const language = options.language ?? 'auto';
  if (!/^(auto|[a-z]{2,3})$/.test(language)) throw new Error('Use auto or a two- or three-letter Whisper language code.');
  const { whisper, ffmpeg } = await whisperBinaries(approvedFfmpeg);
  const demuxer = demuxers.get(NodePath.extname(input).toLowerCase());
  const rejectExternalReferences = demuxer === 'mov' ? ['-enable_drefs', '0', '-use_absolute_path', '0'] : [];
  return writeOutput(target, '.srt', async (staged, directory) => {
    const wave = NodePath.join(directory, 'input.wav');
    try {
      await runTool(ffmpeg, [
        '-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file', '-f', demuxer,
        '-probesize', '5000000', '-analyzeduration', '5000000', '-max_pixels', '16777216',
        ...rejectExternalReferences, '-vn', '-sn', '-dn', '-i', input, '-map', '0:a:0', '-t', String(maxSeconds + 1),
        '-ac', '1', '-ar', String(sampleRate), '-c:a', 'pcm_s16le', wave,
      ], { cwd: directory, timeout: 90_000, signal });
    } catch (error) {
      signal?.throwIfAborted();
      throw new Error(`FFmpeg could not decode the first audio track. ${error.message}`, { cause: error });
    }
    const duration = pcmDuration(await NodeFSP.readFile(wave));
    await runTool(whisper, [
      '-m', model, '-f', wave, '-l', language, '-ng', '-t', '4', '-osrt', '-of', staged.slice(0, -4),
    ], { cwd: directory, timeout: 900_000, signal });
    const { text, captions } = normalizeSrt(await NodeFSP.readFile(staged, 'utf8'), duration);
    signal?.throwIfAborted();
    await NodeFSP.writeFile(staged, text, { signal });
    return { provider: 'whisper.cpp', status: 'draft-captions', captions, durationSeconds: duration, language };
  }, { signal });
}
