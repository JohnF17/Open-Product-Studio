import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { T, useGT, useMessages, Var } from "gt-react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Cpu,
  SlidersHorizontal,
  ListPlus,
  Undo2,
  X,
} from "lucide-react";
import { randomUUID } from "../../lib/randomUUID";
import type { DraftEditor, StudioDraft } from "./drafts";
import type { BuilderAssistantBridge } from "./builderAssistantRoute";
import { BUILDER_ASSISTANT_MAX_PENDING } from "./builderAssistantRouteLimits";
import {
  applyBuilderAssistantPreview,
  builderAssistantSnapshotKey,
  createLocalBuilderSuggestion,
  getBuilderAssistantRecipe,
  parseBuilderAssistantResponse,
  prepareBuilderAssistantRequest,
  revertBuilderAssistantPreview,
  suggestedBuilderContext,
  BUILDER_ASSISTANT_MAX_CONTEXT_CHARS,
  type BuilderAssistantPreview,
  type BuilderAssistantRequest,
} from "./builderAssistantRecipes";
import { runDeviceAssistant, useDeviceAssistantAvailable } from "./builderDeviceAssistant";
import { BuilderToolSettings } from "./BuilderToolSettings";
import { draftWithOllama, tutorialDirectorSources, useOllamaChoice } from "./builderOllama";
import { getDefaultBuilderDraftRoute, useBuilderDraftRoute } from "./builderToolPreferences";
import styles from "./builderAssistant.module.css";

type Intent = "suggest" | "explain";
type RouteIdentity = { route: string; selectedRouteKey: string | undefined };
type RouteUi = {
  busy: boolean;
  notice: string;
  preview: BuilderAssistantPreview | null;
  originLabel: string;
  excluded: string[];
};
const emptyRouteUi: RouteUi = {
  busy: false,
  notice: "",
  preview: null,
  originLabel: "",
  excluded: [],
};
type Pending = {
  payload: BuilderAssistantRequest;
  binding: Parameters<BuilderAssistantBridge["open"]>[0];
  routeLabel: string;
};
// T3 navigation remounts Studio. Only this tab retains the short-lived, reviewed request.
const waiting = new Map<string, Pending>();

type Props = {
  draft: StudioDraft;
  editor: DraftEditor;
  artwork: ReactNode;
  bridge: BuilderAssistantBridge | undefined;
  onOpenProviderSettings: (() => void) | undefined;
  sourceRanges?: string | undefined;
};

