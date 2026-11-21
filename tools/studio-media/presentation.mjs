import { formatFrameTime } from './project.mjs';

const sizes = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] };
const grass = '&H64FFD6&';
const white = '&HFFFFFF&';

export function presentationLayout(presentation) {
  // The original 16:9 lesson has its own exact render recipe, including its ASS track.
  if (!presentation || (presentation.aspect === '16:9' &&
      presentation.style === 'studio-lesson' && presentation.captions === 'lower')) return null;
  const [width, height] = sizes[presentation.aspect];
  const social = presentation.style === 'social-reel';
  return { ...presentation, width, height, social,
    pictureWidth: social ? width : Math.round(width * 13 / 15),
    pictureHeight: social ? height : Math.round(height * 13 / 15) };
}

export function presentationCamera(scene, layout) {
  const { width, height, pictureWidth, pictureHeight, social } = layout;
  const { x, y, zoom } = scene.focus;
  const endZoom = social && zoom === 1 ? 1.08 : zoom;
  const ramp = Math.max(1, Math.min(social ? 45 : 23, Math.round((scene.frames - 1) * (social ? 0.65 : 0.4))));
  const t = 'min(1,on/' + ramp + ')';
  const z = '1+' + (endZoom - 1) + '*(' + t + ')*(' + t + ')*(3-2*(' + t + '))';
  const ratio = width + '/' + height;
  const maxHeight = 'min(ih,min(1920,2560/dar))';
  const filters = [
    "scale=w='max(2,trunc((" + maxHeight + ")*dar/2)*2)':h='max(2,trunc((" + maxHeight + ")/2)*2)':flags=lanczos",
    'setsar=1',
  ];
  if (social) {
    // Cover the canvas. The anchor retains its normalized location inside the crop,
    // so the subsequent camera move can center the same source feature.
    filters.push("crop=w='max(2,trunc(min(iw,ih*" + ratio + ")/2)*2)':h='max(2,trunc(min(ih,iw/(" +
      ratio + "))/2)*2)':x='(iw-ow)*" + x + "':y='(ih-oh)*" + y + "'");
  } else {
    filters.push("pad=w='ceil(max(iw,ih*" + ratio + ")/2)*2':h='ceil(max(ih,iw/(" +
      ratio + "))/2)*2':x=(ow-iw)/2:y=(oh-ih)/2:color=0x11181e");
  }
  filters.push("zoompan=z='" + z + "':x='clip(" + x + "*iw-iw/(2*zoom),0,iw-iw/zoom)'" +
    ":y='clip(" + y + "*ih-ih/(2*zoom),0,ih-ih/zoom)':d=1:s=" + pictureWidth + 'x' + pictureHeight + ':fps=30', 'setsar=1');
  if (!social) filters.push('pad=' + width + ':' + height + ':(ow-iw)/2:0:color=0x11181e',
    'drawbox=x=0:y=' + pictureHeight + ':w=iw:h=' + (height - pictureHeight) + ':color=0x10181e:t=fill',
    'drawbox=x=0:y=' + pictureHeight + ':w=iw:h=2:color=0x416356:t=fill');
  return filters;
}

// Partition integer time by spoken character weight. When there is room, each
// item receives at least one frame; the final boundary always equals the cue end.
function timed(items, weights, start, end) {
  const total = weights.reduce((sum, size) => sum + size, 0);
  const minimum = items.length <= end - start ? 1 : 0;
  let cursor = start, used = 0;
  return items.map((value, index) => {
    used += weights[index];
    const boundary = Math.min(end - minimum * (items.length - index - 1),
      Math.max(cursor + minimum, start + Math.round((end - start) * used / total)));
    const part = { value, start: cursor, end: boundary };
    cursor = boundary;
    return part;
  });
}

export function reelPhrases(cue) {
  const groups = [];
  let words = [];
  for (const word of cue.text.split(/\s+/u)) {
    if (words.length && (words.length === 3 || [...words, word].join(' ').length > 18 ||
        /[.!?…。！？]["'”’]?$/.test(words.at(-1)))) {
      groups.push(words);
      words = [];
    }
    words.push(word);
  }
  groups.push(words);
  const frames = cue.end - cue.start;
  if (groups.length > frames) groups.push(groups.splice(frames - 1).flat());
  const weight = word => [...word].length;
  return timed(groups, groups.map(group => group.reduce((sum, word) => sum + weight(word), 0)), cue.start, cue.end)
    .map(({ value, start, end }) => ({ start, end, words: value,
      highlights: timed(value, value.map(weight), start, end) }));
}

function wrapWord(word) {
  // A URL-like string or a long unspaced script must also fit a phone frame.
  return word.match(/.{1,13}/gu).join('\\N');
}

function event(start, end, style, text) {
  return 'Dialogue: 0,' + formatFrameTime(start, 100) + ',' + formatFrameTime(end, 100) + ',' +
    style + ',,0,0,0,,' + text;
}

export function presentationAss(scene, cues, layout) {
  const { width, height, captions, social } = layout;
  const shortSide = Math.min(width, height);
  const margin = Math.round(width * 0.09);
  const textSize = Math.round(shortSide * (social ? 0.075 : 0.038));
  const speechStyle = 'Style: Speech,' + (social ? 'Arial Black' : 'Arial') + ',' + textSize +
    ',&H00FFFFFF,&H00FFFFFF,&H00201810,&H90201810,' + (social ? -1 : 0) +
    ',0,0,0,100,100,0,0,1,' + (social ? 5 : 3) + ',2,5,' + margin + ',' + margin + ',0,1';
  const lines = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: ' + width, 'PlayResY: ' + height,
    'ScaledBorderAndShadow: yes', 'WrapStyle: 0', '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    speechStyle,
    'Style: Label,Arial,' + Math.round(shortSide * 0.028) + ',&H007BDFC2,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,8,' + margin + ',' + margin + ',0,1',
    '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const position = y => '\\pos(' + width / 2 + ',' + Math.round(height * y) + ')';
  if (!social) lines.push(event(0, scene.frames, 'Label', '{' + position(0.88) + '}' + scene.caption));
  if (captions === 'off') return lines.join('\n') + '\n';
  const pos = position(captions === 'center' ? 0.5 : social ? 0.76 : 0.94);
  for (const cue of cues) {
    if (!social) {
      lines.push(event(cue.start, cue.end, 'Speech', '{' + pos + '}' + cue.text));
      continue;
    }
    for (const phrase of reelPhrases(cue)) {
      for (const [index, word] of phrase.highlights.entries()) {
        if (word.start === word.end) continue;
        const text = phrase.words.map((token, i) => i === index ?
          '{\\1c' + grass + '}' + wrapWord(token) + '{\\1c' + white + '}' : wrapWord(token)).join(' ');
        const pop = word.start === phrase.start ? '\\fscx97\\fscy97\\t(0,85,\\fscx100\\fscy100)' : '';
        lines.push(event(word.start, word.end, 'Speech', '{' + pos + pop + '}' + text));
      }
    }
  }
  return lines.join('\n') + '\n';
}
