export const cueTextFields = [
  ["action", "Action"],
  ["narration", "Narration"],
  ["caption", "Caption"],
  ["sound", "Sound"],
] as const;

export type VideoCue = {
  id: string;
  timestamp: string;
} & Record<(typeof cueTextFields)[number][0], string>;

export function isVideoCueList(value: unknown): value is VideoCue[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  for (const row of value) {
    if (
      !row || typeof row !== "object" || Array.isArray(row) ||
      typeof row.id !== "string" || !row.id.trim() || seen.has(row.id) ||
      typeof row.timestamp !== "string" || !cueTextFields.every(([key]) => typeof row[key] === "string")
    ) return false;
    seen.add(row.id);
  }
  return true;
}

function parseStartMs(timestamp: string): number | null {
  const parts = /^(\d+):([0-5]\d)(?::([0-5]\d))?(?:\.(\d{1,3}))?$/.exec(timestamp.trim());
  if (!parts) return null;
  const firstPair = Number(parts[1]) * 60 + Number(parts[2]);
  const seconds = parts[3] === undefined ? firstPair : firstPair * 60 + Number(parts[3]);
  const ms = seconds * 1000 + Number((parts[4] ?? "").padEnd(3, "0"));
  return Number.isSafeInteger(ms) ? ms : null;
}

export function inspectCueSheet(cues: readonly VideoCue[]) {
  let latestMs = -1;
  const rows = cues.map((cue) => {
    const startMs = parseStartMs(cue.timestamp);
    let error: string | undefined;
    if (startMs === null) {
      error = cue.timestamp.trim() ? "Use a time such as 0:02.500." : "Enter a start time.";
    } else if (startMs <= latestMs) {
      error = "Choose a start time later than the preceding cues.";
    } else {
      latestMs = startMs;
    }
    return { cue, startMs, error };
  });
  const timing = rows.length > 0 && rows.every((row) => !row.error) ? "ready" : "draft";
  return { rows, timing };
}

export function exportCueSheet(cues: readonly VideoCue[]) {
  const { rows, timing } = inspectCueSheet(cues);
  return {
    timing,
    cues: rows.map(({ cue: { id, timestamp, action, narration, caption, sound }, startMs }) => ({
      id, timestamp, startMs, action, narration, caption, sound,
    })),
  };
}
