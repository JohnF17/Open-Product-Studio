#!/usr/bin/env node

import * as NodeFSP from 'node:fs/promises';
import * as NodeOS from 'node:os';
import * as NodePath from 'node:path';
import * as NodeUtil from 'node:util';
import { blenderBinaries, renderBlender } from './adapters/blender.mjs';
import { browserComposition, compositionRuntime } from './adapters/browser-compositions.mjs';
import { readClips } from './adapters/clips-kitty.mjs';
import { speak } from './adapters/elevenlabs.mjs';
import { searchOpenverse } from './adapters/openverse.mjs';
import { inputFile, runTool } from './adapters/shared.mjs';
import { transcribe, whisperBinaries } from './adapters/whisper.mjs';
import { download, ytdlpBinary, ytdlpStartup } from './adapters/yt-dlp.mjs';

const usage = `Usage: node tools/studio-media/vendors.mjs <command> [options]

  doctor [--model PATH.bin]
  whisper-cpp --input MEDIA --model PATH.bin --output PATH.srt [--language auto|en]
  yt-dlp --url PUBLIC_YOUTUBE_VIDEO --output PATH.mp4 [--approve-download]
  blender --output PATH.mp4
  hyperframes --design PATH.html | --output PATH.mp4
  remotion --design PATH.tsx | --output PATH.mp4
  clips-kitty --video-id ID [--approve-read]
  elevenlabs --input SCRIPT.txt --voice-id ID --output PATH.mp3 [--approve-request KEY_CREDIT_CAP:REQUEST_SHA256]
  openverse --query TEXT [--type image|audio] [--approve-network]

Executable overrides: STUDIO_FFMPEG_BIN, STUDIO_FFPROBE_BIN, STUDIO_WHISPER_BIN, STUDIO_YTDLP_BIN, STUDIO_BLENDER_BIN.
Browser renderers use STUDIO_CREATIVE_NODE_ROOT and STUDIO_CHROME_BIN (use Chrome Headless Shell with Remotion).
The ElevenLabs request uses a dedicated credit-capped key from STUDIO_ELEVENLABS_API_KEY.
Output files use an existing local folder and a new filename. Network commands preview by default.
`;

async function checkProvider(provider, probe) {
  try {
    return { provider, ...await probe() };
  } catch (error) {
    return { provider, status: 'unavailable', reason: error.message };
  }
}

async function doctor(options) {
  const cwd = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), 'studio-media-doctor-'));
  try {
    const local = await Promise.all([
      checkProvider('whisper.cpp', async () => {
        const { whisper, ffmpeg } = await whisperBinaries();
        const [help, ffmpegVersion] = await Promise.all([
          runTool(whisper, ['--help'], { cwd }), runTool(ffmpeg, ['-version'], { cwd }),
        ]);
        if (!help.includes('--output-srt') || !help.includes('--no-gpu')) throw new Error('The installed whisper-cli does not expose the required CPU and SRT flags.');
        if (!ffmpegVersion.startsWith('ffmpeg version')) throw new Error('The selected FFmpeg did not report a valid version.');
        if (!options.model) return { status: 'model-required', whisper, ffmpeg, ffmpegVersion: ffmpegVersion.split(/\r?\n/)[0] };
        const model = await inputFile(options.model, ['.bin'], 4 * 1024 * 1024 * 1024);
        return { status: 'prerequisites-found', whisper, ffmpeg, model, ffmpegVersion: ffmpegVersion.split(/\r?\n/)[0] };
      }),
      checkProvider('yt-dlp', async () => {
        const binary = await ytdlpBinary();
        const version = (await runTool(binary, [...ytdlpStartup, '--version'], { cwd })).trim();
        if (!/^\d{4}\.\d{2}\.\d{2}/.test(version)) throw new Error('The selected yt-dlp did not report a release version.');
        return { status: 'prerequisites-found', binary, version, scope: 'Authorized public YouTube MP4, subject to public format availability.' };
      }),
      checkProvider('Blender', async () => {
        const { blender, ffmpeg } = await blenderBinaries();
        const [version, ffmpegVersion] = await Promise.all([
          runTool(blender, ['--version'], { cwd }), runTool(ffmpeg, ['-version'], { cwd }),
        ]);
        const match = version.match(/^Blender (\d+)\.(\d+)/m);
        if (!match || Number(match[1]) < 4 || (match[1] === '4' && Number(match[2]) < 3)) throw new Error('The original scene requires Blender 4.3 or newer.');
        if (!ffmpegVersion.includes('--enable-libx264')) throw new Error('The selected FFmpeg build does not declare libx264 support.');
        return { status: 'prerequisites-found', blender, ffmpeg, version: match[0] };
      }),
      ...[['hyperframes', 'HyperFrames'], ['remotion', 'Remotion']].map(([name, label]) =>
        checkProvider(label, async () => ({ status: 'prerequisites-found', ...await compositionRuntime(name) }))),
    ]);
    return [...local,
      { provider: 'ElevenLabs', status: process.env.STUDIO_ELEVENLABS_API_KEY ? 'approval-required' : 'key-required', scope: 'Dedicated credit-capped TTS key. Preview is local.' },
      { provider: 'Openverse', status: 'approval-required', scope: 'Public search and rights metadata.' },
      { provider: 'Clips Kitty', status: 'local-engine-required', scope: 'Read-only clip timing proposals from an existing loopback API v1 engine.' },
    ];
  } finally {
    await NodeFSP.rm(cwd, { recursive: true, force: true, maxRetries: 4 });
  }
}

const string = { type: 'string' };
const boolean = { type: 'boolean' };
const commands = {
  doctor: { options: { model: string }, run: doctor },
  'whisper-cpp': { options: { input: string, model: string, output: string, language: string }, run: transcribe },
  'yt-dlp': { options: { url: string, output: string, 'approve-download': boolean }, run: download },
  blender: { options: { output: string }, run: renderBlender },
  hyperframes: { options: { design: string, output: string }, run: options => browserComposition('hyperframes', options) },
  remotion: { options: { design: string, output: string }, run: options => browserComposition('remotion', options) },
  'clips-kitty': { options: { 'video-id': string, 'approve-read': boolean }, run: readClips },
  elevenlabs: { options: { input: string, 'voice-id': string, output: string, 'approve-request': string }, run: speak },
  openverse: { options: { query: string, type: string, 'approve-network': boolean }, run: searchOpenverse },
};

async function main(argv) {
  const [name, ...args] = argv;
  if (!name || name === 'help' || name === '--help') {
    process.stdout.write(usage);
    return;
  }
  if (!Object.hasOwn(commands, name)) throw new Error(`Unknown media command: ${name}. Use --help.`);
  const command = commands[name];
  const { values, tokens } = NodeUtil.parseArgs({ args, options: { ...command.options, help: boolean }, tokens: true });
  if (values.help) {
    process.stdout.write(usage);
    return;
  }
  if (tokens.length !== Object.keys(values).length) throw new Error('Supply each option only once.');
  process.stdout.write(`${JSON.stringify(await command.run(values), null, 2)}\n`);
}

main(process.argv.slice(2)).catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
