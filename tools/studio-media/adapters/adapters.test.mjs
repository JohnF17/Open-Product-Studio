import * as NodeAssert from 'node:assert/strict';
import * as NodeFSP from 'node:fs/promises';
import * as NodeOS from 'node:os';
import * as NodePath from 'node:path';
import * as NodeTest from 'node:test';
import { isWindowsHost } from '../local.mjs';
import { canonicalYouTubeUrl } from './yt-dlp.mjs';
import { readClips } from './clips-kitty.mjs';
import { speak } from './elevenlabs.mjs';
import { searchOpenverse } from './openverse.mjs';
import * as Whisper from './whisper.mjs';
import { runTool } from './shared.mjs';

NodeTest.test('acquisition canonicalizes a single YouTube video and rejects arbitrary URLs', () => {
  NodeAssert.equal(canonicalYouTubeUrl('https://youtu.be/abcdefghijk?t=12'), 'https://www.youtube.com/watch?v=abcdefghijk');
  NodeAssert.equal(canonicalYouTubeUrl('https://www.youtube.com/watch?v=abcdefghijk&list=PL123'), 'https://www.youtube.com/watch?v=abcdefghijk');
  for (const url of [
    'http://youtu.be/abcdefghijk', 'https://youtu.be:8443/abcdefghijk',
    'https://youtube.com.evil.example/watch?v=abcdefghijk', 'https://www.youtube.com/playlist?list=abcdefghijk',
    'https://x@youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk&v=abcdefghijl',
  ]) {
    NodeAssert.throws(() => canonicalYouTubeUrl(url), /single public YouTube video/);
  }
});

NodeTest.test('caption validation accepts real timings and rejects malformed or out-of-range captions', () => {
  NodeAssert.equal(Whisper.validateSrt('1\r\n00:00:00,000 --> 00:00:01,000\r\nHello.\r\n', 2), 1);
  for (const contents of ['', '1\n00:01:00,000 --> 00:01:02,000\nLate.', '1\n00:00:02,000 --> 00:00:01,000\nBackwards.']) {
    NodeAssert.throws(() => Whisper.validateSrt(contents, 2), /captions|timestamps/);
  }
});

NodeTest.test('a Whisper cue extending into the final audio window stops at the measured recording end', () => {
  const early = '1\n00:00:00,000 --> 00:00:01,100\nLook at the screen.';
  const delayed = '2\n00:00:01,100 --> 00:00:07,000\nThis is the vertical cut.';
  NodeAssert.deepEqual(Whisper.normalizeSrt(`${early}\n\n${delayed}\n`, 3.8186875), {
    captions: 2,
    text: `${early}\n\n2\n00:00:01,100 --> 00:00:03,818\nThis is the vertical cut.\n`,
  });
  NodeAssert.throws(() => Whisper.normalizeSrt('1\n00:00:04,000 --> 00:00:07,000\nBeyond the recording.', 3.8186875), /timestamps/);
  NodeAssert.throws(() => Whisper.normalizeSrt('1\n00:00:01,100 --> 00:00:40,000\nOut of range.', 3.8186875), /timestamps/);
  NodeAssert.throws(() => Whisper.normalizeSrt(`${delayed.replace(/^2/, '1')}\n\n${delayed}\n`, 3.8186875), /timestamps/);
});

NodeTest.test('cancelling a local tool ends the child and returns the cancellation reason', async () => {
  const controller = new AbortController();
  const reason = new Error('Cancel draft captions');
  const child = runTool(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    signal: controller.signal, timeout: 2000,
  });
  controller.abort(reason);
  await NodeAssert.rejects(child, error => error === reason);
});

NodeTest.test('cancelling a browser-style job terminates Windows descendants', { skip: !isWindowsHost }, async (t) => {
  const folder = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), 'studio-tree-test-'));
  t.after(() => NodeFSP.rm(folder, { recursive: true }));
  const marker = 'child-started';
  const started = NodePath.join(folder, marker);
  const leaf = `
    const { renameSync, writeFileSync } = require('node:fs');
    const marker = process.argv[1];
    writeFileSync(marker + '.tmp', String(process.pid));
    renameSync(marker + '.tmp', marker);
    setInterval(() => {}, 1000);
  `;
  const leader = `
    require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(leaf)}, ...process.argv.slice(1)], { stdio: 'ignore' });
    setInterval(() => {}, 1000);
  `;
  const created = (async () => {
    for await (const change of NodeFSP.watch(folder, { signal: AbortSignal.timeout(6000) })) {
      if (change.filename === marker) return Number(await NodeFSP.readFile(started, 'utf8'));
    }
    throw new Error('The fixture descendant did not start.');
  })();
  const controller = new AbortController();
  const job = runTool(process.execPath, ['-e', leader, started], { signal: controller.signal, killTree: true, timeout: 6500 });
  const stopped = NodeAssert.rejects(job, /cancel renderer/);
  let childPid;
  try {
    childPid = await created;
  } finally {
    controller.abort(new Error('cancel renderer'));
    await stopped;
  }
  NodeAssert.ok(Number.isSafeInteger(childPid) && childPid > 0);
  NodeAssert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
});

