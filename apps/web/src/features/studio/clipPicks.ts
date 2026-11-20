export interface ClipEvidence {
  mediaRevision: string;
  sourceRevision: string;
  durationMs: number;
  frames: readonly { id: string; timeMs: number }[];
  transcript?: readonly { id: string; startMs: number; endMs: number }[];
}

export interface ClipPick {
  startMs: number;
  endMs: number;
  title: string;
  reason: string;
  evidenceIds: string[];
  settings: { aspect: "9:16" | "1:1" | "16:9"; resolution: "720p" | "1080p"; captions: "off" | "on"; placement: "top" | "center" | "bottom" };
}

type Result = { picks: ClipPick[] } | { error: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const hasKeys = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const ms = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const id = (v: unknown): v is string => text(v, 128);

/** The persisted evidence inventory deliberately omits the image, transcript text and source path. */
export function clipEvidenceInventory(evidence: ClipEvidence): ClipEvidence {
  return {
    mediaRevision: evidence.mediaRevision, sourceRevision: evidence.sourceRevision, durationMs: evidence.durationMs,
    frames: evidence.frames.map(({ id, timeMs }) => ({ id, timeMs })),
    transcript: (evidence.transcript ?? []).map(({ id, startMs, endMs }) => ({ id, startMs, endMs })),
  };
}

export function readClipEvidence(raw: string | undefined): ClipEvidence | undefined {
  if (!raw || raw.length > 131_072) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || !text(value.mediaRevision, 192) || !text(value.sourceRevision, 192) || !ms(value.durationMs) || value.durationMs === 0 ||
        !Array.isArray(value.frames) || value.frames.length > 16 || !Array.isArray(value.transcript) || value.transcript.length > 512) return;
    const duration = value.durationMs;
    if (!value.frames.every(f => object(f) && id(f.id) && ms(f.timeMs) && f.timeMs < duration)) return;
    if (!value.transcript.every(s => object(s) && id(s.id) && ms(s.startMs) && ms(s.endMs) && s.startMs < s.endMs && s.endMs <= duration)) return;
    const ids = [...value.frames, ...value.transcript].map(row => row.id as string);
    if (!ids.length || new Set(ids).size !== ids.length) return;
    return clipEvidenceInventory(value as unknown as ClipEvidence);
  } catch { return; }
}

export function readClipPicks(raw: string, evidence: ClipEvidence): Result {
  if (raw.length > 65_536) return { error: "The reply is too large to review." };
  const fenced = /^\s*```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i.exec(raw);
  let reply: unknown;
  try { reply = JSON.parse(fenced?.[1] ?? raw); } catch { return { error: "The assistant reply needs a clip-picks JSON document." }; }
  if (!object(reply) || !hasKeys(reply, ["schema", "sourceRevision", "clips"]) || reply.schema !== "studio-clip-picks/1") {
    return { error: "This reply is missing the Studio clip-picks format." };
  }
  if (reply.sourceRevision !== evidence.sourceRevision) return { error: "These picks refer to a different recording or evidence revision." };
  if (!Array.isArray(reply.clips) || reply.clips.length > 6) return { error: "Review up to six clips in one reply." };
  const frames = new Map(evidence.frames.map(f => [f.id, f.timeMs]));
  const spans = new Map((evidence.transcript ?? []).map(s => [s.id, s]));
  const intervals = new Set<string>();
  const picks: ClipPick[] = [];
  for (const v of reply.clips) {
    const n = picks.length + 1;
    if (!object(v) || !hasKeys(v, ["startMs", "endMs", "title", "reason", "evidenceIds", "settings"]) ||
        !ms(v.startMs) || !ms(v.endMs) || v.startMs >= v.endMs || v.endMs > evidence.durationMs ||
        !text(v.title, 120) || !text(v.reason, 500)) return { error: `Clip ${n} needs a title, reason and valid source range.` };
    const { startMs, endMs } = v;
    if (/[“”"«»「」]|(?:^|\s)['‘][^'’]+['’](?:\s|[,.!?]|$)/u.test(v.title + " " + v.reason)) {
      return { error: `Clip ${n} needs an editorial title and explanation in the assistant’s own words. Use the source caption file for quotations.` };
    }
    const interval = `${startMs}-${endMs}`;
    if (intervals.has(interval)) return { error: `Clip ${n} repeats an earlier range.` };
    intervals.add(interval);
    if (!Array.isArray(v.evidenceIds) || !v.evidenceIds.length || v.evidenceIds.length > 24 ||
        !v.evidenceIds.every(id) || new Set(v.evidenceIds).size !== v.evidenceIds.length ||
        !v.evidenceIds.every(key => {
          const frame = frames.get(key);
          const span = spans.get(key);
          return frame !== undefined ? frame >= startMs && frame < endMs : !!span && span.startMs < endMs && span.endMs > startMs;
        })) return { error: `Clip ${n} needs evidence from inside its selected range.` };
    const s = v.settings;
    if (!object(s) || !hasKeys(s, ["aspect", "resolution", "captions", "placement"]) ||
        (s.aspect !== "9:16" && s.aspect !== "16:9" && s.aspect !== "1:1") ||
        (s.resolution !== "720p" && s.resolution !== "1080p") || (s.captions !== "on" && s.captions !== "off") ||
        (s.placement !== "top" && s.placement !== "center" && s.placement !== "bottom")) return { error: `Clip ${n} has unsupported output settings.` };
    picks.push({ startMs, endMs, title: v.title.trim(), reason: v.reason.trim(), evidenceIds: [...v.evidenceIds],
      settings: { aspect: s.aspect, resolution: s.resolution, captions: s.captions, placement: s.placement } });
  }
  return { picks };
}
