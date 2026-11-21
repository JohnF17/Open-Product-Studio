import * as NodeAssert from 'node:assert/strict';
import * as NodeChildProcess from 'node:child_process';
import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import * as NodeTest from 'node:test';
import { renderTutorial } from './engine.mjs';
import { compileProject } from './project.mjs';
import { presentationAss, presentationLayout, reelPhrases } from './presentation.mjs';

const sourceScene = { id: 'closeup', source: 'source', start: 0, end: 1,
  caption: 'Anchor', narration: 'Choose your frame.', focus: { x: 1, y: 0.5, zoom: 1 } };
const project = { schema: 'studio-tutorial/1', title: 'Social framing', scenes: [sourceScene] };
const portrait = { aspect: '9:16', style: 'social-reel', captions: 'center' };

NodeTest.test('presentation is optional and complete, with only documented enums', () => {
  NodeAssert.equal(presentationLayout(compileProject(project).presentation), null);
  for (const invalid of [null, {}, [], Object.create(portrait), { ...portrait, aspect: '1080x1920' },
    { aspect: '9:16', style: 'social-reel' }, { ...portrait, style: 'external' },
    { ...portrait, captions: false }, { ...portrait, filter: 'crop' }]) {
    NodeAssert.throws(() => compileProject({ ...project, presentation: invalid }), /presentation/);
  }
  for (const aspect of ['9:16', '1:1', '16:9']) for (const style of ['studio-lesson', 'social-reel']) {
    for (const captions of ['center', 'lower', 'off']) {
      const presentation = { aspect, style, captions };
      const plan = compileProject({ ...project, presentation });
      NodeAssert.deepEqual(plan.presentation, presentation);
      NodeAssert.equal(plan.frames, 30);
      const layout = presentationLayout(presentation);
      if (!layout) { NodeAssert.deepEqual(presentation, { aspect: '16:9', style: 'studio-lesson', captions: 'lower' }); continue; }
      const ass = presentationAss(plan.scenes[0], [{ start: 0, end: 23, text: sourceScene.narration }], layout);
      NodeAssert.equal(ass.includes('Anchor'), style === 'studio-lesson');
      NodeAssert.equal(ass.includes('Choose'), captions !== 'off');
    }
  }
});

NodeTest.test('social phrases retain each spoken word, active timing, and cue endpoints', () => {
  const cue = { start: 3, end: 40, text: 'Frame the subject. Keep the motion soft and steady.' };
  for (const end of [4, 11, 40]) {
    const phrases = reelPhrases({ ...cue, end });
    NodeAssert.equal(phrases[0].start, cue.start);
    NodeAssert.equal(phrases.at(-1).end, end);
    NodeAssert.equal(phrases.flatMap(phrase => phrase.words).join(' '), cue.text);
    for (const [i, phrase] of phrases.entries()) {
      NodeAssert.ok(phrase.end > phrase.start);
      if (i) NodeAssert.equal(phrase.start, phrases[i - 1].end);
      NodeAssert.equal(phrase.highlights[0].start, phrase.start);
      NodeAssert.equal(phrase.highlights.at(-1).end, phrase.end);
    }
  }
});

