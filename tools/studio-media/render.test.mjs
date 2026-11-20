import * as NodeAssert from 'node:assert/strict';
import * as NodeChildProcess from 'node:child_process';
import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import * as NodeTest from 'node:test';
import { renderTutorial, validateTutorial } from './engine.mjs';
import { isWindowsHost, localPath, run } from './local.mjs';
import { prepareNarration } from './audio.mjs';
import { compileProject } from './project.mjs';

const ffmpeg = process.env.STUDIO_MEDIA_FFMPEG;
const tempRoot = process.env.STUDIO_MEDIA_TEST_DIR || process.cwd();
const render = (bin, args) => NodeChildProcess.execFileSync(bin, ['-nostdin', '-hide_banner', '-loglevel', 'error', ...args],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

NodeTest.test('local path inputs reject URLs, devices and shares', () => {
  for (const bad of ['https://example.test/a.mp4', '//server/video', '\\\\server\\media',
    'file:///tmp/test.webm', 'pipe:0', '\0video']) NodeAssert.throws(() => localPath(bad));
});

NodeTest.test('render a real focused two-cut MP4, held frame, spoken track, timed text and extracted JPEG',
  { skip: !ffmpeg && 'Set STUDIO_MEDIA_FFMPEG to a local FFmpeg executable to run media integration' },
  async t => {
    const dir = await NodeFSP.mkdtemp(NodePath.join(tempRoot, 'studio-render-test-'));
    t.after(() => NodeFSP.rm(dir, { recursive: true, force: true }));
    const source = NodePath.join(dir, 'owned clips.mp4');
    render(ffmpeg, ['-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=30:d=2,' +
      'drawbox=x=160:y=0:w=160:h=180:c=blue:t=fill,' +
      "drawbox=x=0:y=0:w=320:h=180:c=green:t=fill:enable='gte(t,1.2)'",
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
    const audio = NodePath.join(dir, 'narration.wav');
    render(ffmpeg, ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2:sample_rate=48000', audio]);
    const scene = { id: 'wide', source: 'recording', start: 0, end: 1, hold: 0.4,
      focus: { x: 0.82, y: 0.5, zoom: 2 }, caption: 'Choose a recording', narration: 'Use the <review> control.' };
    const script = { schema: 'studio-tutorial/1', title: 'Local test',
      scenes: [scene, { id: 'cut', source: 'recording', start: 0.9, end: 1.5, caption: 'Second scene', narration: 'Watch it change.' }] };
    const project = NodePath.join(dir, 'project.json'), assets = NodePath.join(dir, 'assets.json');
    const output = NodePath.join(dir, 'film.mp4');
    await NodeFSP.writeFile(project, JSON.stringify(script));
    await NodeFSP.writeFile(assets, JSON.stringify({ other: 'owned clips.mp4' }));
    await NodeAssert.rejects(validateTutorial({ project, assets }), /Missing local asset/);
    await NodeFSP.writeFile(assets, JSON.stringify({ recording: 'owned clips.mp4' }));
    const args = { project, assets, output, audio, ffmpeg };
    const result = await renderTutorial(args);
    NodeAssert.equal(result.frames, 60);
    const pcm = render(ffmpeg, ['-i', output, '-map', '0:a', '-ac', '1', '-ar', '48000', '-f', 's16le', '-']);
    NodeAssert.ok(pcm.length >= 96000 * 2 && pcm.length <= (96000 + 1024) * 2);
    const { err } = await run(ffmpeg, ['-hide_banner', '-nostats', '-i', output, '-map', '0:a', '-af',
      'ebur128=peak=true', '-f', 'null', '-']);
    const loudness = Number([...err.matchAll(/I:\s*([-\d.]+) LUFS/g)].at(-1)?.[1]);
    NodeAssert.ok(loudness > -17 && loudness < -15, 'decoded narration measures around -16 LUFS');
    const pixels = render(ffmpeg, ['-i', output, '-an', '-vf', 'crop=2:2:600:452,scale=1:1,format=rgb24',
      '-c:v', 'rawvideo', '-threads', '1', '-f', 'rawvideo', '-']);
    NodeAssert.equal(pixels.length, 60 * 3);
    const pixel = i => [...pixels.subarray(i * 3, i * 3 + 3)];
    NodeAssert.ok(pixel(0)[0] > 190, 'wide red area is visible');
    NodeAssert.ok(pixel(25)[2] > 190, 'camera moved to the blue region');
    NodeAssert.deepEqual(pixel(41), pixel(29), 'held source frame stays blue past the moving-to-green boundary');
    NodeAssert.ok(pixel(42)[0] > 190, 'second scene starts at the requested earlier moment');
    NodeAssert.ok(pixel(52)[1] > 85 && pixel(52)[0] < 60, 'second scene cuts across the green transition');
    const footer = render(ffmpeg, ['-i', output, '-frames:v', '1', '-vf',
      'crop=1800:120:60:948,scale=900:60,format=gray', '-c:v', 'rawvideo', '-threads', '1', '-f', 'rawvideo', '-']);
    NodeAssert.ok(footer.filter(value => value > 160).length > 200, 'lower third and subtitles are burned into pixels');
    const vtt = await NodeFSP.readFile(result.captions, 'utf8');
    NodeAssert.match(vtt, /00:00:00\.000 --> 00:00:01\.400\nUse the &lt;review&gt; control\./);
    NodeAssert.match(vtt, /00:00:01\.400 --> 00:00:02\.000\nWatch it change\./);
    NodeAssert.deepEqual([...((await NodeFSP.readFile(result.preview)).subarray(0, 3))], [255, 216, 255]);
    await NodeAssert.rejects(renderTutorial(args), /already exists/);
    await NodeFSP.writeFile(project, JSON.stringify({ ...script, scenes: [{ ...scene, start: 1.5, end: 3.1 }] }));
    const failed = NodePath.join(dir, 'invalid.mp4');
    await NodeAssert.rejects(renderTutorial({ ...args, output: failed }), /source frames but decoded/);
    NodeAssert.ok(!(await NodeFSP.readdir(dir)).some(name => name.startsWith('invalid.') || name.startsWith('.studio-media-')));
  });

NodeTest.test('native offline narration preserves every phrase on the WAV clock and fits the authored scene',
  { skip: !(isWindowsHost && ffmpeg && process.env.STUDIO_MEDIA_VOICE) && 'Set FFmpeg and STUDIO_MEDIA_VOICE on Windows' },
  async t => {
    const work = await NodeFSP.mkdtemp(NodePath.join(tempRoot, 'studio-voice-test-'));
    t.after(() => NodeFSP.rm(work, { recursive: true, force: true }));
    const narration = "A product starts with its deliverable. Let's follow one windowsill garden idea through the Studio.";
    const plan = compileProject({ schema: 'studio-tutorial/1', title: 'Voice check', scenes: [
      { id: 'intro', source: 'editor', start: 0, end: 6.5, caption: 'Start with the output', narration },
    ] });
    const result = await prepareNarration({ plan, work, voice: process.env.STUDIO_MEDIA_VOICE,
      ff: args => run(ffmpeg, ['-nostdin', '-hide_banner', '-n', ...args], { cwd: work }) });
    const cues = result.timeline[0].cues;
    NodeAssert.ok(cues.length >= 2);
    NodeAssert.equal(cues.map(cue => cue.text).join(' '), narration);
    NodeAssert.ok(cues.every(cue => cue.end > cue.start && cue.start >= 0 && cue.end <= plan.frames));
    NodeAssert.equal((await NodeFSP.readFile(result.file)).length, plan.frames * 1600 * 2);
  });
