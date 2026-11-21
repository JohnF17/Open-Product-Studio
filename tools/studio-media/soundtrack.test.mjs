import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { mixSoundtrack } from './soundtrack.mjs';

const ffmpeg = process.env.STUDIO_MEDIA_FFMPEG;
const run = promisify(execFile);
test('soundtrack choices are bounded', async () => {
  await assert.rejects(mixSoundtrack({ level: 'unregistered' }), /soundtrack level/);
});

test('an optional music bed remains audible around speech and respects the authored frame clock', { skip: !ffmpeg }, async t => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-soundtrack-'));
  t.after(() => fs.rm(work, { recursive: true, force: true }));
  const ff = args => run(ffmpeg, ['-nostdin','-loglevel','error','-y',...args], { cwd:work, windowsHide:true });
  const soundtrack = path.join(work, 'score.wav'), narration = path.join(work, 'narration.pcm');
  await ff(['-f','lavfi','-i','sine=frequency=190:duration=2.4:sample_rate=48000','-af','volume=1.3',soundtrack]);
  await ff(['-f','lavfi','-i','sine=frequency=670:duration=3:sample_rate=48000','-af',"volume=if(between(t\\,0.65\\,1.65)\\,1\\,0):eval=frame",'-f','s16le',narration]);
  const rms = (pcm, start, end) => {
    let sum=0;
    for(let i=start;i<end;i++)sum+=(pcm.readInt16LE(i*2)/32768)**2;
    return Math.sqrt(sum/(end-start));
  };
  const result=[];
  for(const level of ['subtle','present']) {
    const target=await mixSoundtrack({soundtrack,narration,level,work,frames:90,ff});
    const pcm=await fs.readFile(target);
    assert.equal(pcm.length,3*48000*2);
    assert.ok(rms(pcm,4800,16000)>0.002);
    assert.ok(rms(pcm,42000,66000)>0.045);
    assert.ok(rms(pcm,130000,140000)<0.001);
    result.push(rms(pcm,4800,16000));
  }
  assert.ok(result[1]>result[0]*2);
});
