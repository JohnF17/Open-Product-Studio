import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readLocalSeriesBrief, type DraftEditor, type StudioDraft } from "./drafts";
import { pinBriefUpdate } from "./pinEpisodeBrief";
import { catalog, selectedTools } from "./guide";
import type { VideoSeriesBrief } from "./videoSeries";

export function EpisodeBriefUpdate({ draft, editor }: { draft: StudioDraft; editor: DraftEditor }) {
  const { status } = useSyncExternalStore(editor.subscribe, editor.snapshot, editor.snapshot);
  const [candidate, setCandidate] = useState<VideoSeriesBrief>();
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const checkButton = useRef<HTMLButtonElement>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, [editor]);

  const pinned = draft.seriesBrief;
  if (!pinned || draft.seriesBriefOwner) return null;
  const patch = candidate && pinBriefUpdate(draft, candidate);
  async function check() {
    if (!pinned || checking) return;
    const current = ++request.current;
    setChecking(true);
    setCandidate(undefined);
    setMessage("");
    try {
      const latest = await readLocalSeriesBrief(draft.workspaceId, pinned.seriesId);
      if (current !== request.current) return;
      if (latest && latest.revision > pinned.revision) {
        setCandidate(latest);
        setMessage("Revision " + latest.revision + " is available to review.");
      }
      else setMessage(latest ? "This episode already uses the latest brief." : "Only the pinned copy is available in this workspace.");
    } catch {
      if (current === request.current) setMessage("Studio could not read the local series. Try checking again.");
    } finally {
      if (current === request.current) setChecking(false);
    }
  }
  async function apply() {
    if (!candidate) return;
    const { draft: live, status } = editor.snapshot();
    if (status !== "saved" || live.id !== draft.id || live.revision !== draft.revision) return;
    const update = pinBriefUpdate(live, candidate);
    if (!update) return;
    editor.update(update);
    checkButton.current?.focus();
    setCandidate(undefined);
    const current = ++request.current;
    setMessage("Saving the updated episode…");
    await editor.flush();
    if (current !== request.current) return;
    setMessage(editor.snapshot().status === "saved"
      ? "Saved revision " + candidate.revision + " to this episode."
      : "The updated episode could not be saved. Check the project save status.");
  }
  return (
    <section className="ops-series-updates" aria-label="Series revisions">
      <button type="button" className="ops-link" ref={checkButton} aria-disabled={checking} onClick={() => void check()}>
        {checking ? "Checking…" : "Check for a newer brief"}
      </button>
      {patch && candidate && (
        <div className="ops-series-change">
          <h4>Review revision {candidate.revision}</h4>
          <dl>
            <dt>Episode audience</dt><dd>{(draft.fields.audience ?? candidate.audience) || "Left blank"}</dd>
            <dt>Episode format</dt><dd>{(draft.fields.seriesFormat ?? candidate.format) || "Left blank"}</dd>
            <dt>Episode style</dt><dd>{catalog.styles[patch.style].label}</dd>
            <dt>Tool plan</dt><dd>{selectedTools({ ...draft, ...patch }).map((id) => catalog.stackEntries[id]!.label).join(", ")}</dd>
          </dl>
          <p>Your audience, format and style overrides carry forward.</p>
          {draft.tools.some((id) => !patch.tools.includes(id)) &&
            <p>Removed from the tool plan: {draft.tools.filter((id) => !patch.tools.includes(id)).map((id) => catalog.stackEntries[id]?.label ?? id).join(", ")}.</p>}
          <div className="ops-actions">
            <button type="button" className="ops-button ops-primary" disabled={status !== "saved"} onClick={() => void apply()}>Apply revision {candidate.revision}</button>
            <button type="button" className="ops-link" onClick={() => { checkButton.current?.focus(); setCandidate(undefined); setMessage("Kept the pinned revision."); }}>Keep current revision</button>
          </div>
        </div>
      )}
      <span role="status">{message}</span>
      {!!draft.seriesHistory?.length && (
        <details>
          <summary>Previous brief revisions ({draft.seriesHistory.length})</summary>
          <ul>{draft.seriesHistory.map((brief) => <li key={brief.revision}><strong>Revision {brief.revision}</strong> · {brief.audience} · {brief.format} · {catalog.styles[brief.style].label}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
