import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import * as NodeURL from 'node:url';
import { isWindowsHost } from '../local.mjs';
import { executable, outputFile, runTool, writeOutput } from './shared.mjs';

const providers = {
  hyperframes: { label: 'HyperFrames', file: 'rail.html', extension: '.html', version: '0.9.72', package: 'hyperframes', cli: 'bin/hyperframes.mjs', composition: 'rail' },
  remotion: { label: 'Remotion', file: 'Sequence.tsx', extension: '.tsx', version: '4.0.545', package: '@remotion/cli', cli: 'remotion-cli.js', composition: 'StudioSequence' },
};

async function verifyPackage(modules, name, version) {
  const root = NodePath.join(modules, name);
  try {
    const manifest = JSON.parse(await NodeFSP.readFile(NodePath.join(root, 'package.json'), 'utf8'));
    if (manifest.name === name && manifest.version === version) return root;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  throw new Error(`Install ${name}@${version} in the approved STUDIO_CREATIVE_NODE_ROOT.`);
}

export async function compositionRuntime(name, { ffmpeg: approvedFfmpeg, ffprobe: approvedFfprobe } = {}) {
  if (!Object.hasOwn(providers, name)) throw new Error('Choose the bundled HyperFrames or Remotion design.');
  const config = providers[name];
  const configured = process.env.STUDIO_CREATIVE_NODE_ROOT;
  if (!configured || !NodePath.isAbsolute(configured) || /^[\\/]{2}/.test(configured)) {
    throw new Error(`Set STUDIO_CREATIVE_NODE_ROOT to the absolute path of a local ${config.package}@${config.version} installation.`);
  }
  const modules = await NodeFSP.realpath(NodePath.join(configured, 'node_modules'));
  const root = await verifyPackage(modules, config.package, config.version);
  const cli = await NodeFSP.realpath(NodePath.join(root, config.cli));
  if (!(await NodeFSP.stat(cli)).isFile()) throw new Error(`The ${config.label} CLI is missing.`);
  const chrome = await executable('chrome', 'STUDIO_CHROME_BIN');
  if (name === 'hyperframes') {
    const [ffmpeg, ffprobe] = await Promise.all([
      executable('ffmpeg', 'STUDIO_FFMPEG_BIN', approvedFfmpeg), executable('ffprobe', 'STUDIO_FFPROBE_BIN', approvedFfprobe),
    ]);
    return { cli, chrome, ffmpeg, ffprobe, version: config.version };
  }
  await Promise.all([
    verifyPackage(modules, 'remotion', config.version), verifyPackage(modules, 'react', '19.2.0'),
    verifyPackage(modules, 'react-dom', '19.2.0'),
  ]);
  return { cli, chrome, modules, version: config.version };
}

export async function browserComposition(name, options, { signal, ffmpeg, ffprobe } = {}) {
  signal?.throwIfAborted();
  if (!Object.hasOwn(providers, name)) throw new Error('Choose the bundled HyperFrames or Remotion design.');
  const config = providers[name];
  const source = NodeURL.fileURLToPath(new URL(config.file, import.meta.url));
  if (options.design) {
    if (options.output) throw new Error('Choose either --design or --output.');
    const target = await outputFile(options.design, config.extension);
    return writeOutput(target, config.extension, async staged => {
      await NodeFSP.copyFile(source, staged);
      return { provider: config.label, status: 'design-exported', composition: config.composition };
    }, { signal });
  }

  const target = await outputFile(options.output, '.mp4');
  const runtime = await compositionRuntime(name, { ffmpeg, ffprobe });
  return writeOutput(target, '.mp4', async (staged, directory) => {
    const project = NodePath.join(directory, 'project');
    await NodeFSP.mkdir(project);
    const entry = NodePath.join(project, name === 'hyperframes' ? 'index.html' : config.file);
    await NodeFSP.copyFile(source, entry);
    const localProfile = { HOME: directory, USERPROFILE: directory, APPDATA: directory, LOCALAPPDATA: directory, DO_NOT_TRACK: '1' };
    if (name === 'hyperframes') {
      const existingPath = (process.env.PATH ?? '').split(NodePath.delimiter).filter(path => NodePath.isAbsolute(path) && !/^[\\/]{2}/.test(path));
      const environment = { ...localProfile, HYPERFRAMES_NO_TELEMETRY: '1', HYPERFRAMES_BROWSER_PATH: runtime.chrome,
        PRODUCER_HEADLESS_SHELL_PATH: runtime.chrome, PUPPETEER_EXECUTABLE_PATH: runtime.chrome,
        HYPERFRAMES_FFMPEG_PATH: runtime.ffmpeg, HYPERFRAMES_FFPROBE_PATH: runtime.ffprobe,
        FFMPEG_PATH: runtime.ffmpeg, FFPROBE_PATH: runtime.ffprobe,
        PATH: [NodePath.dirname(runtime.ffmpeg), NodePath.dirname(runtime.ffprobe), ...existingPath].join(NodePath.delimiter) };
      await runTool(process.execPath, [runtime.cli, 'lint', project, '--json'], { cwd: project, environment, timeout: 30_000, showFailure: true, signal, killTree: true });
      await runTool(process.execPath, [runtime.cli, 'render', project, '--output', staged, '--fps', '30', '--workers', '1'],
        { cwd: project, environment, timeout: 240_000, showFailure: true, signal, killTree: true });
    } else {
      const dependencies = NodePath.join(project, 'node_modules');
      await NodeFSP.symlink(runtime.modules, dependencies, isWindowsHost ? 'junction' : 'dir');
      try {
        await runTool(process.execPath, [runtime.cli, 'render', entry, config.composition, staged,
          '--browser-executable', runtime.chrome, '--codec=h264', '--concurrency=1', '--log=error',
        ], { cwd: project, environment: localProfile, timeout: 240_000, showFailure: true, signal, killTree: true });
      } finally {
        await NodeFSP.unlink(dependencies);
      }
    }
    const { size } = await NodeFSP.stat(staged);
    if (size < 4096 || size > 20 * 1024 * 1024) throw new Error(`${config.label} produced an unexpected output size.`);
    return { provider: config.label, status: 'rendered', composition: config.composition, durationSeconds: 3, width: 960, height: 540, bytes: size };
  }, { signal });
}
