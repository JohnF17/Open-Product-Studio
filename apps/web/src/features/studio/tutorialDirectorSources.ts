/** Give a text-only director explicit, bounded choices inside the creator's reviewed ranges. */
export function tutorialDirectorSources(context: string) {
  const choices: Array<{ id: string; start: number; end: number }> = [];
  const sourceLine = /^SOURCE ([A-Za-z0-9_-]{1,64}) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\s*$/gm;
  for (const match of context.matchAll(sourceLine)) {
    const id = match[1]!;
    const start = Number(match[2]);
    const end = Number(match[3]);
    if (!(end > start) || end > 86_400 || choices.length >= 24) continue;
    if (end - start <= 180) {
      choices.push({ id, start, end });
      continue;
    }
    // These are editing options, not claims about what appears in the recording.
    const sampleLength = 12;
    for (const offset of [
      start,
      Math.floor((start + end - sampleLength) / 2),
      end - sampleLength,
    ]) {
      if (choices.length < 24) choices.push({ id, start: offset, end: offset + sampleLength });
    }
  }
  return choices;
}
