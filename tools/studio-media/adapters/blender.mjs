import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import * as NodeURL from 'node:url';
import { executable, outputFile, runTool, writeOutput } from './shared.mjs';

const source = NodeURL.fileURLToPath(new URL('./orbit.py', import.meta.url));

export async function blenderBinaries(approvedFfmpeg) {
  const [blender, ffmpeg] = await Promise.all([
    executable('blender', 'STUDIO_BLENDER_BIN'),
    executable('ffmpeg', 'STUDIO_FFMPEG_BIN', approvedFfmpeg),
  ]);
  return { blender, ffmpeg };
}

export async function renderBlender(options, { signal, ffmpeg: approvedFfmpeg } = {}) {
  signal?.throwIfAborted();
  const target = await outputFile(options.output, '.mp4');
  const { blender, ffmpeg } = await blenderBinaries(approvedFfmpeg);
  return writeOutput(target, '.mp4', async (staged, directory) => {
    const framePrefix = NodePath.join(directory, 'orbit-');
    const environment = { HOME: directory, USERPROFILE: directory, APPDATA: directory, LOCALAPPDATA: directory,
      BLENDER_USER_RESOURCES: directory, BLENDER_USER_CONFIG: directory };
    await runTool(blender, [
      '--background', '--factory-startup', '--disable-autoexec', '--offline-mode', '--python-exit-code', '1',
      '--python', source, '--', framePrefix,
    ], { cwd: directory, environment, timeout: 360_000, showFailure: true, signal, killTree: true });
    const frames = (await NodeFSP.readdir(directory)).filter(file => /^orbit-\d{4}\.png$/.test(file)).sort();
    if (frames.length !== 72 || frames.some((file, index) => file !== `orbit-${String(index + 1).padStart(4, '0')}.png`)) {
      throw new Error('Blender did not produce all 72 frames.');
    }
    await runTool(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-framerate', '24', '-start_number', '1',
      '-i', `${framePrefix.replaceAll('%', '%%')}%04d.png`, '-frames:v', '72', '-c:v', 'libx264', '-threads', '4',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', staged,
    ], { cwd: directory, timeout: 60_000, signal });
    const { size } = await NodeFSP.stat(staged);
    if (size < 4096) throw new Error('The Blender sequence did not produce usable video.');
    return { provider: 'Blender', status: 'rendered', scene: 'orbit', width: 640, height: 360, durationSeconds: 3, bytes: size };
  }, { signal });
}