const ffmpeg = process.env.STUDIO_MEDIA_FFMPEG;
function ff(args) {
  return NodeChildProcess.execFileSync(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', ...args],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
}

NodeTest.test('FFmpeg renders the requested aspect, moving full-bleed crop, safe caption bands and uninterrupted audio', {
  skip: !ffmpeg && 'Set STUDIO_MEDIA_FFMPEG to exercise native media',
}, async t => {
  const dir = await NodeFSP.mkdtemp(NodePath.join(process.env.STUDIO_MEDIA_TEST_DIR || process.cwd(), 'studio-formats-'));
  t.after(() => NodeFSP.rm(dir, { recursive: true, force: true }));
  const source = NodePath.join(dir, 'color.mp4'), audio = NodePath.join(dir, 'speech.wav');
  ff(['-f', 'lavfi', '-i', 'color=red:s=320x180:r=30:d=1,drawbox=x=160:y=0:w=160:h=180:c=blue:t=fill,' +
    'drawbox=x=250:y=0:w=7:h=180:c=white:t=fill', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1:sample_rate=48000', audio]);
  const manifest = NodePath.join(dir, 'project.json'), assets = NodePath.join(dir, 'assets.json');
  await NodeFSP.writeFile(assets, JSON.stringify({ source }));
  for (const [aspect, captions, width, height] of [
    ['9:16', 'center', 1080, 1920], ['1:1', 'lower', 1080, 1080], ['16:9', 'off', 1920, 1080],
  ]) {
    await NodeFSP.writeFile(manifest, JSON.stringify({ ...project, presentation: { ...portrait, aspect, captions } }));
    const output = NodePath.join(dir, captions + '.mp4');
    const result = await renderTutorial({ project: manifest, assets, output, audio, ffmpeg });
    NodeAssert.equal(result.frames, 30);
    const log = NodeChildProcess.spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-i', output,
      '-map', '0:v', '-map', '0:a', '-f', 'null', '-'], { windowsHide: true, encoding: 'utf8' });
    NodeAssert.equal(log.status, 0);
    NodeAssert.match(log.stderr, new RegExp(width + 'x' + height + '.*30 fps'));
    NodeAssert.match(log.stderr, /Audio: aac .*48000 Hz/);
    NodeAssert.match(log.stderr, /frame=\s*30 [^\r\n]*Lsize=/);
    const w = width / 10, h = height / 10;
    const rgb = ff(['-ss', '0.4', '-i', output, '-frames:v', '1', '-vf', 'scale=' + w + ':' + h + ',format=rgb24',
      '-c:v', 'rawvideo', '-threads', '1', '-f', 'rawvideo', '-']);
    const accents = [];
    for (let i = 0; i < rgb.length; i += 3) {
      if (rgb[i] > 125 && rgb[i + 1] > 155 && rgb[i + 2] < rgb[i + 1] * 0.74) accents.push(Math.floor(i / 3 / w) / h);
    }
    if (captions === 'off') NodeAssert.equal(accents.length, 0);
    else {
      NodeAssert.ok(accents.length > 5, 'active speech is visibly highlighted');
      const y = captions === 'center' ? 0.5 : 0.76;
      NodeAssert.ok(accents.every(value => Math.abs(value - y) < 0.1));
    }
    if (aspect === '9:16') {
      NodeAssert.ok(rgb[2] > 180 && rgb.at(-1) > 180, 'right-hand blue source fills top and bottom corners');
      const row = ff(['-i', output, '-an', '-vf', 'scale=108:192,crop=108:2:0:2,format=rgb24',
        '-c:v', 'rawvideo', '-threads', '1', '-f', 'rawvideo', '-']);
      const marker = frame => Array.from({ length: 108 }, (_, x) => x).find(x => row[(frame * 216 + x) * 3] > 170);
      NodeAssert.ok(Number.isFinite(marker(0)) && marker(0) - marker(29) > 2, 'unzoomed reel has a visible push toward its subject');
    }
    NodeAssert.match(await NodeFSP.readFile(result.captions, 'utf8'), /00:00:00\.000 --> 00:00:01\.000\nChoose your frame\./);
  }
  await NodeFSP.writeFile(manifest, JSON.stringify({ ...project,
    presentation: { aspect: '9:16', style: 'studio-lesson', captions: 'off' } }));
  const lesson = await renderTutorial({ project: manifest, assets, output: NodePath.join(dir, 'lesson.mp4'), audio, ffmpeg });
  const frame = ff(['-i', lesson.output, '-frames:v', '1', '-vf', 'scale=108:192,format=rgb24',
    '-c:v', 'rawvideo', '-threads', '1', '-f', 'rawvideo', '-']);
  NodeAssert.ok(frame[0] < 50 && frame[1] < 50 && frame[2] < 50, 'portrait lesson preserves its letterboxed screen recording');
  NodeAssert.ok(frame.subarray(108 * 168 * 3).some(value => value > 100), 'authored lesson label remains visible');
  NodeAssert.match(await NodeFSP.readFile(lesson.captions, 'utf8'), /Choose your frame\./);
});
