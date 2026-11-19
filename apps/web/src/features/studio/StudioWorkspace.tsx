import { type RefObject, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlus,
  Clapperboard,
  FileText,
  FolderOpen,
  Layers3,
  Rows3,
  Sparkles,
} from "lucide-react";
import {
  categories,
  createDraft,
  DraftEditor,
  listDrafts,
  projectName,
  stages,
  type Category,
  type StudioDraft,
} from "./drafts";
import {
  catalog,
  exportDraft,
  selectedTools,
  starterOptions,
  stepNames,
  styleDescriptions,
  styleNames,
} from "./guide";
import "./studio.css";

export interface StudioAgentRequest {
  workspaceId: string;
  projectId: string;
  stepId: string;
  prompt: string;
  signal: AbortSignal;
}
interface Props {
  workspaceId: string;
  onAskAgent?: (request: StudioAgentRequest) => Promise<void>;
  activeEditor?: RefObject<DraftEditor | null>;
}

const icons = { blank: Layers3, "digital-product": BookOpen, video: Clapperboard };

function Artwork({ kind }: { kind: Category }) {
  return (
    <div className={"ops-art ops-art-" + kind} aria-hidden="true">
      <div className="ops-print">
        <i />
        <b />
        <em />
      </div>
    </div>
  );
}

