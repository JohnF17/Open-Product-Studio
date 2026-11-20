import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";
import {
  EnvironmentId,
  type ModelSelection,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { page as browser } from "vite-plus/test/browser";

import { act, render } from "../../test/render";
import { attachmentContextRecord } from "../lib/composerContextRecords";
import { DraftId, useComposerDraftStore } from "../composerDraftStore";
import { clipEvidenceInventory } from "../features/studio/clipPicks";
import { createDraft, DraftEditor } from "../features/studio/drafts";
import { studioProjectHash } from "../features/studio/projectNavigation";
import { newDraftId, newThreadId } from "../lib/utils";
import type StudioWorkspace from "../features/studio/StudioWorkspace";
import type { ComponentProps } from "react";
import StudioLanding from "./StudioLanding";
import { useComposerProviderModel } from "./chat/useComposerProviderModel";

const fixture = vi.hoisted(() => ({
  workspace: "local-clip-test",
  scratch: "scratch-clip-test",
  openScratch: vi.fn(),
  readProjection: vi.fn(),
  mintAttachment: vi.fn(),
  builderProviders: [] as readonly ServerProvider[],
  workspaceProps: null as ComponentProps<typeof StudioWorkspace> | null,
}));
vi.mock("../state/environments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../state/environments")>()),
  usePrimaryEnvironmentId: () => fixture.workspace,
  useEnvironmentProviders: () => new Map([[fixture.workspace, fixture.builderProviders]]),
}));
vi.mock("../hooks/useScratchProject", () => ({
  useScratchProject: () => ({
    openScratchProject: fixture.openScratch,
    scratchWorkspaceRootFor: () => "scratch-workspace",
  }),
}));
vi.mock("../features/studio/StudioWorkspace", () => ({
  default: (props: ComponentProps<typeof StudioWorkspace>) => {
    fixture.workspaceProps = props;
    return <><h1>Review evidence</h1>{fixture.builderProviders.length > 0 && props.builderAssistant?.selector}</>;
  },
}));
vi.mock("./WorkspacePageHeader", () => ({ WorkspacePageHeader: () => null }));
vi.mock("../state/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../state/session")>()),
  readPreparedConnection: () => ({ httpBaseUrl: "http://clip-engine.invalid" }),
}));
vi.mock("@t3tools/client-runtime/state/runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@t3tools/client-runtime/state/runtime")>()),
  runAtomCommand: (...args: [unknown, { label: string }, unknown]) => {
    if (args[1].label.endsWith(":read-thread")) return fixture.readProjection(...args);
    if (args[1].label === "studio:clip-reply:read-image") return fixture.mintAttachment(...args);
    return Promise.resolve({ _tag: "Success", value: { providers: fixture.builderProviders } });
  },
}));

const scratchRef = scopeProjectRef(
  EnvironmentId.make(fixture.workspace),
  ProjectId.make(fixture.scratch),
);
const model = {
  instanceId: ProviderInstanceId.make("selected-codex-account"),
  model: "gpt-test",
  options: [{ id: "effort", value: "high" }],
} satisfies ModelSelection;
const sentModel: ModelSelection = {
  instanceId: ProviderInstanceId.make("actual-analysis-account"),
  model: "gpt-actual",
  options: [{ id: "reasoningEffort", value: "low" }],
};
const otherModel: ModelSelection = {
  instanceId: ProviderInstanceId.make("other-chat-account"),
  model: "gpt-other",
  options: [{ id: "reasoningEffort", value: "medium" }],
};

function provider(selection: ModelSelection, authenticated: boolean): ServerProvider {
  return {
    driver: ProviderDriverKind.make("codex"),
    instanceId: selection.instanceId,
    enabled: true,
    installed: true,
    status: "ready",
    auth: { status: authenticated ? "authenticated" : "unauthenticated" },
    version: null,
    checkedAt: "2026-11-20T00:00:00.000Z",
    models: [{
      slug: selection.model,
      name: selection.model,
      isCustom: false,
      capabilities: {
        optionDescriptors: [{
          id: "reasoningEffort",
          label: "Effort",
          type: "select",
          options: [{ id: "low", label: "Low" }, { id: "medium", label: "Medium" }],
        }],
      },
    }],
    slashCommands: [],
    skills: [],
  };
}

