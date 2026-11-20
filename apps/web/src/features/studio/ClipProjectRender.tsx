import { useState } from "react";
import type { StudioDraft } from "./drafts";
import type { ClipperSourceState } from "./ClipperSource";
import { ClipFootageExport } from "./ClipFootageExport";
import { readClipBatch, manualClipSettings } from "./clipBatch";
import { formatClipTime, readClipRange } from "./clipTimes";

interface Props {
  draft: StudioDraft;
  source: ClipperSourceState | undefined;
  goToSource: () => void;
}

export function ClipProjectRender({ draft, source, goToSource }: Props) {
  const [manual, setManual] = useState(false);
  const [confirmedRange, setConfirmedRange] = useState("");
  const [sharedCaption, setSharedCaption] = useState("");
  const batch = readClipBatch(draft.fields.clipReviewedBatch);
  const video = source?.video;
  const range = readClipRange(draft.fields, video?.durationMs);
  const batchSelected = !!batch && !manual;
  const sameMedia = !!video && video.mediaRevision === batch?.evidence.mediaRevision;
  const rangeKey = video && range ? [video.mediaRevision, range.start, range.end].join("/") : "";
  const captions = source?.captions?.cues ?? [];
  const caption = draft.fields.captionLine ?? "";
  const captionKey = JSON.stringify([draft.fields.clipReviewedBatch, caption]);
  const useSharedCaption = Boolean(caption.trim()) && sharedCaption === captionKey;
  const cuts = batchSelected && sameMedia
    ? batch.picks.map(p => ({ ...p, captions, ...(useSharedCaption ? { caption } : {}) }))
    : !batchSelected && range && rangeKey && confirmedRange === rangeKey
      ? [{ startMs: range.start, endMs: range.end, title: "Marked clip", settings: manualClipSettings(draft.fields.clipManualSettings), caption, captions }]
      : [];
  return <section className="ops-recording" aria-label="Export selected footage">
    <h3>Export selected footage</h3>
    {batch && <label className="ops-field"><span>Clips to render</span><select value={manual ? "manual" : "batch"}
      onChange={e => setManual(e.target.value === "manual")}>
      <option value="batch">Kept batch ({batch.picks.length})</option>
      <option value="manual">Single marked cut</option>
    </select></label>}
    {batchSelected && batch.picks.some(p => p.settings.captions === "on") && <>
      <p>Clips with captions use the timed text imported on Source.</p>
      {caption.trim() ? <label><input type="checkbox" checked={useSharedCaption}
        onChange={e => setSharedCaption(e.target.checked ? captionKey : "")} />
        Use “{caption}” for each captioned clip without a matching cue</label>
        : <p>For a fixed caption, write a line on Edit notes and choose it here.</p>}
    </>}
    {!video || (batchSelected && !sameMedia) ? <>
      <p>{batchSelected ? "Choose the same recording used for the kept clips." : "Choose your source recording to create a playable clip."}</p>
      <button type="button" className="ops-button" onClick={goToSource}>Choose source recording</button>
    </> : !batchSelected && !range ? <p>Set a start and end inside this recording on the Moment sheet.</p> : <>
      {!batchSelected && range && <label><input type="checkbox" checked={confirmedRange === rangeKey}
        onChange={e => setConfirmedRange(e.target.checked ? rangeKey : "")} />
        Use {formatClipTime(range.start)} – {formatClipTime(range.end)} from {video.file.name}</label>}
      {cuts.length > 0 && <ClipFootageExport file={video.file} cuts={cuts} />}
    </>}
  </section>;
}