NodeTest.test('ElevenLabs requires separate approval and sends one bounded request to the fixed API', async (t) => {
  const folder = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), 'studio-adapter-test-'));
  t.after(() => NodeFSP.rm(folder, { recursive: true }));
  const input = NodePath.join(folder, 'script.txt');
  const output = NodePath.join(folder, 'narration.mp3');
  await NodeFSP.writeFile(input, 'Hello from Studio.');
  const options = { input, output, 'voice-id': 'abcdefghijklmnopqrst' };
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push({ url, request });
    return new Response(Buffer.from([0x49, 0x44, 0x33, 1]), { headers: { 'content-type': 'audio/mpeg', 'character-cost': '9' } });
  };
  const fixture = { fetchImpl, key: 'private-test-key' };
  const preview = await speak(options, fixture);
  NodeAssert.equal(preview.status, 'preview');
  NodeAssert.equal(preview.characters, 18);
  NodeAssert.equal(calls.length, 0);
  await NodeAssert.rejects(speak({ ...options, 'approve-request': `1:${preview.requestSha256}` }, fixture), /key cap/);
  await NodeAssert.rejects(speak({ ...options, 'approve-request': `100:${'0'.repeat(64)}` }, fixture), /request changed/);
  NodeAssert.equal(calls.length, 0);
  const approved = { ...options, 'approve-request': `100:${preview.requestSha256}` };
  const result = await speak(approved, fixture);
  NodeAssert.equal(result.providerReportedCredits, 9);
  NodeAssert.equal(calls.length, 1);
  NodeAssert.equal(calls[0].url.href, 'https://api.elevenlabs.io/v1/text-to-speech/abcdefghijklmnopqrst?output_format=mp3_44100_128');
  NodeAssert.equal(calls[0].request.redirect, 'error');
  NodeAssert.equal(calls[0].request.headers['xi-api-key'], 'private-test-key');
  NodeAssert.deepEqual(JSON.parse(calls[0].request.body), { text: 'Hello from Studio.', model_id: 'eleven_flash_v2_5' });
  NodeAssert.deepEqual(await NodeFSP.readFile(output), Buffer.from([0x49, 0x44, 0x33, 1]));
  await NodeAssert.rejects(speak(approved, fixture), /already exists/);
  NodeAssert.equal(calls.length, 1);
});

NodeTest.test('Openverse returns license and origin metadata and never fetches an asset', async () => {
  const calls = [];
  const fixture = { fetchImpl: async (url, request) => {
    calls.push({ url, request });
    return Response.json({ results: [
      { id: '1', title: 'Fixture', creator: 'Studio', license: 'cc0', license_version: '1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', foreign_landing_url: 'https://example.org/art', url: 'https://example.org/image.jpg', attribution: 'Fixture by Studio' },
      { id: '2', title: 'Invalid source', license: 'by', foreign_landing_url: 'file:///secret' },
    ] });
  } };
  const result = await searchOpenverse({ query: 'paper planes', type: 'image', 'approve-network': true }, fixture);
  NodeAssert.equal(calls.length, 1);
  NodeAssert.equal(calls[0].url.href, 'https://api.openverse.org/v1/images/?q=paper+planes&page_size=8&license=cc0%2Cpdm%2Cby');
  NodeAssert.equal(calls[0].request.redirect, 'error');
  NodeAssert.equal(result.candidates.length, 1);
  NodeAssert.equal(result.candidates[0].sourceUrl, 'https://example.org/art');
  NodeAssert.equal(result.candidates[0].license, 'cc0');
  NodeAssert.equal(result.candidates[0].rightsStatus, 'review-required');
});

NodeTest.test('Clips Kitty only reads the selected video and discards returned paths and other IDs', async () => {
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push(url.href);
    NodeAssert.equal(request.redirect, 'error');
    return url.pathname === '/health' ? Response.json({ ok: true, app_version: '1.1.4', api_version: 1 }) :
      Response.json([
        { id: 10, video_id: 'local_fixture', path: '/private/clip.mp4', start_s: 3, end_s: 7, title: 'A moment' },
        { id: 11, video_id: 'local_other', start_s: 3, end_s: 7, title: 'Another moment' },
      ]);
  };
  const { proposals } = await readClips({ 'video-id': 'local_fixture', 'approve-read': true }, { fetchImpl });
  NodeAssert.deepEqual(calls, ['http://127.0.0.1:8765/health', 'http://127.0.0.1:8765/videos/local_fixture/clips']);
  NodeAssert.deepEqual(proposals, [{ clipId: 10, title: 'A moment', startSeconds: 3, endSeconds: 7, status: 'review-required' }]);
});