function Workspace({ workspaceId, onAskAgent, activeEditor }: Props) {
  const [projects, setProjects] = useState<StudioDraft[]>([]);
  const [editor, setEditor] = useState<DraftEditor | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [showChooser, setShowChooser] = useState(false);
  useLayoutEffect(() => {
    if (!activeEditor) return;
    activeEditor.current = editor;
    return () => { activeEditor.current = null; };
  }, [activeEditor, editor]);
  useEffect(() => {
    let current = true;
    void listDrafts(workspaceId)
      .then((saved) => {
        if (current) {
          setProjects(saved);
          setError("");
        }
      })
      .catch(() => {
        if (current) setError("Local project storage could not be opened.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [workspaceId, retry]);
  function start(category: Category) {
    const next = new DraftEditor(createDraft(workspaceId, category));
    setEditor(next);
    void next.flush();
  }
  async function home() {
    if (editor) {
      await editor.flush();
      const view = editor.snapshot();
      if (view.status !== "saved") return;
    }
    setEditor(null);
    setShowChooser(false);
    setLoading(true);
    setRetry((n) => n + 1);
  }
  if (editor)
    return (
      <Builder
        editor={editor}
        onHome={home}
        onAskAgent={onAskAgent}
        onDiscard={() => {
          setEditor(null);
          setShowChooser(false);
          setLoading(true);
          setRetry((n) => n + 1);
        }}
      />
    );
  const choosing = projects.length === 0 || showChooser;
  return (
    <section className="ops-workspace" aria-label="Open Product Studio">
      <div className="ops-wrap">
        <header className="ops-header">
          <span className="ops-identity">
            <Layers3 size={18} /> Open Product Studio
          </span>
          <span className="ops-location">
            <span className="ops-dot" /> Local workspace
          </span>
        </header>
        <div className="ops-hero">
          <div>
            <h1>{choosing ? "New project" : "Your projects"}</h1>
            <p>
              {choosing
                ? "Choose a starting point for your next project."
                : "Pick up your work where you left off."}
            </p>
          </div>
          {projects.length > 0 && (
            <button
              type="button"
              className="ops-button"
              onClick={() => setShowChooser(!showChooser)}
            >
              {choosing ? <Rows3 size={16} /> : <CirclePlus size={16} />}
              {choosing ? "All projects" : "New project"}
            </button>
          )}
        </div>
        {error && (
          <div className="ops-notice" role="alert">
            {error}
            <button className="ops-link" onClick={() => setRetry((n) => n + 1)}>
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <p role="status">Opening workspace…</p>
        ) : choosing ? (
          <div className="ops-choices">
            {categories.map(({ id, label, description }) => (
              <button
                type="button"
                className="ops-choice"
                key={id}
                onClick={() => start(id)}
                disabled={!!error}
              >
                <Artwork kind={id} />
                <div className="ops-choice-body">
                  <div>
                    <h2>{label}</h2>
                    <ArrowRight size={18} />
                  </div>
                  <p>{description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="ops-projects">
            {projects.map((project) => {
              const Icon = icons[project.category];
              return (
                <button
                  className="ops-project"
                  key={project.id}
                  onClick={() => setEditor(new DraftEditor(project))}
                >
                  <span className={"ops-icon ops-icon-" + project.category}>
                    <Icon size={22} />
                  </span>
                  <span>
                    <strong>{projectName(project)}</strong>
                    <small>
                      {categories.find((c) => c.id === project.category)?.label} ·{" "}
                      {stepNames[project.stage]}
                    </small>
                  </span>
                  <span className="ops-date">
                    {new Date(project.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function StudioWorkspace(props: Props) {
  // A workspace switch unmounts every editor and transient status before reading the next namespace.
  return <Workspace key={props.workspaceId} {...props} />;
}

type BuilderProps = {
  editor: DraftEditor;
  onHome: () => Promise<void>;
  onDiscard: () => void;
  onAskAgent: Props["onAskAgent"];
};
function Builder({ editor, onHome, onDiscard, onAskAgent }: BuilderProps) {
  const { draft, status } = useSyncExternalStore(
    editor.subscribe,
    editor.snapshot,
    editor.snapshot,
  );
  const route = stages[draft.category];
  const index = route.indexOf(draft.stage);
  const [motion, setMotion] = useState<{ from: string; direction: "forward" | "back" } | null>(
    null,
  );
  const [agentState, setAgentState] = useState<"idle" | "busy" | "sent" | "error" | "unsaved">(
    "idle",
  );
  const [confirmLeave, setConfirmLeave] = useState(false);
  const activePanel = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLElement>(null);
  const first = useRef(true);
  const agentRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!first.current) {
      activePanel.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      scroll.current?.scrollTo({ top: 0, behavior: "instant" });
    }
    first.current = false;
    setAgentState("idle");
    return () => {
      agentRequest.current?.abort();
      agentRequest.current = null;
    };
  }, [draft.stage, draft.category]);
  useEffect(() => {
    if (motion === null) return;
    // Also clean up if the user enables reduced motion during the transition.
    const timer = window.setTimeout(() => setMotion(null), 200);
    return () => window.clearTimeout(timer);
  }, [motion]);
  function navigate(to: number) {
    if (to < 0 || to >= route.length || to === index) return;
    agentRequest.current?.abort();
    setMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? null
      : { from: draft.stage, direction: to > index ? "forward" : "back" });
    editor.update({ stage: route[to]! });
  }
  function writeField(key: string, value: string) {
    editor.update({ fields: { ...editor.snapshot().draft.fields, [key]: value } });
  }
  async function askAgent() {
    if (!onAskAgent || agentRequest.current) return;
    const request = new AbortController();
    agentRequest.current = request;
    setAgentState("busy");
    const prompt = [
      "Suggest three options for this Studio project step. Explain one tradeoff per option. Reply with suggestions only.",
      JSON.stringify({
        category: draft.category,
        step: draft.stage,
        title: draft.title,
        brief: draft.fields.brief ?? "",
        audience: draft.fields.audience ?? "",
        ...(draft.category === "video" ? { style: catalog.styles[draft.style].label } : {}),
      }),
    ].join("\n");
    try {
      await editor.flush();
      if (request.signal.aborted) return;
      if (editor.snapshot().status !== "saved") {
        setAgentState("unsaved");
        return;
      }
      await onAskAgent({
        workspaceId: draft.workspaceId,
        projectId: draft.id,
        stepId: draft.stage,
        prompt,
        signal: request.signal,
      });
      if (!request.signal.aborted) setAgentState("sent");
    } catch (error) {
      if (!request.signal.aborted) {
        setAgentState(error instanceof Error && error.name === "AbortError" ? "idle" : "error");
      }
    } finally {
      if (agentRequest.current === request) agentRequest.current = null;
    }
  }
  const statusLabel = {
    saved: "Saved on this device",
    saving: "Saving…",
    conflict: "Newer copy in another window",
    error: "Could not save on this device",
  }[status];
  const failed = status === "error" || status === "conflict";
  function leaveProject() {
    agentRequest.current?.abort();
    agentRequest.current = null;
    setAgentState("idle");
    if (failed) setConfirmLeave(true);
    else void onHome();
  }
  return (
    <section className="ops-workspace" ref={scroll} aria-label="Studio project builder">
      <div className="ops-wrap">
        <header className="ops-header">
          <button type="button" className="ops-link ops-identity" onClick={leaveProject}>
            <ArrowLeft size={17} /> Projects
          </button>
          <span className="ops-location" role="status">
            <span className={"ops-dot" + (failed ? " ops-dot-error" : "")} />
            {statusLabel}
          </span>
        </header>
        {failed && (
          <div className="ops-notice" role="alert">
            <span>
              {status === "conflict"
                ? "A newer draft exists. Export your edits before reopening the saved copy."
                : "Your edits are in this window. Retry saving or download a copy."}
            </span>
            <button className="ops-link" onClick={() => exportDraft(draft)}>
              Download draft
            </button>
            {status === "error" && (
              <button className="ops-link" onClick={() => void editor.flush()}>
                Retry save
              </button>
            )}
            {confirmLeave && (
              <button className="ops-link" onClick={onDiscard}>
                Leave without these edits
              </button>
            )}
          </div>
        )}
        <div className="ops-project-head">
          <span className="ops-location">
            {categories.find((c) => c.id === draft.category)?.label} project
          </span>
          <input
            aria-label="Project name"
            className="ops-title"
            value={draft.title}
            maxLength={120}
            placeholder={projectName(draft)}
            onChange={(e) => editor.update({ title: e.target.value })}
          />
        </div>
        {route.length > 1 && (
          <div className="ops-progress">
            <label>
              <span>
                Step {index + 1} of {route.length}
              </span>
              <select
                aria-label="Go to step"
                value={index}
                onChange={(e) => navigate(Number(e.target.value))}
              >
                {route.map((stage, i) => (
                  <option value={i} key={stage}>
                    {stepNames[stage]}
                  </option>
                ))}
              </select>
            </label>
            <div className="ops-meter" aria-hidden="true">
              {route.map((id, i) => (
                <i key={id} className={i <= index ? "on" : ""} />
              ))}
            </div>
          </div>
        )}
        <div className="ops-sheet">
          <div className="ops-slide-window" data-direction={motion?.direction}>
            {motion && (
              <div
                key={"old-" + motion.from}
                className="ops-panel ops-leaving"
                inert
                aria-hidden="true"
              >
                <Step stage={motion.from} draft={draft} editor={editor} writeField={writeField} />
              </div>
            )}
            <div
              key={draft.stage}
              className={"ops-panel" + (motion ? " ops-entering" : "")}
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget && event.animationName === "ops-in") setMotion(null);
              }}
              ref={activePanel}
            >
              <Step stage={draft.stage} draft={draft} editor={editor} writeField={writeField} />
              {onAskAgent && (
                <div className="ops-agent">
                  <button
                    className="ops-button"
                    disabled={agentState === "busy"}
                    onClick={() => void askAgent()}
                  >
                    <Sparkles size={16} />
                    {agentState === "busy" ? "Preparing agent request…" : "Ask agent for options"}
                  </button>
                  <small>Includes the project name, brief, audience and current step.</small>
                  <span role="status">
                    {agentState === "unsaved"
                      ? "Save or reopen your draft before asking the agent."
                      : agentState === "error"
                        ? "The agent request could not be opened."
                        : agentState === "sent"
                          ? "Agent request opened."
                          : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
          {route.length > 1 && (
            <footer className="ops-footer">
              <button
                className="ops-button"
                disabled={index === 0}
                onClick={() => navigate(index - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              {index < route.length - 1 ? (
                <button className="ops-button ops-primary" onClick={() => navigate(index + 1)}>
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button className="ops-button ops-primary" onClick={leaveProject}>
                  All projects <FolderOpen size={16} />
                </button>
              )}
            </footer>
          )}
        </div>
      </div>
    </section>
  );
}

type StepProps = {
  stage: string;
  draft: StudioDraft;
  editor: DraftEditor;
  writeField: (key: string, value: string) => void;
};
function Heading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="ops-step-head">
      <h2 tabIndex={-1}>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}
function Step({ stage, draft, editor, writeField }: StepProps) {
  function field(key: string, label: string, placeholder: string, rows = 3) {
    return (
      <label className="ops-field">
        <span>{label}</span>
        <textarea
          aria-label={label}
          value={draft.fields[key] ?? ""}
          rows={rows}
          placeholder={placeholder}
          maxLength={120_000}
          onChange={(e) => writeField(key, e.target.value)}
        />
      </label>
    );
  }
  if (stage === "notes")
    return (
      <>
        <Heading
          title="A place to start"
          detail="Keep notes here, or open a guide when you know what you want to make."
        />
        {field("notes", "Project notes", "An idea, a reference, a question…", 6)}
        <div className="ops-actions">
          <button
            className="ops-button"
            onClick={() =>
              editor.update({
                category: "digital-product",
                stage: "format",
                fields: { ...draft.fields, format: "Ebook" },
              })
            }
          >
            <BookOpen size={16} /> Plan a digital product
          </button>
          <button
            className="ops-button"
            onClick={() => editor.update({ category: "video", stage: "style" })}
          >
            <Clapperboard size={16} /> Plan a video
          </button>
          <button className="ops-link" onClick={() => exportDraft(draft)}>
            <ArrowDownToLine size={15} /> Download notes
          </button>
        </div>
      </>
    );
  if (stage === "style")
    return (
      <>
        <Heading
          title="Choose a visual style"
          detail="Your style determines which tools and assets appear in the next step."
        />
        <div className="ops-style-options">
          {styleNames.map((style) => (
            <button
              key={style}
              aria-pressed={draft.style === style}
              className="ops-style"
              onClick={() => {
                if (style !== draft.style) {
                  const chosen = catalog.styles[style];
                  const supported = new Set([
                    ...chosen.optional,
                    ...chosen.required.flatMap((slot) => slot.chooseOne),
                  ]);
                  editor.update({
                    style,
                    tools: draft.tools.filter((tool) => supported.has(tool)),
                  });
                }
              }}
            >
              <span className={"ops-swatch swatch-" + style} aria-hidden="true">
                <i />
                <b />
              </span>
              <span>
                <strong>{catalog.styles[style].label}</strong>
                <small>{styleDescriptions[style]}</small>
              </span>
              <span className="ops-select-mark">
                {draft.style === style && <Check size={13} />}
              </span>
            </button>
          ))}
        </div>
      </>
    );
  if (stage === "prepare") {
    const style = catalog.styles[draft.style];
    const chosen = selectedTools(draft);
    return (
      <>
        <Heading
          title="Plan your tools"
          detail={
            "Choose the resources for " +
            style.label.toLowerCase() +
            ". This checklist saves preferences only."
          }
        />
        {style.required.map((slot) => (
          <label className="ops-field" key={slot.need}>
            <span>{slot.need}</span>
            <select
              aria-label={slot.need}
              value={slot.chooseOne.find((id) => chosen.includes(id))}
              onChange={(e) =>
                editor.update({
                  tools: [
                    ...draft.tools.filter((id) => !slot.chooseOne.includes(id)),
                    e.target.value,
                  ],
                })
              }
            >
              {slot.chooseOne.map((id) => (
                <option value={id} key={id}>
                  {catalog.stackEntries[id]!.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <fieldset className="ops-tools">
          <legend>Optional tools</legend>
          {style.optional.map((id) => {
            const tool = catalog.stackEntries[id]!;
            return (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={chosen.includes(id)}
                  onChange={(e) =>
                    editor.update({
                      tools: e.target.checked
                        ? [...draft.tools, id]
                        : draft.tools.filter((t) => t !== id),
                    })
                  }
                />
                <span>
                  {tool.label}
                  <small>
                    {tool.kind.toUpperCase()} · {tool.cost.replaceAll("-", " ")}
                  </small>
                </span>
              </label>
            );
          })}
        </fieldset>
      </>
    );
  }
  if (stage === "format")
    return (
      <>
        <Heading
          title="Choose a format"
          detail="Pick the shape of your first draft. You can change it as the idea develops."
        />
        <div className="ops-pills">
          {["Ebook", "Workbook", "Template kit", "Curriculum", "Action plan"].map((format) => (
            <button
              className="ops-button"
              aria-pressed={(draft.fields.format ?? "Ebook") === format}
              key={format}
              onClick={() => writeField("format", format)}
            >
              {format}
            </button>
          ))}
        </div>
      </>
    );
  if (stage === "brief")
    return (
      <>
        <Heading
          title="Shape your brief"
          detail="Start with one audience and the outcome you want for them."
        />
        {field("brief", "What will you make?", "Describe the idea in a sentence or two.")}
        {field("audience", "Who is it for?", "Describe your viewer or reader.", 2)}
        {field("notes", "Project notes", "Keep references and constraints here.", 2)}
        <h3 className="ops-subhead">Starter suggestions</h3>
        <div className="ops-suggestions">
          {starterOptions(draft).map((starter) => (
            <div key={starter.title}>
              <strong>{starter.title}</strong>
              <p>{starter.reason}</p>
              <small>{starter.brief}</small>
              <button
                className="ops-link"
                disabled={draft.fields.brief?.includes(starter.brief)}
                onClick={() =>
                  writeField(
                    "brief",
                    [draft.fields.brief?.trim(), starter.brief].filter(Boolean).join("\n\n"),
                  )
                }
              >
                Add to brief <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  if (stage === "outline" || stage === "draft")
    return (
      <>
        <Heading
          title={stage === "outline" ? "Map the structure" : "Write your manuscript"}
          detail={
            stage === "outline"
              ? "Give each section a job in the reader’s journey."
              : "Use your outline as a reference while you write."
          }
        />
        <Reference
          label={stage === "outline" ? "Project brief" : "Outline"}
          value={draft.fields[stage === "outline" ? "brief" : "outline"]}
        />
        {field(
          stage,
          stage === "outline" ? "Section outline" : "Manuscript",
          stage === "outline" ? "One section per line…" : "Start writing here…",
          8,
        )}
      </>
    );
  if (stage === "storyboard")
    return (
      <>
        <Heading
          title="Build your storyboard"
          detail="Write the narration, then list the shots in the order your viewer will see them."
        />
        <Reference label="Project brief" value={draft.fields.brief} />
        {field("script", "Script", "What will be said or shown?", 4)}
        {field("shots", "Shot list", "One shot per line. These become your storyboard preview.", 4)}
      </>
    );
  if (stage === "assets")
    return (
      <>
        <Heading
          title="Plan the materials"
          detail="Record the visuals, sound and source permissions you need for each shot."
        />
        <Reference label="Shot list" value={draft.fields.shots} />
        {field(
          "assets",
          "Asset and attribution notes",
          "Source, owner, permission and the shot where it belongs…",
          5,
        )}
        {field("audio", "Voice and sound cues", "Describe your recording or planned narration…")}
      </>
    );
  if (stage === "render") {
    const shots = (draft.fields.shots ?? "").split("\n").filter((s) => s.trim());
    return (
      <>
        <Heading
          title="Preview the storyboard"
          detail="This text preview uses your saved shot list. Video rendering is planned for M4A."
        />
        {shots.length > 0 ? (
          <ol className="ops-shot-list">
            {shots.map((shot, i) => (
              <li key={i}>
                <span>Shot {i + 1}</span>
                <p>{shot}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="ops-note">Add shots in the Storyboard step to see them here.</p>
        )}
      </>
    );
  }
  if (stage === "review")
    return (
      <>
        <Heading
          title="Review the plan"
          detail="Check framing, caption readability, audio and rights before production."
        />
        <Reference label="Script" value={draft.fields.script} />
        {field(
          "review",
          "Review notes",
          "What needs to change? Which approvals are still needed?",
          5,
        )}
      </>
    );
  if (stage === "publish")
    return (
      <>
        <Heading
          title="Prepare a post"
          detail="Draft the caption for a manual handoff. Connected social publishing is planned for M4C."
        />
        {field("caption", "Post caption", "Write the copy for your chosen audience.", 5)}
        <button className="ops-button" onClick={() => exportDraft(draft)}>
          <ArrowDownToLine size={16} /> Download updated draft
        </button>
      </>
    );
  return (
    <>
      <Heading
        title="Export your working draft"
        detail="Download the editable project content and planning choices as a JSON file."
      />
      <div className="ops-export">
        <FileText size={30} />
        <div>
          <strong>{projectName(draft)}</strong>
          <small>Studio working draft · JSON</small>
        </div>
      </div>
      <button className="ops-button ops-primary" onClick={() => exportDraft(draft)}>
        <ArrowDownToLine size={16} /> Download draft
      </button>
    </>
  );
}

function Reference({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null;
  return (
    <details className="ops-reference">
      <summary>{label}</summary>
      <p>{value}</p>
    </details>
  );
}
