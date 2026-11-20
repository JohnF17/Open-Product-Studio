/* oxlint-disable shadcn/no-unknown-classes -- Studio tutorial styles are defined in tutorialProduction.css and studio.css. */
import { T, useGT } from "gt-react";
import { Download, FileUp, Plus } from "lucide-react";
import { useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { randomUUID } from "../../lib/randomUUID";
import { type DraftEditor, type StudioDraft, projectName } from "./drafts";
import { downloadStudioFile } from "./guide";
import { TutorialPreview, type TutorialSource } from "./TutorialPreview";
import { TutorialProposalReview } from "./TutorialProposalReview";
import { TutorialRenderPanel } from "./TutorialRenderPanel";
import { TutorialShotEditor } from "./TutorialShotEditor";
import { TutorialSources } from "./TutorialSources";
import {
  readTutorialDraft,
  readTutorialProposal,
  tutorialFrames,
  tutorialMaxJsonLength,
  tutorialMaxScenes,
  tutorialPlanDuration,
  tutorialPlanField,
  tutorialPlanIssue,
  tutorialProposalField,
  tutorialSchema,
  type TutorialPlan,
  type TutorialScene,
} from "./tutorialPlanSchema";
import "./tutorialProduction.css";

function getPlan(draft: StudioDraft): TutorialPlan {
  return (
    readTutorialDraft(draft.fields[tutorialPlanField]) ?? {
      schema: tutorialSchema,
      title: projectName(draft).slice(0, 120),
      scenes: [],
    }
  );
}

function TutorialPlanDownload({ content }: { content: string | null }) {
  return (
    <button
      type="button"
      className="ops-button"
      disabled={!content}
      onClick={() => {
        if (content)
          downloadStudioFile(
            new Blob([content, "\n"], { type: "application/json" }),
            "tutorial",
            ".json",
          );
      }}
    >
      <Download size={16} aria-hidden="true" />
      <T>Download production plan</T>
    </button>
  );
}

function TutorialCommand({ ids }: { ids: string[] }) {
  return (
    <details className="ops-tutorial-handoff">
      <summary>
        <T>Render with the local CLI</T>
      </summary>
      <p>
        <T>
          Download the reviewed plan as tutorial.json. In a separate assets.json, map each source ID
          to its local recording path.
        </T>
      </p>
      <pre>
        {JSON.stringify(
          Object.fromEntries(ids.map((id) => [id, "<local recording path>"])),
          null,
          2,
        )}
      </pre>
      <p>
        <T>
          Run this command from the Studio source checkout with FFmpeg available. Enter an installed
          Windows voice name in place of the placeholder.
        </T>
      </p>
      <pre>
        {
          'node tools/studio-media/cli.mjs render --project tutorial.json --assets assets.json --output tutorial.mp4 --voice "<installed Windows voice>"'
        }
      </pre>
      <p>
        <T>
          To use prerecorded narration, replace the voice option with --audio followed by a WAV for
          the full timeline.
        </T>
      </p>
    </details>
  );
}

export function TutorialProductionExport({ draft }: { draft: StudioDraft }) {
  const gt = useGT();
  const [review, setReview] = useState("");
  const plan = readTutorialProposal(draft.fields[tutorialPlanField]);
  if (!plan) return null;
  const content = JSON.stringify(plan, null, 2);
  return (
    <section className="ops-tutorial-finish" aria-label={gt("Tutorial production plan")}>
      <h3>
        <T>Tutorial production plan</T>
      </h3>
      <p>
        <T>Check the shots on Preview before sharing this plan for local production.</T>
      </p>
      <label className="ops-tutorial-check">
        <input
          type="checkbox"
          checked={review === content}
          onChange={(event) => setReview(event.currentTarget.checked ? content : "")}
        />
        <T>I reviewed this production plan</T>
      </label>
      <TutorialPlanDownload content={review === content ? content : null} />
      <TutorialCommand ids={[...new Set(plan.scenes.map((scene) => scene.source))]} />
    </section>
  );
}

export type TutorialRecordings = Map<string, TutorialSource>;

export function TutorialProduction({
  draft,
  editor,
  sources,
  setSources,
}: {
  draft: StudioDraft;
  editor: DraftEditor;
  sources: TutorialRecordings;
  setSources: Dispatch<SetStateAction<TutorialRecordings>>;
}) {
  const gt = useGT();
  const prefix = useId();
  const importRequest = useRef(0);
  const [activeId, setActiveId] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [proposalInput, setProposalInput] = useState<{ raw: string; plan: TutorialPlan } | null>(
    null,
  );
  const [importError, setImportError] = useState(false);
  const [review, setReview] = useState<{
    id: string;
    manifest: string;
    sources: typeof sources;
  } | null>(null);
  const plan = getPlan(draft);
  const assistantProposal = draft.fields[tutorialProposalField];
  const proposal = proposalInput?.plan ?? readTutorialProposal(assistantProposal);
  const issue = tutorialPlanIssue(plan);
  const content = issue ? null : JSON.stringify(plan, null, 2);
  const reviewed = !!content && review?.manifest === content && review.sources === sources;
  const required = [...new Set(plan.scenes.map((scene) => scene.source))];
  const ids = [
    ...new Set([...(required.length ? required : ["screen"]), ...sourceIds, ...sources.keys()]),
  ];
  const activeIndex = Math.max(
    0,
    plan.scenes.findIndex((scene) => scene.id === activeId),
  );
  const active = plan.scenes[activeIndex];
  const source = active && sources.get(active.source);
  const renderSources = Object.fromEntries(
    required.flatMap((id) => {
      const recording = sources.get(id);
      const fits =
        recording &&
        plan.scenes.every(
          (scene) =>
            scene.source !== id ||
            tutorialFrames(scene.end) <= tutorialFrames(recording.durationMs / 1000),
        );
      return fits ? [[id, recording.file]] : [];
    }),
  );

  function setSource(id: string, recording?: TutorialSource) {
    setSources((current) => {
      const next = new Map(current);
      if (recording) next.set(id, recording);
      else next.delete(id);
      return next;
    });
  }

  function save(next: TutorialPlan, clearProposal = false) {
    setReview(null);
    const fields: StudioDraft["fields"] = {
      ...editor.snapshot().draft.fields,
      [tutorialPlanField]: JSON.stringify(next),
    };
    if (clearProposal) delete fields[tutorialProposalField];
    editor.update({ fields });
  }

  function addShot() {
    const sourceId = ids[0]!;
    const id = randomUUID();
    const current = sources.get(sourceId);
    setActiveId(id);
    save({
      ...plan,
      scenes: [
        ...plan.scenes,
        {
          id,
          source: sourceId,
          start: 0,
          end: Math.min(2, current ? current.durationMs / 1000 : 2),
          narration: "",
          caption: "",
        },
      ],
    });
  }

  function changeShot(next: TutorialScene) {
    save({ ...plan, scenes: plan.scenes.map((scene) => (scene.id === next.id ? next : scene)) });
  }

  function moveShot(offset: -1 | 1) {
    if (!active) return;
    const scenes = plan.scenes.filter((scene) => scene.id !== active.id);
    scenes.splice(activeIndex + offset, 0, active);
    setActiveId(active.id);
    save({ ...plan, scenes });
  }

  function removeShot() {
    const scenes = plan.scenes.filter((scene) => scene.id !== active?.id);
    setActiveId(scenes[Math.min(activeIndex, scenes.length - 1)]?.id ?? "");
    save({ ...plan, scenes });
  }

  function previewProposal(raw: string) {
    const next = readTutorialProposal(raw);
    setProposalInput(next ? { raw, plan: next } : null);
    setImportError(!next);
  }

  async function importPlan(file: File) {
    const request = ++importRequest.current;
    let raw = "";
    try {
      if (file.size <= tutorialMaxJsonLength)
        raw = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      /* An unreadable file shows the same format guidance as an invalid proposal. */
    }
    if (request === importRequest.current) previewProposal(raw);
  }

  function dismissProposal() {
    if (proposalInput) setProposalInput(null);
    else {
      const fields = { ...editor.snapshot().draft.fields };
      delete fields[tutorialProposalField];
      editor.update({ fields });
    }
  }

  function applyProposal(chosen: TutorialScene[], replace: boolean) {
    if (!proposal || !chosen.length) return;
    const current = editor.snapshot().draft;
    if (!proposalInput && current.fields[tutorialProposalField] !== assistantProposal) return;
    const livePlan = getPlan(current);
    const prior = replace ? [] : livePlan.scenes;
    if (prior.length + chosen.length > tutorialMaxScenes) return;
    const occupied = new Set(prior.map((scene) => scene.id));
    const applied = chosen.map((scene) => {
      const id = occupied.has(scene.id) ? randomUUID() : scene.id;
      occupied.add(id);
      return { ...scene, id };
    });
    setActiveId(applied[0]!.id);
    save(
      {
        ...livePlan,
        title: prior.length ? livePlan.title : proposal.title,
        scenes: [...prior, ...applied],
      },
      !proposalInput,
    );
    setProposalInput(null);
  }

  return (
    <section className="ops-tutorial" aria-label={gt("Tutorial production")}>
      <div className="ops-tutorial-heading ops-tutorial-setup">
        <label className="ops-field">
          <span>
            <T>Tutorial title</T>
          </span>
          <input
            value={plan.title}
            maxLength={120}
            onChange={(event) => save({ ...plan, title: event.currentTarget.value })}
          />
        </label>
        <div className="ops-actions">
          <input
            id={`${prefix}-import`}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            aria-label={gt("Import production plan")}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void importPlan(file);
            }}
          />
          <label className="ops-button ops-tutorial-import" htmlFor={`${prefix}-import`}>
            <FileUp size={16} aria-hidden="true" />
            <T>Import production plan</T>
          </label>
        </div>
      </div>
      {importError && (
        <p role="alert" className="ops-tutorial-error">
          <T>Choose a valid studio-tutorial/1 JSON plan with source IDs and timed shots.</T>
        </p>
      )}
      {proposal && (
        <TutorialProposalReview
          key={proposalInput?.raw ?? assistantProposal}
          proposal={proposal}
          currentCount={plan.scenes.length}
          onApply={applyProposal}
          onDismiss={dismissProposal}
        />
      )}
      <div className="ops-tutorial-edit">
        <div className="ops-tutorial-view">
          <TutorialPreview
            key={JSON.stringify([
              active?.id,
              active?.source,
              active?.start,
              active?.end,
              active?.hold,
              source?.file.name,
              source?.file.lastModified,
            ])}
            scene={active}
            source={source}
          />
          <TutorialSources
            ids={ids}
            sources={sources}
            onAddSource={(id) => setSourceIds((existing) => [...existing, id])}
            onSource={setSource}
          />
        </div>
        <div className="ops-tutorial-cut">
          <section className="ops-tutorial-shots" aria-labelledby={`${prefix}-shots`}>
            <div className="ops-tutorial-heading">
              <div>
                <h3 id={`${prefix}-shots`}>
                  <T>Shot list</T>
                </h3>
                {plan.scenes.length > 0 && (
                  <small>
                    {gt("{duration}s total", {
                      duration: Number(tutorialPlanDuration(plan).toFixed(2)),
                    })}
                  </small>
                )}
              </div>
              <button
                type="button"
                className="ops-button"
                onClick={addShot}
                disabled={plan.scenes.length >= tutorialMaxScenes}
              >
                <Plus size={16} aria-hidden="true" />
                <T>Add shot</T>
              </button>
            </div>
            {plan.scenes.length ? (
              <ol>
                {plan.scenes.map((scene, index) => (
                  <li key={scene.id}>
                    <button
                      type="button"
                      aria-pressed={scene.id === active?.id}
                      aria-label={gt("Shot {number} {label}", {
                        number: index + 1,
                        label: scene.caption || scene.source,
                      })}
                      onClick={() => setActiveId(scene.id)}
                    >
                      <span className="ops-tutorial-shot-number">{index + 1}</span>
                      <span>
                        <strong>{scene.caption || scene.source}</strong>
                        <small>
                          {scene.source} · {scene.start}s–{scene.end}s
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                <T>Add a shot or import a plan to build your timeline.</T>
              </p>
            )}
          </section>
          {active && (
            <TutorialShotEditor
              key={active.id}
              scene={active}
              index={activeIndex}
              count={plan.scenes.length}
              sourceIds={ids}
              onChange={changeShot}
              onMove={moveShot}
              onRemove={removeShot}
            />
          )}
        </div>
      </div>
      <section className="ops-tutorial-finish" aria-labelledby={`${prefix}-finish`}>
        <h3 id={`${prefix}-finish`}>
          <T>Render and export</T>
        </h3>
        <p>
          <T>
            Check the order, framing, and wording before creating a local video. The plan file
            contains the edits and source IDs.
          </T>
        </p>
        {issue && (
          <p className="ops-tutorial-error">
            {issue === "empty"
              ? gt("Add a shot to start.")
              : issue === "title"
                ? gt("Enter a tutorial title on one line without braces or backslashes.")
                : issue === "duration"
                  ? gt("Keep the tutorial within 20 minutes.")
                  : gt("Complete each shot’s timing, narration and on-screen label to export.")}
          </p>
        )}
        <label className="ops-tutorial-check">
          <input
            type="checkbox"
            disabled={!content}
            checked={reviewed}
            onChange={(event) =>
              setReview(
                event.currentTarget.checked && content
                  ? { id: randomUUID(), manifest: content, sources }
                  : null,
              )
            }
          />
          <T>I reviewed this production plan</T>
        </label>
        <TutorialPlanDownload content={reviewed ? content : null} />
        <TutorialRenderPanel approval={reviewed ? review : null} sources={renderSources} />
        {content && <TutorialCommand ids={required} />}
      </section>
    </section>
  );
}
