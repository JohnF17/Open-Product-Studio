import * as NodeAssert from 'node:assert/strict';
import * as NodeTest from 'node:test';
import { compileProject, subtitleCues } from './project.mjs';

const scene = { id: 'intro', source: 'demo', start: 0.5, end: 2.52, hold: 0.2,
  narration: 'Choose a recording. Open the editor.', caption: 'Choose a recording' };
const project = { schema: 'studio-tutorial/1', title: 'Local tutorial', scenes: [scene] };

NodeTest.test('timeline rounds each boundary and hold to a frame and accumulates integer offsets', () => {
  const plan = compileProject({ ...project, scenes: [scene, { ...scene, id: 'next' }] });
  NodeAssert.equal(plan.frames, 134);
  NodeAssert.deepEqual(plan.scenes.map(({ startFrame, cutFrames, frames, offset }) =>
    [startFrame, cutFrames, frames, offset]), [[15, 61, 67, 0], [15, 61, 67, 67]]);
  const cues = subtitleCues(plan.scenes[0], 50);
  NodeAssert.equal(cues[0].start, 0);
  NodeAssert.equal(cues.at(-1).end, 50);
});

NodeTest.test('strict data boundary rejects unknown fields, ids, markup, duplicate ids and invalid cuts', () => {
  for (const change of [{ source: '../a' }, { source: 'constructor' }, { filter: 'drawtext=...' },
    { hold: -1 }, { end: 0.5 }, { end: 181 }, { focus: { x: 0, y: 1, zoom: 4 } },
    { focus: { x: 0, y: 1, zoom: 2, url: 'file' } }, { caption: '{\\pos(0,0)}' }]) {
    NodeAssert.throws(() => compileProject({ ...project, scenes: [{ ...scene, ...change }] }));
  }
  NodeAssert.throws(() => compileProject({ ...project, scenes: [scene, scene] }));
  NodeAssert.throws(() => compileProject({ ...project, assets: {} }));
});
