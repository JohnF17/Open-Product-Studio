#!/usr/bin/env node
import { renderTutorial, validateTutorial } from './engine.mjs';

const help = [
  'node tools/studio-media/cli.mjs validate --project plan.json --assets local-assets.json',
  'node tools/studio-media/cli.mjs render --project plan.json --assets local-assets.json --output new.mp4',
  '  (--audio full-timeline.wav | --voice "kokoro:af_heart" | --voice "Microsoft Zira Desktop")',
  '  [--soundtrack background.wav --soundtrack-level balanced] [--ffmpeg local-executable] [--preview new.jpg]',
].join('\n');

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === '--help' || command === '-h') { console.log(help); return; }
  const rendering = command === 'render';
  if (!rendering && command !== 'validate') throw new Error(help);
  const keys = rendering ? ['project', 'assets', 'output', 'audio', 'voice', 'soundtrack', 'soundtrack-level', 'ffmpeg', 'preview'] : ['project', 'assets'];
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || !keys.includes(key) || Object.hasOwn(options, key) ||
        !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid arguments\n' + help);
    options[key] = args[i + 1];
  }
  if (!options.project || !options.assets || rendering && !options.output) throw new Error(help);
  if (!rendering) {
    const plan = await validateTutorial(options);
    console.log(JSON.stringify({ title: plan.title, scenes: plan.scenes.length, frames: plan.frames, seconds: plan.frames / 30 }));
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    if (options['soundtrack-level'] && (!options.soundtrack || !['subtle','balanced','present'].includes(options['soundtrack-level'])))
      throw new Error('Choose --soundtrack PATH and a subtle, balanced or present soundtrack level.');
    const result = await renderTutorial({ ...options, soundtrackLevel: options['soundtrack-level'], signal: controller.signal, onProgress: msg => console.error(msg) });
    console.log(JSON.stringify(result));
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