export function BuilderAssistantPanel({
  draft,
  editor,
  artwork,
  bridge,
  onOpenProviderSettings,
  sourceRanges,
}: Props) {
  const gt = useGT();
  const m = useMessages();
  const recipe = getBuilderAssistantRecipe(draft);
  const deviceAvailable = useDeviceAssistantAvailable();
  const t3Available = !!bridge?.hasAvailableProviders && draft.category !== "day-trader";
  const preferred = getDefaultBuilderDraftRoute(draft.category, { t3Available, deviceAvailable });
  const route = useBuilderDraftRoute(draft.workspaceId, draft.category, preferred);
  const scope = JSON.stringify([draft.workspaceId, draft.id, draft.category, draft.stage]);
  const [pending, setPending] = useState<Pending | null>(() => waiting.get(scope) ?? null);
  const [section, setSection] = useState<Intent | "tools" | null>(() =>
    waiting.has(scope) ? "suggest" : null,
  );
  const [question, setQuestion] = useState("");
  const [undo, setUndo] = useState<BuilderAssistantPreview | null>(null);
  const [ollama] = useOllamaChoice(draft.workspaceId,draft.category);
  const selectedRouteKey = route === "ollama" ? (ollama ? JSON.stringify(ollama) : undefined) : bridge?.routeKey ?? undefined;
  const [routeIdentity, setRouteIdentity] = useState({ route, selectedRouteKey });
  if (routeIdentity.route !== route || routeIdentity.selectedRouteKey !== selectedRouteKey) {
    setRouteIdentity({ route, selectedRouteKey });
  }
  const [operation, setOperation] = useState<{ identity: RouteIdentity; ui: RouteUi } | null>(null);
  const { busy, notice, preview, originLabel, excluded } =
    operation?.identity === routeIdentity ? operation.ui : emptyRouteUi;
  const owner = useRef<{ identity: RouteIdentity; controller: AbortController } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const suggestButton = useRef<HTMLButtonElement | null>(null);
  const resultTitle = useRef<HTMLHeadingElement | null>(null);
  const undoButton = useRef<HTMLButtonElement | null>(null);
  const regionId = useId();
  const intent: Intent = section === "explain" ? "explain" : "suggest";
  const snapshotKey = preview || pending ? builderAssistantSnapshotKey(draft) : null;
  const routeLabel =
    route === "ollama" ? ollama?.name ?? gt("Choose a local model") : route === "t3"
      ? bridge?.routeLabel || gt("Choose a T3 model")
      : route === "device"
        ? gt("On-device AI")
        : gt("Local starter");
  const available =
    route === "ollama" ? !!ollama && draft.category !== "day-trader" : route === "t3"
      ? t3Available && !!selectedRouteKey
      : route === "device"
        ? deviceAvailable
        : true;
  const stale = preview !== null && preview.snapshotKey !== snapshotKey;
  const staleRequest = pending !== null && pending.payload.snapshotKey !== snapshotKey;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- cancels this route's active provider request on model changes and unmount
  useLayoutEffect(
    () => () => {
      const active = owner.current;
      if (active?.identity === routeIdentity) {
        owner.current = null;
        active.controller.abort();
      }
    },
    [routeIdentity],
  );
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- moves DOM focus after mounting the result heading or Undo control
  useLayoutEffect(() => {
    if (preview) resultTitle.current?.focus({ preventScroll: true });
    else if (undo) undoButton.current?.focus({ preventScroll: true });
  }, [preview, undo]);

  if (!recipe) return null;
  const context =
    section && section !== "tools" && route !== "local" ? suggestedBuilderContext(draft) : "";
  const request =
    route === "local" || section === null || section === "tools"
      ? null
      : prepareBuilderAssistantRequest(
          draft,
          question.trim() ||
            (intent === "explain" ? "Explain this step with a practical example." : ""),
          intent,
          route === "ollama" ? "ollama" : route === "device" ? "device" : "composer",
        );

  function updateRouteUi(patch: Partial<RouteUi>) {
    setOperation((previous) => ({
      identity: routeIdentity,
      ui: { ...(previous?.identity === routeIdentity ? previous.ui : emptyRouteUi), ...patch },
    }));
  }
  function setNotice(next: string) {
    updateRouteUi({ notice: next });
  }
  function stopWork() {
    const active = owner.current;
    owner.current = null;
    active?.controller.abort();
  }
  function showResult(
    result: BuilderAssistantPreview | null,
    origin = gt("Local starter · built into Studio"),
  ) {
    updateRouteUi({
      preview: result,
      originLabel: origin,
      excluded: [],
      notice: result
        ? ""
        : gt(
            "This reply could not be used for this step. Review the request or try a local starter.",
          ),
    });
  }

  function choose(next: Intent | "tools", button: HTMLButtonElement) {
    trigger.current = button;
    stopWork();
    updateRouteUi({ busy: false, preview: null, notice: "" });
    setSection(next);
    if (next !== "tools" && route === "local")
      showResult(createLocalBuilderSuggestion(editor.snapshot().draft, next));
  }
  function close() {
    stopWork();
    updateRouteUi({ busy: false });
    setSection(null);
    (trigger.current ?? suggestButton.current)?.focus();
  }
  function forgetPending() {
    waiting.delete(scope);
    setPending(null);
    resultTitle.current?.focus({ preventScroll: true });
  }
  async function work(task: (signal: AbortSignal) => Promise<void>) {
    if (owner.current) return;
    const controller = new AbortController();
    const active = { identity: routeIdentity, controller };
    owner.current = active;
    updateRouteUi({ busy: true, notice: "" });
    try {
      await task(controller.signal);
    } catch {
      if (!controller.signal.aborted)
        setNotice(
          gt(
            "The selected route could not finish. Check its connection, or choose a local starter.",
          ),
        );
    } finally {
      if (owner.current === active) {
        owner.current = null;
        updateRouteUi({ busy: false });
      }
    }
  }
  async function ask(signal: AbortSignal) {
    if (!request || !available) return;
    await editor.flush();
    signal.throwIfAborted();
    if (
      editor.snapshot().status !== "saved" ||
      builderAssistantSnapshotKey(editor.snapshot().draft) !== request.snapshotKey
    ) {
      setNotice(
        gt("The project changed or could not be saved. Review the current step before asking."),
      );
      return;
    }
    if (route === "ollama" && ollama && draft.category !== "day-trader") {
      const director = intent === "suggest" && draft.category === "video" && (draft.stage === "storyboard" || draft.stage === "render");
      const text = await draftWithOllama(ollama, request.prompt, signal, director ? tutorialDirectorSources(request.reviewedContext) : [], {
        summary:gt("Your local model selected the shots and wrote their narration."),
        nextStep:gt("Review the timing, framing and words in Preview."),
      }, request.writableKeys);
      signal.throwIfAborted();
      showResult(parseBuilderAssistantResponse(editor.snapshot().draft, request, text), ollama.name + " · " + ollama.digest.slice(0,12));
    } else if (route === "device") {
      const text = await runDeviceAssistant(request.prompt, signal);
      signal.throwIfAborted();
      showResult(
        parseBuilderAssistantResponse(editor.snapshot().draft, request, text),
        gt("On-device AI"),
      );
    } else if (bridge?.routeKey && route === "t3") {
      const binding = {
        projectId: draft.id,
        stage: draft.stage,
        requestId: randomUUID(),
        prompt: request.prompt,
        routeKey: bridge.routeKey,
      };
      const item = { payload: request, binding, routeLabel };
      waiting.delete(scope);
      if (waiting.size >= BUILDER_ASSISTANT_MAX_PENDING) {
        const oldest = waiting.keys().next().value;
        if (oldest !== undefined) waiting.delete(oldest);
      }
      waiting.set(scope, item);
      setPending(item);
      try {
        await bridge.open(binding, signal);
      } catch (error) {
        if (waiting.get(scope) === item) forgetPending();
        throw error;
      }
    }
  }
  async function readReply(signal: AbortSignal) {
    if (!pending || !bridge || staleRequest) return;
    const text = await bridge.read(pending.binding);
    signal.throwIfAborted();
    if (text === null) {
      setNotice(
        gt(
          "A matching completed reply is not available yet. Send the reviewed draft in T3, then return here.",
        ),
      );
      return;
    }
    showResult(
      parseBuilderAssistantResponse(editor.snapshot().draft, pending.payload, text),
      pending.routeLabel,
    );
    forgetPending();
  }
  function commit() {
    if (
      !preview ||
      stale ||
      editor.snapshot().status === "conflict" ||
      editor.snapshot().status === "error"
    )
      return;
    const selected = {
      ...preview,
      changes: preview.changes.filter(({ key }) => !excluded.includes(key)),
    };
    if (!selected.changes.length) return;
    const patch = applyBuilderAssistantPreview(editor.snapshot().draft, selected);
    if (!patch) {
      setNotice(gt("The step changed. Request a fresh suggestion."));
      return;
    }
    editor.update(patch);
    setUndo(selected);
    updateRouteUi({ preview: null, notice: gt("Selected changes applied to this draft.") });
  }
  function revert() {
    if (!undo) return;
    const patch = revertBuilderAssistantPreview(editor.snapshot().draft, undo);
    if (patch && editor.snapshot().status !== "conflict" && editor.snapshot().status !== "error") {
      editor.update(patch);
      setNotice(gt("Restored the previous values."));
    } else {
      setNotice(gt("The fields have changed since Apply. Your later edits are preserved."));
    }
    setUndo(null);
    (trigger.current ?? suggestButton.current)?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-label={gt("Step assistant")}
      className={styles["ops-assist"]}
      onKeyDown={(event) => {
        if (
          section &&
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !event.nativeEvent.isComposing &&
          !(event.target instanceof HTMLSelectElement) &&
          !(
            event.target instanceof Element &&
            event.target.closest('[role="dialog"],[role="menu"],[role="listbox"]')
          )
        ) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className={styles["ops-assist-bar"]}>
        <div className={styles["ops-assist-mark"]} aria-hidden="true">
          {artwork}
        </div>
        <div className={styles["ops-assist-name"]}>
          <strong>
            <T>Step assistant</T>
          </strong>
          <span>{routeLabel}</span>
        </div>
        <div className={styles["ops-assist-nav"]}>
          <button
            type="button"
            ref={suggestButton}
            aria-controls={regionId}
            aria-expanded={section === "suggest"}
            onClick={(event) => choose("suggest", event.currentTarget)}
          >
            <ListPlus size={15} /> <T>Suggest</T>
          </button>
          <button
            type="button"
            aria-controls={regionId}
            aria-expanded={section === "explain"}
            onClick={(event) => choose("explain", event.currentTarget)}
          >
            <BookOpen size={15} /> <T>Explain</T>
          </button>
          <button
            type="button"
            className={styles["ops-assist-setup"]}
            aria-label={gt("Tools and models")}
            aria-controls={regionId}
            aria-expanded={section === "tools"}
            onClick={(event) => choose("tools", event.currentTarget)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>
      {section && (
        <div className={styles["ops-assist-body"]} id={regionId}>
          <button
            type="button"
            className={styles["ops-assist-close"]}
            aria-label={gt("Close step assistant")}
            onClick={close}
          >
            <X size={15} />
          </button>
          {section === "tools" ? (
            <BuilderToolSettings
              expanded
              workspaceId={draft.workspaceId}
              category={draft.category}
              stage={draft.stage}
              t3Available={t3Available}
              deviceAvailable={deviceAvailable}
              availableSkills={bridge?.availableSkills}
              {...(onOpenProviderSettings && { onOpenProviderSettings })}
            />
          ) : (
            <>
              <h3 ref={resultTitle} tabIndex={-1}>
                {intent === "explain" ? gt("Understand this step") : m(recipe.actionLabel)}
              </h3>
              {pending && (
                <div>
                  <p>
                    {staleRequest
                      ? gt("This request belongs to an earlier version of the step.")
                      : gt("Your T3 request is ready to check.")}{" "}
                    <strong>{pending.routeLabel}</strong>
                  </p>
                  <div className={styles["ops-assist-actions"]}>
                    <button
                      type="button"
                      className={
                        // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                        "ops-button"
                      }
                      disabled={!bridge || staleRequest || busy}
                      onClick={() => void work(readReply)}
                    >
                      <T>Read completed reply</T>
                    </button>
                    <button
                      type="button"
                      className={
                        // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                        "ops-link"
                      }
                      disabled={busy}
                      onClick={forgetPending}
                    >
                      <T>Dismiss request</T>
                    </button>
                  </div>
                </div>
              )}
              {!pending &&
                !preview &&
                (route === "local" ? (
                  <>
                    <p>{m(recipe.explanation)}</p>
                    <button
                      type="button"
                      className={
                        // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                        "ops-button"
                      }
                      onClick={() => showResult(createLocalBuilderSuggestion(draft, intent))}
                    >
                      <T>Show local starter</T>
                    </button>
                  </>
                ) : (
                  <>
                    {route === "t3" && bridge && (
                      <div className={styles["ops-assist-model"]}>{bridge.selector}</div>
                    )}
                    <p>
                      {route === "ollama" ? gt("Runs with the exact installed model selected in Tools and models. Only the reviewed text is sent.") : route === "device"
                        ? gt("Uses the installed browser model on this device.")
                        : gt(
                            "Review and send the draft in T3. Your provider plan covers the turn or bills for usage. Your chat permission settings govern tool access. Studio accepts a text-only reply.",
                          )}
                    </p>
                    <label
                      className={
                        // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                        "ops-field"
                      }
                    >
                      <span>
                        {intent === "explain"
                          ? gt("What would you like explained?")
                          : gt("What should the suggestion help you do?")}
                      </span>
                      <textarea
                        rows={2}
                        maxLength={BUILDER_ASSISTANT_MAX_CONTEXT_CHARS}
                        value={question}
                        disabled={busy}
                        onChange={(e) => {
                          setQuestion(e.target.value);
                          setNotice("");
                        }}
                        placeholder={
                          intent === "explain"
                            ? gt("Explain the choices in plain language")
                            : gt("Optional direction or project details")
                        }
                      />
                    </label>
                    {intent === "suggest" && sourceRanges && (
                      <button type="button" disabled={busy || question.includes(sourceRanges) || (question.length + sourceRanges.length + 1 > BUILDER_ASSISTANT_MAX_CONTEXT_CHARS)}
                        onClick={() => setQuestion(current => (current.trim() + "\n" + sourceRanges).trim())}>
                        <T>Include attached footage times</T>
                      </button>
                    )}
                    {context && (
                      <button
                        type="button"
                        className={
                          // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                          "ops-link"
                        }
                        disabled={busy || question === context || !!question.trim()}
                        onClick={() => setQuestion(context)}
                      >
                        <T>Use project details</T>
                      </button>
                    )}
                    {request && (
                      <details className={styles["ops-assist-prompt"]}>
                        <summary>
                          <T>Review exact request</T> <ChevronDown size={13} />
                        </summary>
                        <pre>{request.prompt}</pre>
                      </details>
                    )}
                    <div className={styles["ops-assist-actions"]}>
                      <button
                        type="button"
                        className={
                          // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                          "ops-button ops-primary"
                        }
                        disabled={!available || !request || busy}
                        onClick={() => void work(ask)}
                      >
                        {busy
                          ? gt("Preparing…")
                          : route === "ollama" ? gt("Ask local model") : route === "device"
                            ? gt("Ask on-device AI")
                            : gt("Open reviewed draft in T3")}
                      </button>
                      <button
                        type="button"
                        className={
                          // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                          "ops-link"
                        }
                        disabled={busy}
                        onClick={() => showResult(createLocalBuilderSuggestion(draft, intent))}
                      >
                        <Cpu size={14} /> <T>Use local starter</T>
                      </button>
                    </div>
                  </>
                ))}
              {preview && (
                <div>
                  <div className={styles["ops-assist-origin"]}>{originLabel}</div>
                  <p>{preview.source === "local" ? m(preview.summary) : preview.summary}</p>
                  {preview.changes.map(({ key, label, value, previousValue }) => (
                    <label className={styles["ops-assist-change"]} key={key}>
                      <input
                        type="checkbox"
                        checked={!excluded.includes(key)}
                        disabled={stale}
                        onChange={(event) =>
                          updateRouteUi({
                            excluded: event.target.checked
                              ? excluded.filter((item) => item !== key)
                              : [...excluded, key],
                          })
                        }
                      />
                      <span>
                        <strong>{m(label)}</strong>
                        {previousValue && (
                          <small>
                            <T>
                              Current:{" "}
                              <Var name="previous">
                                {previousValue.length > 240
                                  ? previousValue.slice(0, 238) + "…"
                                  : previousValue}
                              </Var>
                            </T>
                          </small>
                        )}
                        <span>{value}</span>
                      </span>
                    </label>
                  ))}
                  <p className={styles["ops-assist-next"]}>
                    {preview.source === "local" ? m(preview.nextStep) : preview.nextStep}
                  </p>
                  <div className={styles["ops-assist-actions"]}>
                    {preview.changes.length > 0 && (
                      <button
                        type="button"
                        className={
                          // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                          "ops-button ops-primary"
                        }
                        disabled={
                          stale ||
                          excluded.length === preview.changes.length ||
                          editor.snapshot().status === "conflict" ||
                          editor.snapshot().status === "error"
                        }
                        onClick={commit}
                      >
                        <Check size={15} /> <T>Apply selected</T>
                      </button>
                    )}
                    <button
                      type="button"
                      className={
                        // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                        "ops-link"
                      }
                      onClick={() => {
                        updateRouteUi({ preview: null, notice: "" });
                        resultTitle.current?.focus();
                      }}
                    >
                      <T>Dismiss suggestion</T>
                    </button>
                  </div>
                  {stale && (
                    <p role="status">
                      <T>The step changed. Generate a fresh suggestion to apply edits.</T>
                    </p>
                  )}
                </div>
              )}
              {undo && (
                <button
                  type="button"
                  className={
                    // oxlint-disable-next-line shadcn/no-unknown-classes -- shared control styles from studio.css
                    "ops-button"
                  }
                  ref={undoButton}
                  onClick={revert}
                >
                  <Undo2 size={15} /> <T>Undo applied changes</T>
                </button>
              )}
            </>
          )}
          {notice && (
            <p role="status" className={styles["ops-assist-notice"]}>
              {notice}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
