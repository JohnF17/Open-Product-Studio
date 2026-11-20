import * as NodeCrypto from 'node:crypto';
import * as NodeFSP from 'node:fs/promises';
import { inputFile, integer, outputFile, responseBytes, writeOutput } from './shared.mjs';

const model = 'eleven_flash_v2_5';
const format = 'mp3_44100_128';
const characterLimit = 1000;
const maximumKeyCap = 2000;

export async function speak(options, { fetchImpl = fetch, key = process.env.STUDIO_ELEVENLABS_API_KEY } = {}) {
  const script = await inputFile(options.input, ['.txt'], 8192);
  const target = await outputFile(options.output, '.mp3');
  const voiceId = options['voice-id'];
  if (typeof voiceId !== 'string' || !/^[A-Za-z0-9]{20}$/.test(voiceId)) throw new Error('Provide an ElevenLabs voice ID you have permission to use.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(await NodeFSP.readFile(script)).trim();
  const characters = text.length;
  if (!characters || characters > characterLimit) throw new Error(`The UTF-8 script must contain 1–${characterLimit} characters.`);
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', format);
  const body = JSON.stringify({ text, model_id: model });
  const requestSha256 = NodeCrypto.createHash('sha256').update(JSON.stringify([url.href, target, body])).digest('hex');
  if (options['approve-request'] === undefined) {
    return {
      provider: 'ElevenLabs', status: 'preview', destination: url.href, output: target, voiceId, model, characters,
      requestSha256, maximumKeyCap,
      approval: `--approve-request <provider-key-credit-cap>:${requestSha256}`,
      instructions: 'Use a dedicated text-to-speech key with a provider-enforced credit cap, set STUDIO_ELEVENLABS_API_KEY, and approve this exact script and voice. The script is sent to ElevenLabs and account credits may be charged. Voice rates may vary.',
    };
  }
  const approval = options['approve-request'].match(/^(\d+):([a-f0-9]{64})$/);
  if (!approval || approval[2] !== requestSha256) throw new Error('The request changed or the approval is malformed. Preview it again.');
  const approvedKeyCap = integer(approval[1], 'Approved provider key cap in credits', characters, maximumKeyCap);
  if (!key || !/^[A-Za-z0-9_-]{12,512}$/.test(key)) throw new Error('Set STUDIO_ELEVENLABS_API_KEY to a dedicated, credit-capped text-to-speech key.');

  return writeOutput(target, '.mp3', async staged => {
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45_000),
        headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' }, body,
      });
    } catch {
      throw new Error('ElevenLabs did not return a response. Check provider usage before trying again.');
    }
    if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'audio/mpeg') {
      await response.body?.cancel().catch(() => {});
      throw new Error(`ElevenLabs did not return MP3 audio (HTTP ${response.status}). Check the selected voice, key and quota.`);
    }
    try {
      const audio = await responseBytes(response, 8 * 1024 * 1024);
      if (audio.length < 4 || (audio.toString('ascii', 0, 3) !== 'ID3' && !(audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0))) {
        throw new Error('Invalid audio');
      }
      await NodeFSP.writeFile(staged, audio, { flag: 'wx' });
      const usage = response.headers.get('character-cost');
      const providerReportedCredits = usage && /^\d+$/.test(usage) && Number.isSafeInteger(Number(usage)) ? Number(usage) : null;
      return { provider: 'ElevenLabs', status: 'generated', voiceId, model, characters, approvedKeyCap, providerReportedCredits };
    } catch {
      throw new Error('The ElevenLabs result could not be saved. Check provider usage before trying again.');
    }
  });
}
