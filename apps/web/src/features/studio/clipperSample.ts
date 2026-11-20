type SampleRange = { startFrame: number; endFrameExclusive: number };

export const SAMPLE_FPS = 24;
export const SAMPLE_FRAMES = 5 * SAMPLE_FPS;

export function readSampleRange(start: string, end: string): SampleRange | null {
  if (!/^\d{1,3}$/.test(start) || !/^\d{1,3}$/.test(end)) return null;
  const startFrame = Number(start);
  const endFrameExclusive = Number(end);
  return startFrame < endFrameExclusive && endFrameExclusive <= SAMPLE_FRAMES
    ? { startFrame, endFrameExclusive }
    : null;
}

function seconds(frames: number) {
  return String(Number((frames / SAMPLE_FPS).toFixed(3)));
}

export function sampleRangeSummary({ startFrame, endFrameExclusive }: SampleRange) {
  const count = endFrameExclusive - startFrame;
  return `Starts at frame ${startFrame} (${seconds(startFrame)} seconds) and stops before frame ${endFrameExclusive} (${seconds(endFrameExclusive)} seconds). ${count} ${count === 1 ? "frame" : "frames"}, ${seconds(count)} seconds.`;
}
