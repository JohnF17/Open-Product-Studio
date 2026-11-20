import { clipEvidenceInventory, readClipEvidence, readClipPicks, type ClipEvidence, type ClipPick } from "./clipPicks";

export const defaultClipSettings: ClipPick["settings"] = {
  aspect: "9:16", resolution: "720p", captions: "off", placement: "bottom",
};

export function encodeClipBatch(evidence: ClipEvidence, picks: readonly ClipPick[]) {
  return JSON.stringify({
    evidence: clipEvidenceInventory(evidence),
    selection: { schema: "studio-clip-picks/1", sourceRevision: evidence.sourceRevision, clips: picks },
  });
}

export function readClipBatch(raw: string | undefined) {
  if (!raw || raw.length > 196608) return;
  try {
    const item = JSON.parse(raw);
    const evidence = readClipEvidence(JSON.stringify(item?.evidence));
    if (!evidence) return;
    const result = readClipPicks(JSON.stringify(item.selection) ?? "", evidence);
    if ("picks" in result && result.picks.length) return { evidence, picks: result.picks };
  } catch { return; }
}

export function manualClipSettings(raw: string | undefined): ClipPick["settings"] {
  if (!raw) return defaultClipSettings;
  try {
    const s = JSON.parse(raw);
    return {
      aspect: ["9:16", "1:1", "16:9"].includes(s.aspect) ? s.aspect : defaultClipSettings.aspect,
      resolution: s.resolution === "1080p" ? "1080p" : "720p",
      captions: s.captions === "on" ? "on" : "off",
      placement: s.placement === "top" || s.placement === "center" ? s.placement : "bottom",
    };
  } catch { return defaultClipSettings; }
}

/** Leave private evidence identifiers in the private backup only. */
export function clipEditPlanFields(fields: Record<string, string>) {
  const { clipSourceEvidence: _inventory, clipGoal: _privateGoal, clipReviewedBatch, ...authored } = fields;
  const batch = readClipBatch(clipReviewedBatch);
  return {
    fields: authored,
    ...(batch ? { clips: batch.picks.map(({ title, startMs, endMs, settings }) => ({
      title, startMs, endMs, settings,
    })) } : {}),
  };
}
