import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type DraftEditor, type StudioDraft } from "./drafts";
import { clipEvidenceInventory, readClipEvidence, readClipPicks, type ClipPick } from "./clipPicks";
import { encodeClipBatch, readClipBatch } from "./clipBatch";
import { ClipSettingsAssistant } from "./ClipSettingsAssistant";
import { ClipPickRange } from "./ClipPickRange";
import { formatClipTime } from "./clipTimes";

export type ReadClipReply = (projectId: string, sourceRevision: string) => Promise<string | null>;

interface Props {
  draft: StudioDraft;
  editor: DraftEditor;
  onRead?: ReadClipReply | undefined;
  onAsk?: ((question: string, scope?: string) => void) | undefined;
  mediaRevision?: string | undefined;
  sourceFile?: File | undefined;
  goToSource: () => void;
}

export function ClipPicksPanel({ draft, editor, onRead, onAsk, mediaRevision, sourceFile, goToSource }: Props) {
  const evidence = readClipEvidence(draft.fields.clipSourceEvidence);
  const batch = readClipBatch(draft.fields.clipReviewedBatch);
  const [reply, setReply] = useState("");
  const [preview, setPreview] = useState<ClipPick[]>();
  const [kept, setKept] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [openRange, setOpenRange] = useState<string>();
  const firstKept = useRef<HTMLElement>(null);
  const focusSelection = useRef(false);
  const [undo, setUndo] = useState<{ before: string; after: string }>();
  const live = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useLayoutEffect(() => {
    if (focusSelection.current && firstKept.current) {
      focusSelection.current = false;
      firstKept.current.focus();
    }
  }, [draft.fields.clipReviewedBatch, preview]);

  function review(raw: string) {
    if (!evidence) return;
    setOpenRange(undefined);
    setPreview(undefined);
    const result = readClipPicks(raw, evidence);
    if ("error" in result) { setMessage(result.error); return; }
    setPreview(result.picks);
    setKept(new Set(result.picks.map((_, index) => index)));
    setMessage(result.picks.length ? "" : "The assistant found no supported cuts in this evidence. Try a different request or mark a moment below.");
  }

  async function loadReply() {
    if (!evidence || !onRead || pending) return;
    setPending(true);
    try {
      const raw = await onRead(draft.id, evidence.sourceRevision);
      if (!live.current) return;
      if (raw) review(raw);
      else setMessage("No completed reply yet. Send the prepared request in chat, then return here.");
    } catch {
      if (live.current) setMessage("Studio could not read the linked reply. You can paste it below.");
    } finally { if (live.current) setPending(false); }
  }

  function saveBatch(after: string) {
    const current = editor.snapshot().draft.fields;
    if (current.clipReviewedBatch !== draft.fields.clipReviewedBatch || current.clipSourceEvidence !== draft.fields.clipSourceEvidence) {
      setMessage("The evidence or kept cuts changed. Review the current selection again.");
      return false;
    }
    setUndo({ before: current.clipReviewedBatch ?? "", after });
    editor.update({ fields: { ...current, clipReviewedBatch: after } });
    return true;
  }

  return <section className="ops-recording" aria-label="AI clip picks">
    <h3>Choose your clips</h3>
    {evidence ? <>
      <p>Load the assistant’s reply, then keep the cuts you want. Each time range has to point to a frame or caption you shared.</p>
      {onRead && <button type="button" className="ops-button ops-primary" disabled={pending} onClick={() => void loadReply()}>
        {pending ? "Looking for picks…" : "Load AI picks"}
      </button>}
      <details className="ops-reference"><summary>Paste an assistant reply</summary>
        <label className="ops-field"><span>Clip-picks JSON</span>
          <textarea rows={3} maxLength={65536} value={reply} onChange={e => setReply(e.target.value)} />
        </label>
        <button type="button" className="ops-button" disabled={!reply.trim()} onClick={() => review(reply)}>Review pasted picks</button>
      </details>
    </> : <p>To get suggestions, choose a video and describe what to find on the Source sheet. You can also set your own marks below.</p>}
    <button type="button" className="ops-link" onClick={goToSource}>Open source recording</button>
    {!!preview?.length && evidence && <fieldset className="ops-reference">
      <legend>Suggested cuts</legend>
      {preview.map((pick, i) => <div key={i}>
        <label><input type="checkbox" checked={kept.has(i)} onChange={e => {
          const next = new Set(kept);
          if (e.target.checked) next.add(i); else next.delete(i);
          setKept(next);
        }} /> {pick.title}</label>
        <p>{formatClipTime(pick.startMs)} – {formatClipTime(pick.endMs)} · {pick.settings.aspect} · {pick.settings.resolution}</p>
        <p>{pick.reason}</p><small>Source evidence: {pick.evidenceIds.join(", ")}</small>
        <ClipPickRange file={mediaRevision === evidence.mediaRevision ? sourceFile : undefined} evidence={evidence}
          picks={preview} index={i} expanded={openRange === "suggested-" + i}
          onToggle={open => setOpenRange(open ? "suggested-" + i : undefined)}
          onSave={next => { setPreview(next); return true; }} />
      </div>)}
      {(!sourceFile || mediaRevision !== evidence.mediaRevision) && <p>Reattach the matching recording on Source to preview or edit these ranges.</p>}
      {batch && <p>Keeping this selection replaces the current batch of {batch.picks.length}.</p>}
      <button type="button" className="ops-button ops-primary" disabled={!kept.size} onClick={() => {
        if (saveBatch(encodeClipBatch(clipEvidenceInventory(evidence), preview.filter((_, i) => kept.has(i))))) {
          focusSelection.current = true;
          setPreview(undefined); setOpenRange(undefined); setMessage("");
        }
      }}>Keep selected clips ({kept.size})</button>
    </fieldset>}
    {batch && <section aria-label="Kept clips"><h4>Kept clips ({batch.picks.length})</h4>
      {batch.picks.map((pick, i) => <details className="ops-reference" key={i} onToggle={e => {
        if (!e.currentTarget.open) setOpenRange(current => current === "kept-" + i ? undefined : current);
      }}>
        <summary ref={i === 0 ? firstKept : undefined}>{pick.title} · {formatClipTime(pick.startMs)} – {formatClipTime(pick.endMs)}</summary>
        <p>{pick.reason}</p>
        <ClipPickRange file={mediaRevision === batch.evidence.mediaRevision ? sourceFile : undefined}
          evidence={batch.evidence} picks={batch.picks} index={i} expanded={openRange === "kept-" + i}
          onToggle={open => setOpenRange(open ? "kept-" + i : undefined)}
          onSave={next => saveBatch(encodeClipBatch(batch.evidence, next))} />
        <ClipSettingsAssistant scopeId={[draft.id, batch.evidence.sourceRevision, pick.startMs, pick.endMs].join("/")} value={pick.settings} onChange={settings => {
          const next = batch.picks.map((p, n) => n === i ? { ...p, settings } : p);
          saveBatch(encodeClipBatch(batch.evidence, next));
        }} {...(onAsk ? { onAsk } : {})}
          {...(onRead ? { onReadReply: (scope: string) => onRead(draft.id, "settings:" + scope) } : {})} />
        <button type="button" className="ops-button" disabled={mediaRevision !== batch.evidence.mediaRevision} onClick={() => {
          const current = editor.snapshot().draft.fields;
          editor.update({ fields: { ...current, markIn: formatClipTime(pick.startMs), markOut: formatClipTime(pick.endMs),
            momentRationale: pick.reason, clipManualSettings: JSON.stringify(pick.settings) } });
          setMessage("Marks and settings copied to the single-cut editor.");
        }}>Use in single-cut editor</button>
      </details>)}
      {(!sourceFile || mediaRevision !== batch.evidence.mediaRevision) && <p>Reattach the same video on Source to preview or render these cuts.</p>}
    </section>}
    {undo && draft.fields.clipReviewedBatch === undo.after && <button type="button" className="ops-link" onClick={() => {
      const current = editor.snapshot().draft.fields;
      if (current.clipReviewedBatch === undo.after) editor.update({ fields: { ...current, clipReviewedBatch: undo.before } });
      setUndo(undefined);
    }}>Undo batch change</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
