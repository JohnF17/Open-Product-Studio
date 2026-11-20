import { createMemoryHistory } from "@tanstack/react-router";
import {
  MessageId,
  type ModelSelection,
  ORCHESTRATION_V2_WS_METHODS,
  type OrchestrationV2ThreadProjection,
  ProviderInstanceId,
  type ServerConfig,
  type ThreadId,
  WS_METHODS,
} from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { AppRoot } from "../../AppRoot";
import "../../components/ChatView";
import { DraftId, useComposerDraftStore } from "../../composerDraftStore";
import { __setClientSettingsForTests } from "../../hooks/useSettings";
import stylesheet from "../../index.css?inline";
import { getRouter } from "../../router";
import { makeThreadProjectionFixture } from "../../test-fixtures";
import {
  CODEX_PROVIDER,
  ENVIRONMENT_ID,
  PROJECT_ID,
  answerRpc,
  assistantItem,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../../test/fakeEnvironment";
import { act, render, stubGlobal } from "../../../test/render";
import { createDraft, readDraft, saveDraft } from "./drafts";
import { studioProjectHash } from "./projectNavigation";

vi.mock(import("../../env"), async (original) => ({ ...(await original()), isElectron: true }));

vi.mock(
  "../../../../../packages/client-runtime/src/connection/driver.ts",
  async (importOriginal) => {
    const [actual, { fakeDriver }, Layer, Stream] = await Promise.all([
      importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
      import("../../../test/fakeEnvironment"),
      import("effect/Layer"),
      import("effect/Stream"),
    ]);
    const withScratch = (config: ServerConfig): ServerConfig => ({
      ...config,
      scratchWorkspaceRoot: "/workspace/render",
      settings: { ...config.settings, defaultThreadEnvMode: "local" },
    });
    const driver: FakeDriver = {
      ...fakeDriver,
      connect: (entry) =>
        fakeDriver.connect(entry).pipe(
          Effect.map((lease) => ({
            ...lease,
            session: {
              ...lease.session,
              initialConfig: lease.session.initialConfig.pipe(Effect.map(withScratch)),
              subscribeServerConfig: (input) =>
                lease.session
                  .subscribeServerConfig(input)
                  .pipe(
                    Stream.map((event) =>
                      event.type === "snapshot"
                        ? { ...event, config: withScratch(event.config) }
                        : event,
                    ),
                  ),
            },
          })),
        ),
    };
    return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, driver) };
  },
);

function projectReply(
  threadId: ThreadId,
  selection: ModelSelection,
  prompt: string,
  reply: string,
) {
  const base = makeThreadProjectionFixture();
  const [run] = threadWithHistory(threadId, 1, selection).runs;
  const answer = assistantItem(threadId, run!.id, "builder-reply", 1, reply);
  const message = {
    threadId,
    runId: run!.id,
    nodeId: null,
    attachments: [],
    streaming: false,
    createdAt: base.updatedAt,
    updatedAt: base.updatedAt,
    createdBy: "user",
    creationSource: "web",
  } as const;
  return {
    ...base,
    thread: {
      ...base.thread,
      id: threadId,
      projectId: PROJECT_ID,
      providerInstanceId: selection.instanceId,
      modelSelection: selection,
      lineage: { ...base.thread.lineage, rootThreadId: threadId },
    },
    runs: [run!],
    messages: [
      { ...message, id: run!.userMessageId!, role: "user", text: prompt },
      {
        ...message,
        id: MessageId.make("builder-reply"),
        role: "assistant",
        text: reply,
        createdBy: "agent",
        creationSource: "provider",
      },
    ],
    turnItems: [{ ...answer, phase: "final_answer" }],
  } satisfies OrchestrationV2ThreadProjection;
}

