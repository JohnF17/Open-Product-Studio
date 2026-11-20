const WIDTH = 360;
const HEIGHT = 640;
const TIMESCALE = 12_288;
const TICKS_PER_FRAME = 512;

export const PORTRAIT = Object.freeze({ width: WIDTH, height: HEIGHT, timescale: TIMESCALE });

interface Box {
  readonly type: string;
  readonly body: Buffer;
}

function requireLayout(condition: boolean): asserts condition {
  if (!condition) throw new Error("Unexpected MP4 layout");
}

function boxes(buffer: Buffer): Box[] {
  const result: Box[] = [];
  for (let offset = 0; offset < buffer.length;) {
    requireLayout(buffer.length - offset >= 8 && result.length < 128);
    const size = buffer.readUInt32BE(offset);
    requireLayout(size >= 8 && size <= buffer.length - offset);
    result.push({
      type: buffer.toString("ascii", offset + 4, offset + 8),
      body: buffer.subarray(offset + 8, offset + size),
    });
    offset += size;
  }
  return result;
}

function one(list: readonly Box[], type: string): Buffer {
  const matches = list.filter((box) => box.type === type);
  requireLayout(matches.length === 1);
  return matches[0]!.body;
}

/** Only the unfragmented, single-track MP4 layout the fixed encoder command emits. */
export function validatePortraitMp4(buffer: Buffer, frameCount: number): number {
  const top = boxes(buffer);
  one(top, "ftyp");
  requireLayout(one(top, "mdat").length > 0 && !top.some((box) => box.type === "moof"));
  const movie = boxes(one(top, "moov"));
  requireLayout(!movie.some((box) => box.type === "mvex"));
  const duration = frameCount * TICKS_PER_FRAME;
  const movieHeader = one(movie, "mvhd");
  requireLayout(
    movieHeader.length === 100 && movieHeader[0] === 0 &&
    movieHeader.readUInt32BE(12) === TIMESCALE &&
    movieHeader.readUInt32BE(16) === duration,
  );
  const track = boxes(one(movie, "trak"));
  requireLayout(!track.some((box) => box.type === "edts"));
  const trackHeader = one(track, "tkhd");
  requireLayout(
    trackHeader.length === 84 && trackHeader[0] === 0 &&
    trackHeader.readUInt32BE(20) === duration &&
    trackHeader.readUInt32BE(76) === WIDTH * 65_536 &&
    trackHeader.readUInt32BE(80) === HEIGHT * 65_536,
  );

  const media = boxes(one(track, "mdia"));
  requireLayout(one(media, "hdlr").toString("ascii", 8, 12) === "vide");
  const mediaHeader = one(media, "mdhd");
  requireLayout(
    mediaHeader.length === 24 && mediaHeader[0] === 0 &&
    mediaHeader.readUInt32BE(12) === TIMESCALE &&
    mediaHeader.readUInt32BE(16) === duration,
  );

  const samples = boxes(one(boxes(one(media, "minf")), "stbl"));
  requireLayout(!samples.some((box) => box.type === "ctts"));
  const description = one(samples, "stsd");
  requireLayout(description.length >= 8 && description.readUInt32BE(4) === 1);
  const entries = boxes(description.subarray(8));
  requireLayout(entries.length === 1 && entries[0]?.type === "avc1");
  const timing = one(samples, "stts");
  requireLayout(
    timing.length === 16 && timing.readUInt32BE(0) === 0 &&
    timing.readUInt32BE(4) === 1 &&
    timing.readUInt32BE(8) === frameCount &&
    timing.readUInt32BE(12) === TICKS_PER_FRAME,
  );
  return duration;
}
