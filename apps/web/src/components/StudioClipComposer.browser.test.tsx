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

import { act, render } from "../../test/render";
import { attachmentContextRecord } from "../lib/composerContextRecords";
import { DraftId, useComposerDraftStore } from "../composerDraftStore";
import { clipEvidenceInventory } from "../features/studio/clipPicks";
import { createDraft, DraftEditor } from "../features/studio/drafts";
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
  workspaceProps: null as ComponentProps<typeof StudioWorkspace> | null,
}));
vi.mock("../state/environments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../state/environments")>()),
  usePrimaryEnvironmentId: () => fixture.workspace,
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
    return <h1>Review evidence</h1>;
  },
}));
vi.mock("./WorkspacePageHeader", () => ({ WorkspacePageHeader: () => null }));
vi.mock("../state/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../state/session")>()),
  readPreparedConnection: () => ({ httpBaseUrl: "http://clip-engine.invalid" }),
}));
vi.mock("@t3tools/client-runtime/state/runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@t3tools/client-runtime/state/runtime")>()),
  runAtomCommand: (...args: [unknown, { label: string }, unknown]) =>
    (args[1].label === "studio:clip-reply:read-thread" ? fixture.readProjection : fixture.mintAttachment)(...args),
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

it("opens another unsent draft with the exact reviewed evidence and selected model options", async () => {
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
  expect(seeded.activeProvider).toBe(model.instanceId);
  expect(seeded.modelSelectionByProvider[model.instanceId]).toEqual(model);
  expect(store().getComposerDraft(previous)?.prompt).toBe("Keep my unsent draft");
  expect(fresh.promotedTo).toBeNull();
  expect(fresh.environmentSelection).toBe("manual");
  expect(fresh.pinProviderSelection).toBe(true);
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
    fixture.workspaceProps!.activeEditor!.current = page.editor;

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
  fixture.workspaceProps!.activeEditor!.current = page.editor;

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