const store = () => useComposerDraftStore.getState();

afterEach(() => {
  for (const id of Object.keys(store().draftThreadsByThreadKey)) {
    store().clearDraftThread(DraftId.make(id));
  }
  useComposerDraftStore.setState({
    stickyActiveProvider: null,
    stickyModelSelectionByProvider: {},
    stickyOptionsByModelByProvider: {},
  });
  fixture.workspaceProps = null;
  fixture.builderProviders = [];
  fixture.openScratch.mockReset();
  fixture.readProjection.mockReset();
  fixture.mintAttachment.mockReset();
  vi.restoreAllMocks();
});

async function studio(providers: ReadonlyArray<ServerProvider> = []) {
  const settings = {
    ...DEFAULT_UNIFIED_SETTINGS,
    providerInstances: Object.fromEntries(providers.map(({ instanceId, driver }) =>
      [instanceId, { driver, enabled: true, config: {} }],
    )),
  };
  const root = createRootRoute();
  const source = createRoute({ getParentRoute: () => root, path: "/", component: StudioLanding });
  const draft = createRoute({
    getParentRoute: () => root,
    path: "/draft/$draftId",
    component: function DraftFixture() {
      const pathname = useRouterState({ select: (state) => state.location.pathname });
      const threadRef = DraftId.make(pathname.split("/").at(-1)!);
      const resolved = useComposerProviderModel({
        providerStatuses: providers,
        settings,
        activeProjectId: scratchRef.projectId,
        threadRef,
        threadModelSelection: otherModel,
        projectModelSelection: otherModel,
        promptInjectionState: "none",
        threadStarted: false,
        candidateInstanceIds: [otherModel.instanceId],
        lockedProvider: null,
        lockedInstanceId: null,
      });
      return (
        <>
          <h1>Composer draft</h1>
          <output data-testid="model-route">
            {resolved.modelSelectionRequired
              ? "Model selection required"
              : JSON.stringify({
                  instanceId: resolved.selectedInstanceId,
                  model: resolved.selectedModel,
                  options: resolved.composerProviderState.modelOptionsForDispatch,
                })}
          </output>
        </>
      );
    },
  });
  const other = createRoute({ getParentRoute: () => root, path: "/settings" });
  const router = createRouter({
    routeTree: root.addChildren([source, draft, other]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const screen = await render(<RouterProvider router={router} />, { router: false });
  await expect.element(screen.getByRole("heading", { name: "Review evidence" })).toBeVisible();
  const project = { ...createDraft(fixture.workspace, "clipper"), stage: "source" };
  fixture.openScratch.mockResolvedValue({ id: scratchRef.projectId, environmentId: scratchRef.environmentId });
  const contactSheet = new File([Uint8Array.of(137, 80, 78, 71)], "reviewed-frames.png", { type: "image/png" });
  const evidence = {
    projectId: project.id,
    mediaRevision: "local-media-digest",
    sourceRevision: "reviewed-revision",
    durationMs: 21000,
    frames: [{ id: "frame-3", timeMs: 4700 }],
    contactSheet,
    transcript: [{ id: "cue-2", text: "Here's the fixture caption", startMs: 4600, endMs: 6000 }],
    instruction: "Find the opening explanation",
    originalVideo: new File(["source fixture"], "private-source.mp4", { type: "video/mp4" }),
    sourcePath: "P:/private/source.mp4",
  };
  const editor = new DraftEditor({
    ...project,
    revision: 1,
    fields: { ...project.fields, clipSourceEvidence: JSON.stringify(clipEvidenceInventory(evidence)) },
  });
  fixture.workspaceProps!.activeEditor!.current = editor;
  return Object.assign(screen, { router, evidence, editor, props: fixture.workspaceProps! });
}

it("uses the reviewed builder selection in a fresh composer and reads just its completed turn", async () => {
  const route = { ...sentModel, instanceId: ProviderInstanceId.make("codex") };
  const skill = { name: "outline", path: "/private/SKILL.md", description: "Private skill detail", enabled: true };
  fixture.builderProviders = [{
    ...provider(route, true), skills: [{ ...skill, name: "machine-only" }],
    workspaceSnapshots: [
      { cwd: "unrelated", checkedAt: "2026-11-20T00:00:00.000Z", slashCommands: [], skills: [{ ...skill, name: "other-project" }] },
      { cwd: "scratch-workspace", checkedAt: "2026-11-20T00:00:00.000Z", slashCommands: [], skills: [
        skill, { ...skill, name: "Outline" }, { ...skill, name: "disabled", enabled: false },
        { ...skill, name: "agent-only", userInvocable: false },
      ] },
    ],
  }, provider(otherModel, false)];
  await using page = await studio(fixture.builderProviders);
  const bridge = () => fixture.workspaceProps!.builderAssistant!;
  const thisProject = studioProjectHash(fixture.workspace, page.editor.snapshot().draft.id);
  await act(() => page.router.navigate({ to: "/", hash: thisProject }));
  expect(bridge()?.routeKey).toBeNull();
  expect(bridge().hasAvailableProviders).toBe(true);
  expect(bridge().availableSkills).toBeUndefined();
  await browser.getByRole("button", { name: /Use .*codex.*gpt-actual/i }).click();
  expect(bridge().routeKey).not.toBeNull();
  await browser.getByRole("button", { name: "Choose assistant model" }).click();
  await browser.getByRole("option", { name: /gpt-actual/ }).click();
  await browser.getByRole("button", { name: "Model options" }).click();
  await browser.getByRole("menuitemradio", { name: /Low/ }).click();
  expect(bridge().availableSkills).toEqual(["outline"]);
  const reviewedKey = bridge().routeKey;
  await act(() => page.router.navigate({ to: "/", hash: studioProjectHash(fixture.workspace, "new-project") }));
  expect(bridge().routeKey).toBeNull();
  await act(() => page.router.navigate({ to: "/", hash: thisProject }));
  expect(bridge().routeKey).toBe(reviewedKey);
  const request = {
    projectId: page.editor.snapshot().draft.id, stage: "source", requestId: "review-id",
    prompt: "Review exactly this field.", routeKey: bridge().routeKey!,
  };
  await expect(bridge().open({ ...request, routeKey: "stale-route" })).rejects.toThrow();
  await expect(bridge().open({ ...request, stage: "edit" })).rejects.toThrow();
  const practice = new DraftEditor({ ...page.editor.snapshot().draft, category: "day-trader", stage: "rules" });
  fixture.workspaceProps!.activeEditor!.current = practice;
  await expect(bridge().open({ ...request, stage: "rules" })).rejects.toThrow();
  fixture.workspaceProps!.activeEditor!.current = page.editor;
  expect(fixture.openScratch).not.toHaveBeenCalled();
  store().setStickyModelSelection(otherModel);
  await act(() => bridge().open(request));
  const draftId = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
  const session = store().getDraftSession(draftId)!;
  const composer = store().getComposerDraft(draftId)!;
  expect(composer.prompt).toBe(request.prompt);
  expect(composer.modelSelectionByProvider[route.instanceId]).toEqual(route);
  expect(session.requireAvailableModel).toBe(true);
  expect(session.promotedTo).toBeNull();
  await expect.element(page.getByTestId("model-route")).toHaveTextContent(JSON.stringify(route));
  expect(fixture.readProjection).not.toHaveBeenCalled();
  const threadId = session.threadId;
  const sent = { id: "user-1", role: "user", threadId, runId: "run-1", text: request.prompt, attachments: [] };
  const answer = { id: "assistant-1", role: "assistant", threadId, runId: sent.runId, text: "Reviewed proposal", streaming: false };
  const item = { type: "assistant_message", messageId: answer.id, threadId, runId: sent.runId, phase: "final_answer", streaming: false, status: "completed" };
  const run = { id: sent.runId, threadId, userMessageId: sent.id, providerInstanceId: route.instanceId, modelSelection: route, status: "completed" };
  const attempt = { id: "attempt", runId: run.id, providerTurnId: "turn", providerInstanceId: route.instanceId };
  const turn = { id: "turn", runAttemptId: attempt.id, model: route.model };
  const projection = { thread: { id: threadId, projectId: scratchRef.projectId }, messages: [sent, answer], runs: [run],
    turnItems: [item], nodes: [], subagents: [], runtimeRequests: [], attempts: [attempt], providerTurns: [turn] };
  await act(() => page.router.navigate({ to: "/", hash: thisProject }));
  fixture.workspaceProps!.activeEditor!.current = page.editor;
  expect(bridge().routeKey).toBe(reviewedKey);
  expect(await bridge().read({ ...request, requestId: "other" })).toBeNull();
  expect(await bridge().read({ ...request, prompt: "another review" })).toBeNull();
  expect(fixture.readProjection).not.toHaveBeenCalled();
  fixture.readProjection.mockResolvedValue({ _tag: "Success", value: projection });
  expect(await bridge().read(request)).toBe(answer.text);
  for (const change of [
    { thread: { id: threadId, projectId: "other" } },
    { messages: [{ ...sent, text: sent.text + " edited" }, answer] },
    { messages: [{ ...sent, context: { records: [{ kind: "file" }] } }, answer] },
    { messages: [sent, { ...sent, id: "steer" }, answer] },
    { messages: [sent, { ...answer, streaming: true }] },
    { runs: [{ ...run, status: "failed" }] },
    { runs: [{ ...run, providerInstanceId: otherModel.instanceId }] },
    { runs: [{ ...run, modelSelection: { ...route, options: [] } }] },
    { turnItems: [{ ...item, phase: "commentary" }] },
    { turnItems: [item, { type: "command_execution", runId: run.id, threadId }] },
    { turnItems: [item, { type: "approval_request", runId: run.id, threadId }] },
    { nodes: [{ kind: "tool_call", runId: run.id, threadId }] },
    { providerTurns: [{ ...turn, model: "unexpected-model" }] },
    { attempts: [{ ...attempt, providerInstanceId: otherModel.instanceId }] },
  ]) {
    fixture.readProjection.mockResolvedValueOnce({ _tag: "Success", value: { ...projection, ...change } });
    expect(await bridge().read(request)).toBeNull();
  }
  fixture.builderProviders = [provider(route, false)];
  await act(() => page.router.navigate({ to: "/", hash: studioProjectHash(fixture.workspace, "another-project") }));
  await act(() => page.router.navigate({ to: "/", hash: thisProject }));
  expect(bridge().hasAvailableProviders).toBe(false);
  expect(bridge().routeKey).toBeNull();
  expect(bridge().routeLabel).toMatch(/gpt-actual.*low.*unavailable/i);
  await expect(bridge().open(request)).rejects.toThrow();
  await act(() => page.router.navigate({ to: "/", hash: studioProjectHash(fixture.workspace, "copy") }));
  const key = "open-product-studio:builder-route:1:" + JSON.stringify([fixture.workspace, request.projectId]);
  localStorage.setItem(key, JSON.stringify({ instanceId: { id: "bad" }, options: ["bad"] }));
  await act(() => page.router.navigate({ to: "/", hash: thisProject }));
  expect(bridge().routeLabel).toBeNull();
  expect(bridge().routeKey).toBeNull();
});

it("opens an independent unsent evidence draft and requires an explicit model without a project preset", async () => {
  const previous = newDraftId();
  store().setProjectDraftThreadId(scratchRef, previous, { threadId: newThreadId() });
  store().setPrompt(previous, "Keep my unsent draft");
  store().setStickyModelSelection(model);
  await using page = await studio();

  await act(() => page.props.onEvidenceReady!(page.evidence, new AbortController().signal));

  await expect.element(page.getByRole("heading", { name: "Composer draft" })).toBeVisible();
  const freshId = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
  const fresh = store().getDraftSession(freshId)!;
  expect(store().getDraftThreadByProjectRef(scratchRef)?.draftId).toBe(previous);
  expect(freshId).not.toBe(previous);
  const seeded = store().getComposerDraft(freshId)!;
  const [, payload] = seeded.prompt.split("\n\n");
  expect(JSON.parse(payload!)).toEqual({
    sourceRevision: "reviewed-revision",
    durationMs: 21000,
    frames: [{ id: "frame-3", timeMs: 4700 }],
    transcript: [{ id: "cue-2", text: "Here's the fixture caption", startMs: 4600, endMs: 6000 }],
    instruction: "Find the opening explanation",
  });
  expect(seeded.prompt).toContain("studio-clip-picks/1");
  expect(seeded.images).toHaveLength(1);
  expect(seeded.images[0]!.file).toBe(page.evidence.contactSheet);
  expect(seeded.files).toEqual([]);
  expect(seeded.activeProvider).toBeNull();
  expect(fresh.requireAvailableModel).toBe(true);
  expect(store().getComposerDraft(previous)?.prompt).toBe("Keep my unsent draft");
  expect(fresh.promotedTo).toBeNull();
  expect(fresh.environmentSelection).toBe("manual");
  expect(fresh.pinProviderSelection).toBe(true);
  expect(fixture.readProjection).not.toHaveBeenCalled();
});

it.each(["clipper", "affiliate-storefront"] as const)("honors the %s project preset in the specialized composer", async category => {
  const route = { ...sentModel, instanceId: ProviderInstanceId.make("codex") };
  fixture.builderProviders = [provider(route, true)];
  await using page = await studio(fixture.builderProviders);
  const project = category === "clipper" ? page.editor.snapshot().draft : {
    ...createDraft(fixture.workspace, category), stage: "discover", revision: 1,
  };
  await act(() => page.router.navigate({ to: "/", hash: studioProjectHash(fixture.workspace, project.id) }));
  const editor = category === "clipper" ? page.editor : new DraftEditor(project);
  const request = { workspaceId: fixture.workspace, projectId: project.id, stepId: project.stage,
    signal: new AbortController().signal, prompt: "Research my reviewed question." };
  const open = () => {
    const props = fixture.workspaceProps!;
    props.activeEditor!.current = editor;
    return category === "clipper" ? Promise.resolve(props.onEvidenceReady!(page.evidence, request.signal)) : props.onAskAgent!(request);
  };
  const key = "open-product-studio:builder-route:1:" + JSON.stringify([fixture.workspace, project.id]);
  localStorage.setItem(key, JSON.stringify({ ...route, model: "missing-model" }));
  await expect(open()).rejects.toThrow(/unavailable/i);
  localStorage.setItem(key, JSON.stringify(route));
  store().setStickyModelSelection(otherModel);
  await act(open);
  const id = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
  expect(store().getDraftSession(id)?.requireAvailableModel).toBe(true);
  expect(store().getComposerDraft(id)?.modelSelectionByProvider[route.instanceId]).toEqual(route);
  if (category === "affiliate-storefront") expect(store().getComposerDraft(id)?.prompt).toBe(request.prompt);
  expect(fixture.readProjection).not.toHaveBeenCalled();
});

it("cancels an opening when its reviewed evidence expires during scratch preparation", async () => {
  await using page = await studio();
  const keysBefore = store().listDraftThreadKeys();
  let finish!: (scratch: unknown) => void;
  fixture.openScratch.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const controller = new AbortController();
  const opening = page.props.onEvidenceReady!(page.evidence, controller.signal);
  const finished = expect(opening).rejects.toMatchObject({ name: "AbortError" });
  await expect.poll(() => fixture.openScratch.mock.calls.length).toBe(1);
  controller.abort();
  finish({ id: scratchRef.projectId, environmentId: scratchRef.environmentId });
  await finished;
  expect(page.router.state.location.pathname).toBe("/");
  expect(store().listDraftThreadKeys()).toEqual(keysBefore);
});

it("ignores a delayed opener after the user leaves its Studio route", async () => {
  await using page = await studio();
  const keysBefore = store().listDraftThreadKeys();
  let finish!: (scratch: unknown) => void;
  fixture.openScratch.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const opening = page.props.onEvidenceReady!(page.evidence, new AbortController().signal);
  const finished = expect(opening).rejects.toMatchObject({ name: "AbortError" });
  await expect.poll(() => fixture.openScratch.mock.calls.length).toBe(1);
  await act(() => page.router.navigate({ to: "/settings" }));
  finish({ id: scratchRef.projectId, environmentId: scratchRef.environmentId });
  await finished;
  expect(page.router.state.location.pathname).toBe("/settings");
  expect(store().listDraftThreadKeys()).toEqual(keysBefore);
});


function mockSentEvidence(
  page: Awaited<ReturnType<typeof studio>>,
  sentModel: ModelSelection = model,
) {
  const draftId = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
  const session = store().getDraftSession(draftId)!;
  const seeded = store().getComposerDraft(draftId)!;
  const start = {
    id: "review-message",
    role: "user",
    text: "Ultrathink:\n" + seeded.prompt,
    threadId: session.threadId,
    runId: "review-run",
    context: { version: 1, records: [
      attachmentContextRecord({ attachment: seeded.images[0]!, attachmentId: "engine-owned-image" }),
    ] },
    attachments: [{
      type: "image",
      id: "engine-owned-image",
      name: page.evidence.contactSheet.name,
      mimeType: "image/png",
      sizeBytes: page.evidence.contactSheet.size,
    }],
  };
  const assistant = { role: "assistant", threadId: session.threadId, runId: start.runId, streaming: false };
  const projection = {
    thread: { id: session.threadId, projectId: scratchRef.projectId, modelSelection: model },
    runs: [
      { id: start.runId, userMessageId: start.id, threadId: session.threadId,
        providerInstanceId: sentModel.instanceId, modelSelection: sentModel, startedAt: "sent", status: "completed" },
      { id: "follow-up", userMessageId: "follow-up-message", modelSelection: model },
    ],
    messages: [
      start,
      { ...assistant, id: "earlier", text: "Earlier reply" },
      { ...assistant, id: "answer", text: "Completed clip proposal" },
      { ...start, id: "follow-up-message", text: "Unrelated follow-up" },
      { ...assistant, text: "Unrelated reply", runId: "follow-up" },
    ],
    turnItems: [{ type: "assistant_message", runId: start.runId, threadId: session.threadId,
      messageId: "answer", phase: "final_answer", streaming: false, status: "completed" }],
  };
  fixture.readProjection.mockResolvedValue({ _tag: "Success", value: projection });
  fixture.mintAttachment.mockResolvedValue({
    _tag: "Success",
    value: { relativeUrl: "/api/assets/test-token/reviewed-frames.png" },
  });
  const fetchOriginal = globalThis.fetch;
  const sentImage = vi.fn(() => new Response(page.evidence.contactSheet));
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
    String(input) === "http://clip-engine.invalid/api/assets/test-token/reviewed-frames.png"
      ? Promise.resolve(sentImage())
      : fetchOriginal(input, init),
  );
  return { projection, start, sentImage };
}

it("reads only a complete reply for this saved project's reviewed request", async () => {
  await using page = await studio();
  await act(() => page.props.onEvidenceReady!(page.evidence, new AbortController().signal));
  const { projection, start, sentImage } = mockSentEvidence(page);
  await act(() => page.router.navigate({ to: "/" }));
  const restored = fixture.workspaceProps!;
  restored.activeEditor!.current = page.editor;
  const read = restored.onReadClipReply!;
  const { projectId, sourceRevision } = page.evidence;
  expect(await read("imported-copy-of-project", sourceRevision)).toBeNull();
  expect(await read(projectId, "stale-revision")).toBeNull();
  expect(fixture.readProjection).not.toHaveBeenCalled();
  expect(await read(projectId, sourceRevision)).toBe("Completed clip proposal");
  expect(fixture.readProjection.mock.calls[0]?.[2]).toEqual({
    environmentId: scratchRef.environmentId,
    input: { threadId: projection.thread.id },
  });
  sentImage.mockImplementationOnce(() => new Response(
    new File([Uint8Array.of(137, 80, 78, 72)], start.attachments[0]!.name, { type: "image/png" }),
  ));
  expect(await read(projectId, sourceRevision)).toBeNull();
  expect(fixture.mintAttachment.mock.calls[0]?.[2]).toEqual({
    environmentId: scratchRef.environmentId,
    input: { resource: { _tag: "attachment", attachmentId: "engine-owned-image" } },
  });
  expect(sentImage).toHaveBeenCalledTimes(2);

  fixture.readProjection.mockResolvedValue({
    _tag: "Success", value: { ...projection, thread: { ...projection.thread, projectId: "other-project" } },
  });
  expect(await read(projectId, sourceRevision)).toBeNull();
  fixture.readProjection.mockResolvedValue({
    _tag: "Success", value: { ...projection, messages: [{ ...start, text: "Edited evidence" }, ...projection.messages.slice(1)] },
  });
  expect(await read(projectId, sourceRevision)).toBeNull();
  expect(sentImage).toHaveBeenCalledTimes(2);
});

it("rejects provisional, failed and unbound replies instead of falling back to an earlier assistant message", async () => {
  await using page = await studio();
  await act(() => page.props.onEvidenceReady!(page.evidence, new AbortController().signal));
  const { projection, start } = mockSentEvidence(page);
  await act(() => page.router.navigate({ to: "/" }));
  const restored = fixture.workspaceProps!;
  restored.activeEditor!.current = page.editor;
  const read = () => restored.onReadClipReply!(page.evidence.projectId, page.evidence.sourceRevision);
  const { messages, runs, turnItems } = projection;
  const omittedContext = { ...start, context: undefined };
  fixture.readProjection.mockResolvedValueOnce({ _tag: "Success", value: {
    ...projection, messages: [omittedContext, ...messages.slice(1)],
  } });
  expect(await read()).toBe("Completed clip proposal");
  for (const status of ["running", "waiting", "failed", "cancelled", "interrupted", "rolled_back"]) {
    fixture.readProjection.mockResolvedValueOnce({ _tag: "Success", value: {
      ...projection, runs: [{ ...runs[0], status }],
    } });
    expect(await read(), status).toBeNull();
  }
  for (const changes of [
    { runs: [] },
    { runs: [{ ...runs[0], userMessageId: "another-message" }] },
    { messages: [{ ...start, runId: null }, ...messages.slice(1)] },
    { messages: [{ ...start, context: { version: 1, records: [...start.context.records, { kind: "response", messageId: "other" }] } }, ...messages.slice(1)] },
    { messages: [{ ...start, context: { version: 1, records: [{ ...start.context.records[0], attachmentId: "different-image" }] } }, ...messages.slice(1)] },
    { messages: [{ ...start, context: { version: 1, guest: { name: "guest" }, records: start.context.records } }, ...messages.slice(1)] },
    { messages: [start, messages[1], { ...messages[2], streaming: true }] },
    { messages: [start, messages[1], { ...messages[2], text: "  " }] },
    { messages: [start, messages[1], messages[3], messages[2]] },
    { turnItems: [{ ...turnItems[0], phase: "commentary" }] },
    { turnItems: [{ ...turnItems[0], status: "interrupted" }] },
  ]) {
    fixture.readProjection.mockResolvedValueOnce({ _tag: "Success", value: { ...projection, ...changes } });
    expect(await read()).toBeNull();
  }
});

it.each([true, false])(
  "keeps the sent analysis route after sticky changes (account authenticated: %s)",
  async (authenticated) => {
    await using page = await studio([provider(sentModel, authenticated), provider(otherModel, true)]);
    store().setStickyModelSelection(model);
    const signal = new AbortController().signal;
    await act(() => page.props.onEvidenceReady!(page.evidence, signal));
    mockSentEvidence(page, sentModel);
    store().setStickyModelSelection(otherModel);
    await act(() => page.router.navigate({ to: "/" }));
    fixture.workspaceProps!.activeEditor!.current = new DraftEditor({ ...page.editor.snapshot().draft, stage: "edit" });

    const prompt = "Explain the current crop settings.";
    await act(() => fixture.workspaceProps!.onAskAgent!({
      workspaceId: fixture.workspace,
      projectId: page.evidence.projectId,
      stepId: "edit",
      clipSettingsFollowup: true,
      signal,
      prompt,
    }));
    const draftId = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
    const seeded = store().getComposerDraft(draftId)!;
    expect(seeded.prompt).toBe(prompt);
    expect(seeded.activeProvider).toBe(sentModel.instanceId);
    expect(seeded.modelSelectionByProvider).toEqual({ [sentModel.instanceId]: sentModel });
    expect(seeded.images).toEqual([]);
    expect(seeded.files).toEqual([]);
    const route = page.getByTestId("model-route");
    await expect.element(route).toHaveTextContent(
      authenticated ? JSON.stringify(sentModel) : "Model selection required",
    );
    if (!authenticated) {
      await act(() => store().setModelSelection(draftId, otherModel, { explicit: true, replaceOptions: true }));
      await expect.element(route).toHaveTextContent(JSON.stringify(otherModel));
    }
  },
);

it("keeps a settings-only reply binding independent from the footage reply", async () => {
  await using page = await studio([provider(otherModel, true)]);
  const signal = new AbortController().signal;
  await act(() => page.props.onEvidenceReady!(page.evidence, signal));
  const footageId = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
  const footage = store().getDraftSession(footageId)!;
  await act(() => page.router.navigate({ to: "/" }));
  fixture.workspaceProps!.activeEditor!.current = new DraftEditor({ ...page.editor.snapshot().draft, stage: "edit" });

  store().setStickyModelSelection(model);
  const prompt = "Suggest a portrait output setting.";
  await act(() => fixture.workspaceProps!.onAskAgent!({
    workspaceId: fixture.workspace,
    projectId: page.evidence.projectId,
    stepId: "edit",
    clipSettingsFollowup: true,
    clipSettingsScope: "reviewed-settings",
    signal,
    prompt,
  }));
  const settingsId = DraftId.make(page.router.state.location.pathname.split("/").at(-1)!);
  const settings = store().getDraftSession(settingsId)!;
  const seeded = store().getComposerDraft(settingsId)!;
  expect(settingsId).not.toBe(footageId);
  expect(seeded.prompt).toBe(prompt);
  expect(seeded.images).toEqual([]);
  expect(seeded.files).toEqual([]);
  expect(seeded.activeProvider).toBeNull();
  expect(settings.requireAvailableModel).toBe(true);
  await expect.element(page.getByTestId("model-route")).toHaveTextContent("Model selection required");

  const settingsProjection = {
      thread: { id: settings.threadId, projectId: scratchRef.projectId },
      runs: [{ id: "settings-run", threadId: settings.threadId, userMessageId: "settings-question", status: "completed" }],
      turnItems: [],
      messages: [
        { id: "settings-question", role: "user", threadId: settings.threadId, text: prompt, attachments: [], runId: "settings-run" },
        { id: "settings-answer", role: "assistant", threadId: settings.threadId, text: "Settings reply", streaming: false, runId: "settings-run" },
      ],
  };
  fixture.readProjection.mockResolvedValueOnce({
    _tag: "Success", value: { ...settingsProjection, messages: [
      { ...settingsProjection.messages[0], context: { version: 1, records: [{ kind: "terminal", text: "other context" }] } },
      settingsProjection.messages[1],
    ] },
  });
  fixture.readProjection.mockResolvedValueOnce({ _tag: "Success", value: settingsProjection });
  await act(() => page.router.navigate({ to: "/" }));
  fixture.workspaceProps!.activeEditor!.current = page.editor;
  const read = fixture.workspaceProps!.onReadClipReply!;
  expect(await read(page.evidence.projectId, "settings:reviewed-settings")).toBeNull();
  expect(await read(page.evidence.projectId, "settings:reviewed-settings")).toBe("Settings reply");
  await read(page.evidence.projectId, page.evidence.sourceRevision);
  expect(fixture.readProjection.mock.calls.map((args) => args[2].input.threadId)).toEqual([
    footage.threadId,
    settings.threadId,
    settings.threadId,
    footage.threadId,
  ]);
});
