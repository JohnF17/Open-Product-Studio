import { ChevronDown, Film, PersonStanding, Plus } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import type { DraftEditor, StudioDraft, VideoStyle } from "./drafts";
import { EpisodeBriefUpdate } from "./EpisodeBriefUpdate";
import { catalog } from "./guide";
import { createSeriesEpisode, reviseSeriesBrief } from "./videoSeries";
import { compatibleVideoTools } from "./videoToolSelection";
import "./videoSeriesBrief.css";

function StyleRow({ style, detail }: { style: VideoStyle; detail: string }) {
  return (
    <p className="ops-series-style">
      <span className={`ops-swatch swatch-${style}`} aria-hidden="true">
        {style === "stick-figure-explainer" && <PersonStanding strokeWidth={1.5} />}
      </span>
      {catalog.styles[style].label}
      <small>{detail}</small>
    </p>
  );
}

export function VideoSeriesBriefPanel({ draft, editor, onCreateVideoProject }: {
  draft: StudioDraft;
  editor: DraftEditor;
  onCreateVideoProject: (episode: StudioDraft) => void;
}) {
  const brief = draft.seriesBrief;
  const audience = draft.fields.seriesDraftAudience ?? brief?.audience ?? "";
  const format = draft.fields.seriesDraftFormat ?? brief?.format ?? "";
  const [title, setTitle] = useState("");
  const opening = useRef(false);
  const { status } = useSyncExternalStore(editor.subscribe, editor.snapshot, editor.snapshot);
  const ready = status === "saved";
  const episode = !!brief && !draft.seriesBriefOwner;
  const changed = audience.trim() !== brief?.audience || format.trim() !== brief?.format || draft.style !== brief?.style;
  const canSave = ready && !episode && changed && !!audience.trim() && !!format.trim();
  const canStart = ready && !!brief && !!draft.seriesBriefOwner && !changed && !!title.trim();

  function saveBrief() {
    if (!canSave || editor.snapshot().status !== "saved") return;
    const next = reviseSeriesBrief(brief, audience, format, draft.style);
    const fields = { ...editor.snapshot().draft.fields };
    delete fields.seriesDraftAudience;
    delete fields.seriesDraftFormat;
    editor.update({ fields, seriesBrief: next, seriesBriefOwner: true,
      seriesHistory: brief ? [...(draft.seriesHistory ?? []), brief] : undefined });
  }

  function editSeriesField(key: "seriesDraftAudience" | "seriesDraftFormat", text: string) {
    editor.update({ fields: { ...editor.snapshot().draft.fields, [key]: text } });
  }

  function startEpisode() {
    if (!canStart || opening.current || !brief || editor.snapshot().status !== "saved") return;
    opening.current = true;
    onCreateVideoProject(createSeriesEpisode(draft.workspaceId, brief, title.trim()));
  }

  function resetChoices() {
    if (!episode || !brief) return;
    const fields = { ...editor.snapshot().draft.fields };
    delete fields.audience;
    delete fields.seriesFormat;
    delete fields.seriesStyleOverride;
    editor.update({ fields, style: brief.style, tools: compatibleVideoTools(draft.tools, brief.style) });
  }

  function startIndependentSeries() {
    if (!episode || !brief || !draft.restoredCopy || opening.current || editor.snapshot().status !== "saved") return;
    const audienceText = (draft.fields.audience ?? brief.audience).trim();
    const formatText = (draft.fields.seriesFormat ?? brief.format).trim();
    if (!audienceText || !formatText) return;
    const next = reviseSeriesBrief(undefined, audienceText, formatText, draft.style);
    opening.current = true;
    const source = createSeriesEpisode(draft.workspaceId, next, (draft.title.trim() || "Video") + " — series");
    onCreateVideoProject({ ...source, seriesBriefOwner: true });
  }

  function episodeField(key: "audience" | "seriesFormat", label: string, inherited: string) {
    return (
      <label className="ops-field">
        <span>{label} <small>{draft.fields[key] === undefined ? "Inherited" : "Episode override"}</small></span>
        <textarea
          aria-label={label}
          rows={2}
          value={draft.fields[key] ?? inherited}
          onChange={(event) => editor.update({
            fields: { ...editor.snapshot().draft.fields, [key]: event.currentTarget.value },
          })}
        />
      </label>
    );
  }
  const hasOverrides = ["audience", "seriesFormat", "seriesStyleOverride"].some((key) => Object.hasOwn(draft.fields, key)) ||
    (!!brief && draft.style !== brief.style);

  return (
    <details className="ops-series" open={brief || audience || format ? true : undefined}>
      <summary>
        <span className="ops-series-icon"><Film size={20} aria-hidden="true" /></span>
        <span>{brief ? "Series brief" : "Series brief (optional)"}</span>
        {brief && <small>{episode ? "Pinned revision" : "Revision"} {brief.revision}</small>}
        <ChevronDown className="ops-series-chevron" size={17} aria-hidden="true" />
      </summary>
      {episode && brief ? (
        <div className="ops-series-body">
          <p>This episode starts with the choices below. Edit a value to change this episode only.</p>
          <div className="ops-series-fields">
            {episodeField("audience", "Who is it for?", brief.audience)}
            {episodeField("seriesFormat", "Episode format", brief.format)}
          </div>
          <StyleRow style={draft.style} detail={draft.fields.seriesStyleOverride !== undefined || draft.style !== brief.style ? "Episode override" : "Inherited style"} />
          <button type="button" className="ops-link" aria-disabled={!hasOverrides}
            onClick={() => { if (hasOverrides) resetChoices(); }}>Use series choices</button>
          <EpisodeBriefUpdate draft={draft} editor={editor} />
          {!!draft.restoredCopy && <div className="ops-series-fork">
            <p>Start a new project with this audience, format and style. Your restored project keeps its notes and previous revisions.</p>
            {(draft.fields.seriesDraftAudience !== undefined || draft.fields.seriesDraftFormat !== undefined) &&
              <p>Unpublished source edits from the backup: {audience || "No audience entered"} · {format || "No format entered"}</p>}
            <button type="button" className="ops-button" onClick={startIndependentSeries}
              disabled={!ready || !(draft.fields.audience ?? brief.audience).trim() || !(draft.fields.seriesFormat ?? brief.format).trim()}>
              Start independent series
            </button>
          </div>}
        </div>
      ) : (
        <div className="ops-series-body">
          <p>Reuse an audience, format and visual style across videos. Each episode opens as a new local project with its own script and notes.</p>
          <div className="ops-series-fields">
            <label className="ops-field"><span>Series audience</span>
              <textarea rows={2} placeholder="Who comes back for each episode?" value={audience} onChange={(event) => editSeriesField("seriesDraftAudience", event.currentTarget.value)} />
            </label>
            <label className="ops-field"><span>Series format</span>
              <textarea rows={2} placeholder="One technique in 30 seconds" value={format} onChange={(event) => editSeriesField("seriesDraftFormat", event.currentTarget.value)} />
            </label>
          </div>
          <StyleRow style={draft.style} detail="From the Style step" />
          <div className="ops-actions">
            <button type="button" className="ops-button" aria-disabled={!canSave} onClick={saveBrief}>
              {brief ? "Save new revision" : "Save series brief"}
            </button>
            {changed && (audience.length > 0 || format.length > 0) && <small>Draft changes are private until you save a brief revision for new episodes.</small>}
          </div>
          {!!draft.seriesHistory?.length && <details><summary>Previous source revisions ({draft.seriesHistory.length})</summary>
            <ul>{draft.seriesHistory.map((item) => <li key={item.revision}>Revision {item.revision} · {item.audience} · {item.format} · {catalog.styles[item.style].label}</li>)}</ul>
          </details>}
          {brief && <div className="ops-series-start">
            <label className="ops-field"><span>Episode title</span>
              <input value={title} maxLength={120} placeholder="Name your next video" onChange={(event) => setTitle(event.currentTarget.value)} />
            </label>
            <button type="button" className="ops-button ops-primary" disabled={!canStart} onClick={startEpisode}>
              <Plus size={16} aria-hidden="true" /> Start episode
            </button>
          </div>}
        </div>
      )}
    </details>
  );
}
