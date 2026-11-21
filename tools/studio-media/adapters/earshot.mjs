import { open } from 'node:fs/promises';
import { executable, outputFile, runTool, writeOutput } from './shared.mjs';

// Leon Lin's MIT-licensed Earshot >= 0.4 uses the model-free SFX command.
// https://github.com/Leonxlnx/earshot/blob/main/LICENSE
export function earshotBinary(selection) {
  return executable('earshot', 'STUDIO_EARSHOT_BIN', selection);
}

export async function renderEarshotCue({ id, output }) {
  if (typeof id !== 'string' || id.length > 128 || !/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?$/.test(id)) {
    throw new Error('Supply a valid Earshot cue ID from earshot sfx list.');
  }
  const target = await outputFile(output, '.wav');
  const binary = await earshotBinary();
  const capBytes = 32 * 1024 * 1024;
  return writeOutput(target, '.wav', async (staged, cwd) => {
    await runTool(binary, ['sfx', 'render', id, '-o', staged], {
      cwd, timeout: 45_000, capFile: staged, capBytes, showFailure: true,
    });
    const wav = await open(staged);
    try {
      const { size } = await wav.stat();
      const header = Buffer.alloc(12);
      await wav.read(header);
      if (size <= 44 || size > capBytes || header.toString('ascii', 0, 4) !== 'RIFF' ||
          header.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error('Earshot did not produce a valid RIFF WAV cue within the size limit.');
      }
    } finally {
      await wav.close();
    }
    return { provider: 'Earshot', cueId: id };
  });
}
