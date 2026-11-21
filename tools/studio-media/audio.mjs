import * as NodeFS from 'node:fs';
import * as NodeFSP from 'node:fs/promises';
import * as NodeStreamPromises from 'node:stream/promises';
import * as NodePath from 'node:path';
import * as NodeURL from 'node:url';
import { isWindowsHost, checkedFile, readJson, run } from './local.mjs';
import { FPS, SAMPLE_RATE, subtitleCues } from './project.mjs';

const pcmOutput = ['-ar', String(SAMPLE_RATE), '-ac', '1', '-c:a', 'pcm_s16le', '-f', 's16le'];
export const pcmInput = ['-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1'];
const samplesPerFrame = SAMPLE_RATE / FPS;

async function decodeWave(wav, raw, maxSeconds, ff) {
  await ff(['-v', 'error', '-protocol_whitelist', 'file', '-f', 'wav', '-i', wav, '-map', '0:a:0',
    '-t', String(maxSeconds), ...pcmOutput, raw]);
  return (await NodeFSP.stat(raw)).size / 2;
}

async function speak(plan, work, voice, signal) {
  if (typeof voice !== 'string' || !voice.trim() || voice.length > 160 || /[\x00-\x1f]/.test(voice))
    throw new Error('Choose an installed voice by its exact name');
  const jobs = plan.scenes.map((scene, i) => ({
    phrases: subtitleCues(scene).map(cue => cue.text),
    wav: NodePath.join(work, 'speech-' + i + '.wav'), timings: NodePath.join(work, 'timings-' + i + '.json'),
  }));
  if (voice.startsWith('kokoro:')) {
    const { synthesizeKokoro } = await import('./kokoro.mjs');
    await synthesizeKokoro({ jobs, work, voice: voice.slice('kokoro:'.length), signal });
    return jobs;
  }
  if (!isWindowsHost) throw new Error('Choose an installed Kokoro voice or attach a recorded narration WAV on this platform.');
  const request = NodePath.join(work, 'speech.json');
  await NodeFSP.writeFile(request, JSON.stringify({ voice, scenes: jobs }));
  const powershell = NodePath.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  await run(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File',
    NodeURL.fileURLToPath(new URL('./speak.ps1', import.meta.url)), '-RequestFile', request],
  { cwd: work, signal, timeout: 300000 });
  return jobs;
}

export async function prepareNarration({ plan, audio, voice, work, ff, signal }) {
  if (Boolean(audio) === Boolean(voice)) throw new Error('Choose exactly one narration WAV or installed voice');
  const file = NodePath.join(work, 'narration.pcm');
  if (audio) {
    const wav = await checkedFile(audio);
    const samples = await decodeWave(wav, file, plan.frames / FPS + 1, ff);
    if (!samples || Math.abs(samples - plan.frames * samplesPerFrame) > samplesPerFrame)
      throw new Error('Narration WAV must match the full ' + (plan.frames / FPS).toFixed(3) + ' second timeline within one frame');
    return { file, timeline: plan.scenes.map(scene => ({ scene, cues: subtitleCues(scene) })) };
  }
  const jobs = await speak(plan, work, voice, signal);
  const timeline = [];
  for (const [i, scene] of plan.scenes.entries()) {
    const source = NodePath.join(work, 'voice-' + i + '.pcm');
    const samples = await decodeWave(jobs[i].wav, source, 360, ff);
    const desired = scene.frames * samplesPerFrame;
    const speed = Math.max(1, samples / desired);
    if (!samples || speed > 1.4)
      throw new Error('Scene ' + scene.id + ' needs more time for the selected voice (' +
        (samples / SAMPLE_RATE).toFixed(2) + 's narration in a ' + (scene.frames / FPS).toFixed(2) + 's scene). Extend its cut or hold.');
    const processed = NodePath.join(work, 'fitted-' + i + '.pcm');
    const filter = 'atempo=' + speed + ',apad=whole_len=' + desired + ',atrim=end_sample=' + desired;
    await ff(['-v', 'error', ...pcmInput, '-i', source, '-af', filter, ...pcmOutput, processed]);
    await NodeStreamPromises.pipeline(NodeFS.createReadStream(processed), NodeFS.createWriteStream(file, { flags: 'a' }), { signal });
    const speechFrames = Math.max(1, Math.min(scene.frames, Math.round(samples / samplesPerFrame / speed)));
    const cues = subtitleCues(scene, speechFrames);
    const bookmarks = await readJson(jobs[i].timings);
    if (!Array.isArray(bookmarks) || bookmarks.length !== cues.length)
      throw new Error('Offline voice did not return phrase timing for ' + scene.id);
    for (const [index, mark] of bookmarks.entries()) {
      if (mark.index !== index || !Number.isFinite(mark.seconds) || mark.seconds < 0)
        throw new Error('Invalid voice bookmark in ' + scene.id);
      cues[index].start = Math.round(mark.seconds * FPS / speed);
      if (index) cues[index - 1].end = cues[index].start;
    }
    if (cues.some(cue => cue.start >= cue.end)) throw new Error('Indistinct speech bookmarks in ' + scene.id);
    timeline.push({ scene, cues });
  }
  return { file, timeline };
}
