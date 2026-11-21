import * as NodeFSP from 'node:fs/promises';
import * as NodePath from 'node:path';
import { compileProject, FPS, SAMPLE_RATE, sceneAss, webVtt } from './project.mjs';
import { localPath, readAssets, readJson, run } from './local.mjs';
import { pcmInput, prepareNarration } from './audio.mjs';
import { presentationAss, presentationCamera, presentationLayout } from './presentation.mjs';

async function load(project, assets) {
  const plan = compileProject(await readJson(project));
  return { plan, sources: await readAssets(assets, plan) };
}

export async function validateTutorial({ project, assets }) {
  return (await load(project, assets)).plan;
}

function camera(scene) {
  const { x, y, zoom } = scene.focus;
  const ramp = Math.max(1, Math.min(23, Math.round((scene.frames - 1) * 0.4)));
  const t = 'min(1,on/' + ramp + ')';
  const z = '1+' + (zoom - 1) + '*(' + t + ')*(' + t + ')*(3-2*(' + t + '))';
  // Source pixels stay at native resolution up to 2560 x 1440 for readable screen closeups.
  const height = 'min(ih,min(1440,2560/dar))';
  return [
    "scale=w='max(2,trunc((" + height + ")*dar/2)*2)':h='max(2,trunc((" + height + ")/2)*2)':flags=lanczos",
    'setsar=1',
    "pad=w='ceil(max(iw,ih*16/9)/2)*2':h='ceil(max(ih,iw*9/16)/2)*2':x=(ow-iw)/2:y=(oh-ih)/2:color=0x11181e",
    "zoompan=z='" + z + "':x='clip(" + x + "*iw-iw/(2*zoom),0,iw-iw/zoom)'" +
      ":y='clip(" + y + "*ih-ih/(2*zoom),0,ih-ih/zoom)':d=1:s=1664x936:fps=30",
    'setsar=1', 'pad=1920:1080:(ow-iw)/2:0:color=0x11181e',
    'drawbox=x=0:y=936:w=iw:h=144:color=0x10181e:t=fill',
    'drawbox=x=0:y=936:w=iw:h=2:color=0x416356:t=fill',
  ];
}

async function shot(ff, source, scene, cues, i, work, layout) {
  const script = 'titles-' + i + '.ass';
  const subtitles = layout ? presentationAss(scene, cues, layout) : sceneAss(scene, cues);
  await NodeFSP.writeFile(NodePath.join(work, script), subtitles, 'utf8');
  const preroll = Math.min(60, scene.startFrame);
  const filters = [
    'fps=fps=30:start_time=0:eof_action=pass',
    'trim=start_frame=' + preroll + ':end_frame=' + (preroll + scene.cutFrames),
    'setpts=PTS-STARTPTS',
    'showinfo=checksum=0',
    'tpad=stop_mode=clone:stop=' + scene.holdFrames,
    ...(layout ? presentationCamera(scene, layout) : camera(scene)), 'ass=' + script, 'format=yuv420p',
  ];
  // Count the decoded source frames before tpad so an invalid source range cannot turn into a frozen shot.
  let pending = '', decoded = 0;
  const inspect = chunk => {
    pending += chunk;
    const lines = pending.split(/[\r\n]/);
    pending = lines.pop().slice(-8192);
    for (const line of lines) {
      const match = /\[Parsed_showinfo_[^\]]+\]\s+n:\s*(\d+)\s+pts:/.exec(line);
      if (match) decoded = Number(match[1]) + 1;
    }
  };
  const name = 'shot-' + i + '.mp4';
  const demuxOptions = source.demuxer === 'mov' ? ['-enable_drefs', '0', '-use_absolute_path', '0'] : [];
  const progress = await ff([
    '-loglevel', 'info', '-nostats', '-progress', 'pipe:1', '-protocol_whitelist', 'file',
    '-f', source.demuxer, ...demuxOptions, '-ss', String((scene.startFrame - preroll) / FPS),
    '-threads', '2', '-max_pixels', '33554432', '-i', source.full,
    '-map', '0:v:0', '-an', '-sn', '-dn', '-vf', filters.join(','), '-c:v', 'libx264',
    '-crf', '16', '-preset', 'veryfast', '-threads', '3', '-bf', '0', '-video_track_timescale', '90000',
    '-map_metadata', '-1', '-map_chapters', '-1', '-f', 'mp4', name,
  ], { inspect });
  const count = Number([...progress.out.matchAll(/(?:^|\n)frame=(\d+)/g)].at(-1)?.[1]);
  if (decoded !== scene.cutFrames || count !== scene.frames) {
    throw new Error('Scene ' + scene.id + ' requests ' + scene.cutFrames + ' source frames but decoded ' + decoded +
      ' (' + count + ' output frames). Check its source and end time.');
  }
  return name;
}