it("previews a project request, opens the selected T3 draft and applies its returned proposal", async () => {
  const selection = {
    instanceId: ProviderInstanceId.make("codex"),
    model: "gpt-5.5",
    options: [{ id: "reasoningEffort", value: "low" }],
  } satisfies ModelSelection;
  using _environment = installFakeEnvironment([], {
    providers: [
      {
        ...CODEX_PROVIDER,
        models: CODEX_PROVIDER.models.map((model) =>
          model.slug === selection.model
            ? {
                ...model,
                capabilities: {
                  optionDescriptors: [
                    {
                      id: "reasoningEffort",
                      label: "Effort",
                      type: "select",
                      options: [
                        { id: "low", label: "Low" },
                        { id: "medium", label: "Medium" },
                      ],
                    },
                  ],
                },
              }
            : model,
        ),
      },
    ],
  });
  using _device = stubGlobal("LanguageModel", undefined);
  using _scratch = answerRpc(WS_METHODS.projectsEnsureScratch, () =>
    Effect.succeed({ projectId: PROJECT_ID }),
  );
  const launch = vi.fn(() => Effect.never);
  using _launch = answerRpc(ORCHESTRATION_V2_WS_METHODS.launchThread, launch);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const style = document.createElement("style");
  style.textContent = stylesheet;
  document.head.append(style);
  using _style = { [Symbol.dispose]: () => style.remove() };
  await page.viewport(1400, 900);

  const original = "Private notes about an unfinished project";
  const project = {
    ...createDraft(ENVIRONMENT_ID, "blank"),
    title: "Garden plan",
    fields: { notes: original },
  };
  await saveDraft(project, 0);
  const hash = studioProjectHash(ENVIRONMENT_ID, project.id);
  const router = getRouter(createMemoryHistory({ initialEntries: ["/#" + hash] }));
  await router.load();
  await using screen = await render(<AppRoot router={router} />, { router: false });
  const panel = screen.getByRole("region", { name: "Step assistant" });
  await expect
    .element(screen.getByRole("textbox", { name: "Project name" }))
    .toHaveValue(project.title);
  await panel.getByRole("button", { name: "Suggest", exact: true }).click();
  await panel.getByRole("button", { name: "Choose assistant model" }).click();
  await page.getByRole("option", { name: /GPT-5\.5/ }).click();
  await panel.getByRole("button", { name: "Model options" }).click();
  await page.getByRole("menuitemradio", { name: /Low/ }).click();
  await panel.getByRole("textbox").fill("Help plan a balcony garden");
  await panel.getByText("Review exact request").click();
  const prompt = panel.element().querySelector("pre")!.textContent!;
  expect(prompt).toContain("Help plan a balcony garden");
  expect(prompt).not.toContain(original);
  await panel.getByRole("button", { name: "Open reviewed draft in T3" }).click();

  const composer = screen.getByTestId("composer-editor");
  await expect.element(composer).toBeVisible();
  expect(composer.element().textContent).toContain("Help plan a balcony garden");
  const draftId = DraftId.make(router.state.location.pathname.split("/").at(-1)!);
  const composerStore = useComposerDraftStore.getState();
  const draft = composerStore.getDraftSession(draftId)!;
  expect(draft.requireAvailableModel).toBe(true);
  expect(draft.promotedTo).toBeNull();
  expect(composerStore.getComposerDraft(draftId)).toMatchObject({
    prompt,
    activeProvider: selection.instanceId,
    modelSelectionByProvider: { [selection.instanceId]: selection },
  });
  expect(launch).not.toHaveBeenCalled();

  const proposal = "Measure available sunlight before choosing plants.";
  const reply = JSON.stringify({
    summary: "A first step for the garden.",
    nextStep: "Measure the balcony.",
    changes: [{ key: "notes", value: proposal }],
  });
  const readProjection = vi.fn((input: { threadId: ThreadId }) => {
    expect(input.threadId).toBe(draft.threadId);
    return Effect.succeed(projectReply(draft.threadId, selection, prompt, reply));
  });
  using _projection = answerRpc(ORCHESTRATION_V2_WS_METHODS.getThreadProjection, readProjection);
  await act(() => router.history.back());
  await expect
    .element(screen.getByRole("textbox", { name: "Project name" }))
    .toHaveValue(project.title);
  expect(router.state.location.hash).toBe(hash);
  await panel.getByRole("button", { name: "Read completed reply" }).click();
  await expect.element(panel.getByText(proposal)).toBeVisible();
  expect(readProjection).toHaveBeenCalledOnce();
  expect((await readDraft(ENVIRONMENT_ID, project.id))?.fields.notes).toBe(original);
  await panel.getByRole("button", { name: "Apply selected" }).click();
  await expect
    .poll(async () => (await readDraft(ENVIRONMENT_ID, project.id))?.fields.notes)
    .toBe(proposal);
});
