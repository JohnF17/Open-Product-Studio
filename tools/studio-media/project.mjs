export const FPS = 30;
export const SAMPLE_RATE = 48000;

function fail(message) {
  throw new Error(message);
}

export function requireId(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) ||
      ['__proto__', 'prototype', 'constructor'].includes(value)) fail('Invalid ' + label);
}

function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) fail('Invalid fields in ' + label);
}

function plain(value, limit, label) {
  if (typeof value !== 'string' || !value.trim() || [...value].length > limit ||
      /[\p{Cc}\p{Zl}\p{Zp}\\{}]/u.test(value)) fail('Invalid plain text in ' + label);
  return value.trim();
}

function numeric(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) fail('Out of range: ' + label);
  return value;
}

export function compileProject(project) {
  object(project, ['schema', 'title', 'scenes', 'presentation'], 'project');
  if (project.schema !== 'studio-tutorial/1') fail('Unsupported project schema');
  let presentation;
  if (Object.hasOwn(project, 'presentation')) {
    const value = project.presentation;
    object(value, ['aspect', 'style', 'captions'], 'presentation');
    if (Object.keys(value).length !== 3 || !['9:16', '1:1', '16:9'].includes(value.aspect) ||
        !['social-reel', 'studio-lesson'].includes(value.style) ||
        !['center', 'lower', 'off'].includes(value.captions)) fail('Invalid presentation');
    presentation = { aspect: value.aspect, style: value.style, captions: value.captions };
  }
  const title = plain(project.title, 120, 'title');
  if (!Array.isArray(project.scenes) || !project.scenes.length || project.scenes.length > 120)
    fail('A tutorial needs 1 to 120 scenes');
  const ids = new Set();
  let offset = 0;
  const scenes = project.scenes.map((s, index) => {
    object(s, ['id', 'source', 'start', 'end', 'narration', 'caption', 'focus', 'hold'], 'scene ' + (index + 1));
    requireId(s.id, 'scene ID');
    requireId(s.source, 'source ID');
    if (ids.has(s.id)) fail('Duplicate scene ID: ' + s.id);
    ids.add(s.id);
    const startFrame = Math.round(FPS * numeric(s.start, 0, 86400, s.id + ' start'));
    const last = Math.round(FPS * numeric(s.end, 0, 86400, s.id + ' end'));
    const cutFrames = numeric(last - startFrame, 1, FPS * 180, s.id + ' cut length');
    const hold = Object.hasOwn(s, 'hold') ? numeric(s.hold, 0, 60, s.id + ' hold') : 0;
    const holdFrames = Math.round(FPS * hold);
    const frames = cutFrames + holdFrames;
    const focus = Object.hasOwn(s, 'focus') ? s.focus : { x: 0.5, y: 0.5, zoom: 1 };
    object(focus, ['x', 'y', 'zoom'], s.id + ' focus');
    numeric(focus.x, 0, 1, s.id + ' focus x');
    numeric(focus.y, 0, 1, s.id + ' focus y');
    numeric(focus.zoom, 1, 3, s.id + ' zoom');
    const narration = plain(s.narration, 900, s.id + ' narration');
    const caption = plain(s.caption, 80, s.id + ' caption');
    const result = { id: s.id, source: s.source, startFrame, cutFrames, holdFrames, frames,
      focus, narration, caption, offset };
    offset += frames;
    if (offset > FPS * 1200) fail('Tutorial exceeds 20 minutes');
    return result;
  });
  return { title, scenes, frames: offset, ...(presentation && { presentation }) };
}

// Preserve punctuation and give longer passages a proportionate share of the speaking time.
export function subtitleCues(scene, speechFrames = scene.frames) {
  const chunks = [];
  let line = '';
  const tokens = scene.narration.match(/\S{1,54}/gu);
  for (const word of tokens) {
    if (line && (line.length + word.length > 57 || (line.length >= 22 && /[.!?…]["'”’]?$/.test(line)))) {
      chunks.push(line);
      line = '';
    }
    line = line ? line + ' ' + word : word;
  }
  chunks.push(line);
  if (chunks.length > speechFrames) fail('Narration needs more time in scene ' + scene.id);
  const weight = chunks.reduce((total, chunk) => total + chunk.length, 0);
  let cursor = 0;
  let consumed = 0;
  return chunks.map((text, i) => {
    consumed += text.length;
    const end = Math.min(speechFrames - (chunks.length - i - 1),
      Math.max(cursor + 1, Math.round(speechFrames * consumed / weight)));
    const cue = { start: cursor, end, text };
    cursor = end;
    return cue;
  });
}

export function formatFrameTime(frame, units) {
  const ticks = Math.round(frame * units / FPS);
  const sec = Math.floor(ticks / units);
  const pair = n => String(n).padStart(2, '0');
  const hour = Math.floor(sec / 3600);
  return (units === 100 ? hour : pair(hour)) + ':' + pair(Math.floor(sec / 60) % 60) + ':' +
    pair(sec % 60) + '.' + String(ticks % units).padStart(units === 100 ? 2 : 3, '0');
}

export function webVtt(timeline) {
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return 'WEBVTT\n\n' + timeline.map(({ scene, cues }) => cues.map(cue =>
    formatFrameTime(scene.offset + cue.start, 1000) + ' --> ' + formatFrameTime(scene.offset + cue.end, 1000) +
    '\n' + escape(cue.text) + '\n\n').join('')).join('');
}

// The picture and both text lines have separate space, so subtitles never cover the pointer.
export function sceneAss(scene, cues) {
  const header = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080',
    'ScaledBorderAndShadow: yes', 'WrapStyle: 0', '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Label,Arial,30,&H007BDFC2,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,8,80,80,950,1',
    'Style: Speech,Arial,40,&H00F6F6F6,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,70,70,993,1',
    '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const event = (start, end, style, text) =>
    'Dialogue: 0,' + formatFrameTime(start, 100) + ',' + formatFrameTime(end, 100) + ',' + style + ',,0,0,0,,' + text;
  return [...header, event(0, scene.frames, 'Label', scene.caption),
    ...cues.map(cue => event(cue.start, cue.end, 'Speech', cue.text))].join('\n') + '\n';
}