async function destination(file, extension) {
  const full = localPath(file);
  if (NodePath.extname(full).toLowerCase() !== extension) throw new Error('Expected output extension ' + extension);
  const parent = localPath(await NodeFSP.realpath(NodePath.dirname(full)));
  const resolved = NodePath.join(parent, NodePath.basename(full));
  try {
    await NodeFSP.lstat(resolved);
    throw new Error('Output already exists: ' + resolved);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  return resolved;
}

async function publish(files, signal) {
  const added = [];
  try {
    for (const [stage, target] of files) {
      signal?.throwIfAborted();
      await NodeFSP.link(stage, target); // Exclusive creation: a racing writer or an existing export wins.
      added.push([stage, target]);
    }
  } catch (error) {
    for (const [stage, target] of added.reverse()) {
      const [a, b] = await Promise.all([NodeFSP.stat(stage), NodeFSP.lstat(target).catch(() => null)]);
      if (b && a.dev === b.dev && a.ino === b.ino) await NodeFSP.unlink(target);
    }
    throw error;
  }
}

export async function renderTutorial({ project, assets, output, audio, voice, soundtrack, soundtrackLevel, ffmpeg, preview, signal, onProgress }) {
  const { plan, sources } = await load(project, assets);
  const video = await destination(output, '.mp4');
  const base = video.slice(0, -4);
  const captions = await destination(base + '.vtt', '.vtt');
  const image = await destination(preview || base + '.jpg', '.jpg');
  if (NodePath.dirname(image) !== NodePath.dirname(video)) throw new Error('Preview must share the output directory');
  const binary = ffmpeg ? localPath(ffmpeg) : 'ffmpeg';
  signal?.throwIfAborted();
  const work = await NodeFSP.mkdtemp(NodePath.join(NodePath.dirname(video), '.studio-media-'));
  try {
    const ff = (args, options) => run(binary, ['-nostdin', '-hide_banner', '-n', '-filter_threads', '2', ...args],
      { cwd: work, signal, ...options });
    onProgress?.('Preparing narration');
    const { file, timeline } = await prepareNarration({ plan, audio, voice, work, ff, signal });
    let mix = file;
    if (soundtrack) {
      const { mixSoundtrack } = await import('./soundtrack.mjs');
      mix = await mixSoundtrack({ soundtrack, level: soundtrackLevel, narration: file, work, frames: plan.frames, ff });
    }
    const list = ['ffconcat version 1.0'];
    const layout = presentationLayout(plan.presentation);
    for (const [i, { scene, cues }] of timeline.entries()) {
      onProgress?.('Rendering scene ' + (i + 1) + '/' + timeline.length + ' (' + scene.id + ')');
      const name = await shot(ff, sources.get(scene.source), scene, cues, i, work, layout);
      list.push('file ' + name, 'duration ' + (scene.frames / FPS).toFixed(8));
    }
    await NodeFSP.writeFile(NodePath.join(work, 'shots.ffconcat'), list.join('\n') + '\n');
    await NodeFSP.writeFile(NodePath.join(work, 'captions.vtt'), webVtt(timeline), 'utf8');
    onProgress?.('Mixing final narration and extracting preview');
    const samples = plan.frames * SAMPLE_RATE / FPS;
    await ff(['-v', 'error', '-f', 'concat', '-safe', '1', '-protocol_whitelist', 'file', '-i', 'shots.ffconcat',
      ...pcmInput, '-i', mix, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,apad=whole_len=' + samples + ',atrim=end_sample=' + samples,
      '-ar', '48000', '-ac', '1', '-c:a', 'aac', '-b:a', '160k', '-map_metadata', '-1',
      '-metadata', 'title=' + plan.title, '-movflags', '+faststart', '-video_track_timescale', '90000', 'final.mp4']);
    const previewFrame = Math.min(plan.scenes[0].frames - 1, 30);
    await ff(['-v', 'error', '-ss', String(previewFrame / FPS), '-i', 'final.mp4', '-map', '0:v:0',
      '-frames:v', '1', '-update', '1', '-q:v', '2', 'preview.jpg']);
    await publish([['captions.vtt', captions], ['preview.jpg', image], ['final.mp4', video]].map(([stage, target]) =>
      [NodePath.join(work, stage), target]), signal);
    return { output: video, preview: image, captions, frames: plan.frames, seconds: plan.frames / FPS };
  } finally {
    // work is the exact private directory returned by mkdtemp under the verified output directory.
    await NodeFSP.rm(work, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
  }
}
