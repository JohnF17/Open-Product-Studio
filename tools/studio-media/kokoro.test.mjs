import * as NodeAssert from 'node:assert/strict';
import * as NodeFSP from 'node:fs/promises';
import * as NodeOS from 'node:os';
import * as NodePath from 'node:path';
import * as NodeTest from 'node:test';
import { synthesizeKokoro } from './kokoro.mjs';

async function fixture(t) {
  const work = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), 'studio-kokoro-test-'));
  t.after(() => NodeFSP.rm(work, { recursive: true, force: true }));
  return {
    work, voice: 'af_heart',
    jobs: [{ phrases: ['Give it a moment.', 'Now look at the result.'], wav: NodePath.join(work, 'line.wav'),
      timings: NodePath.join(work, 'line.json') }],
  };
}

NodeTest.test('Kokoro rejects invalid phrases, voice, destinations and collisions before running synthesis', async t => {
  const request = await fixture(t);
  const rejectRun = () => { throw new Error('Unexpected synthesis'); };
  await NodeAssert.rejects(synthesizeKokoro({ ...request, voice: '../unknown' }, { render: rejectRun }), /voice/);
  await NodeAssert.rejects(synthesizeKokoro({ ...request, jobs: [{ ...request.jobs[0], phrases: ['line\nline'] }] }, { render: rejectRun }), /phrase/);
  await NodeAssert.rejects(synthesizeKokoro({ ...request, jobs: [{ ...request.jobs[0], wav: NodePath.resolve(request.work, '..', 'outside.wav') }] }, { render: rejectRun }), /working directory/);
  await NodeFSP.writeFile(request.jobs[0].wav, 'existing');
  await NodeAssert.rejects(synthesizeKokoro(request, { render: rejectRun }), /already exists/);
  NodeAssert.equal(await NodeFSP.readFile(request.jobs[0].wav, 'utf8'), 'existing');
});

function fixtureWave() {
  const wave = Buffer.alloc(96_044);
  wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(24_000, 24); wave.writeUInt32LE(48_000, 28); wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40);
  wave.writeInt16LE(1200, 44);
  return wave;
}

NodeTest.test('a single Kokoro host call publishes measured PCM and bookmark files', async t => {
  const request = await fixture(t);
  let calls = 0;
  const render = async ({ directory, input }) => {
    calls++;
    NodeAssert.equal(input.voice, 'af_heart');
    NodeAssert.deepEqual(input.phrases, [request.jobs[0].phrases]);
    NodeAssert.equal(Object.hasOwn(input, 'output'), false);
    await NodeFSP.writeFile(NodePath.join(directory, 'line-0.wav'), fixtureWave());
    await NodeFSP.writeFile(NodePath.join(directory, 'line-0.json'), JSON.stringify([{ index: 0, seconds: 0 }, { index: 1, seconds: 1 }]));
  };
  const result = await synthesizeKokoro(request, { render });
  NodeAssert.equal(calls, 1);
  NodeAssert.equal(result.sampleRate, 24_000);
  NodeAssert.equal(result.lines[0].durationSeconds, 2);
  NodeAssert.deepEqual(JSON.parse(await NodeFSP.readFile(request.jobs[0].timings, 'utf8')), [{ index: 0, seconds: 0 }, { index: 1, seconds: 1 }]);
  NodeAssert.deepEqual((await NodeFSP.readdir(request.work)).sort(), ['line.json', 'line.wav']);
});

NodeTest.test('malformed neural output fails without publishing partial files', async t => {
  const request = await fixture(t);
  await NodeAssert.rejects(synthesizeKokoro(request, { render: async ({ directory }) => {
    await NodeFSP.writeFile(NodePath.join(directory, 'line-0.wav'), fixtureWave());
    await NodeFSP.writeFile(NodePath.join(directory, 'line-0.json'), JSON.stringify([{ index: 0, seconds: 0 }, { index: 1, seconds: 9 }]));
  } }), /timings/);
  NodeAssert.deepEqual(await NodeFSP.readdir(request.work), []);
});
