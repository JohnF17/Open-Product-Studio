/** Written marks accept seconds, M:SS or H:MM:SS, with up to three decimal places. */
export function parseClipTime(text: string): number | null {
  const parts = /^(\d+)(?::([0-5]\d))?(?::([0-5]\d))?(?:\.(\d{1,3}))?$/.exec(text.trim());
  if (!parts) return null;

  let seconds = Number(parts[1]);
  if (parts[2] !== undefined) seconds = seconds * 60 + Number(parts[2]);
  if (parts[3] !== undefined) seconds = seconds * 60 + Number(parts[3]);
  const ms = seconds * 1000 + Number((parts[4] ?? "").padEnd(3, "0"));
  return Number.isSafeInteger(ms) ? ms : null;
}

export function formatClipTime(ms: number): string {
  if (!Number.isSafeInteger(ms) || ms < 0) return "";
  const fraction = ms % 1000;
  const seconds = (ms - fraction) / 1000;
  const hours = Math.floor(seconds / 3600);
  const minutesPart = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
  const secondsPart = String(seconds % 60).padStart(2, "0");
  const clock = hours ? `${hours}:${minutesPart}:${secondsPart}` : `${minutesPart}:${secondsPart}`;
  return fraction ? `${clock}.${String(fraction).padStart(3, "0")}` : clock;
}

export function readClipRange(fields: Record<string, string>, durationMs?: number) {
  const start = parseClipTime(fields.markIn ?? "");
  const end = parseClipTime(fields.markOut ?? "");
  if (start === null || end === null || start >= end) return null;
  if (durationMs !== undefined && (!Number.isSafeInteger(durationMs) || end > durationMs)) return null;
  return { start, end, duration: end - start };
}
