import * as NodePath from 'node:path';
import { checkedFile } from './local.mjs';
import { FPS, SAMPLE_RATE } from './project.mjs';
import { pcmInput } from './audio.mjs';

const gains = { subtle: 0.35, balanced: 0.65, present: 1 };

export async function mixSoundtrack({ soundtrack, level = 'balanced', narration, work, frames, ff }) {
  if (!Object.hasOwn(gains, level)) throw new Error('Choose a subtle, balanced or present soundtrack level.');
  const bed = await checkedFile(soundtrack);
  const samples = frames * SAMPLE_RATE / FPS;
  const output = NodePath.join(work, 'mixed-narration.pcm');
  // Extend a short bed with silence and duck it against speech. Keep the narration's clock.
  const filter = [
    '[0:a]asplit=2[voice][key]',
    '[1:a]aformat=sample_rates=48000:channel_layouts=mono,loudnorm=I=-25:TP=-5:LRA=7,aresample=48000,volume=' +
      gains[level] + ',apad=whole_len=' + samples +
      ',atrim=end_sample=' + samples + '[bed]',
    '[bed][key]sidechaincompress=threshold=0.035:ratio=4:attack=15:release=180[ducked]',
    '[voice][ducked]amix=inputs=2:duration=first:normalize=0,atrim=end_sample=' + samples + '[result]',
  ].join(';');
  await ff(['-v','error',...pcmInput,'-i',narration,'-protocol_whitelist','file','-f','wav','-i',bed,
    '-filter_complex',filter,'-map','[result]','-ar',String(SAMPLE_RATE),'-ac','1','-c:a','pcm_s16le','-f','s16le',output]);
  return output;
}
