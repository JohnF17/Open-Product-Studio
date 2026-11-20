import { createMemoryHistory } from "@tanstack/react-router";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { DesktopBridge, ThreadId } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { StrictMode } from "react";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
import "~/components/ChatView";
import { useComposerDraftStore } from "~/composerDraftStore";
import { listDrafts } from "~/features/studio/drafts";
import { recording } from "~/features/studio/clipRecordingFixture";
import { projectFromHash } from "~/features/studio/projectNavigation";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import stylesheet from "~/index.css?inline";
import { getRouter } from "~/router";
import {
  dispatchedCommands,
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../../test/fakeEnvironment";
import { act, render, stubGlobal } from "../../../test/render";

vi.mock(
  "../../../../../packages/client-runtime/src/connection/driver.ts",
  async (importOriginal) => {
    const [actual, { fakeDriver }, Layer] = await Promise.all([
      importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
      import("../../../test/fakeEnvironment"),
      import("effect/Layer"),
    ]);
    return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
  },
);

vi.mock(import("~/env"), async (original) => ({ ...(await original()), isElectron: true }));

const clipActionName = /^Clip a video/;
const resumeChat = (router: ReturnType<typeof getRouter>, threadId: ThreadId) =>
  act(() =>
    router.navigate({
      to: "/$environmentId/$threadId",
      params: { environmentId: ENVIRONMENT_ID, threadId },
    }),
  );

async function mountChat(name: string) {
  const thread = threadWithHistory(name, 1);
  const threadRef = scopeThreadRef(ENVIRONMENT_ID, thread.id);
  const chatDraft = "Private draft text for " + name;
  const attachment = new File(["existing draft attachment"], "keep-this.txt", {
    type: "text/plain",
  });
  const file = {
    id: "attachment-" + name,
    type: "file" as const,
    name: attachment.name,
    sizeBytes: attachment.size,
    mimeType: attachment.type,
    file: attachment,
  };
  const store = useComposerDraftStore.getState();
  store.setPrompt(threadRef, chatDraft);
  store.addFiles(threadRef, [file], { appendReference: true });
  const originalPrompt = store.getComposerDraft(threadRef)?.prompt;

  const style = document.createElement("style");
  style.textContent = stylesheet;
  document.head.append(style);
  const environment = installFakeEnvironment([thread]);
  const unsubscribe = () => () => {};
  const desktop = stubGlobal("desktopBridge", {
    getLocalEnvironmentEnabled: () => true,
    getLocalEnvironmentBearerToken: async () => "fixture-bearer",
    getLocalEnvironmentBootstraps: () => [],
    getClientPlatform: () => "win32",
    getAppBranding: () => null,
    getSystemLocale: () => null,
    getWindowZoomFactor: () => 1,
    onQuitShortcut: unsubscribe,
    onTrackpadScrollBegin: unsubscribe,
    onTrackpadScrollEnd: unsubscribe,
    onNotificationBadgeClear: unsubscribe,
    onMenuAction: unsubscribe,
  } satisfies Partial<DesktopBridge>);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const router = getRouter(
    createMemoryHistory({ initialEntries: ["/" + ENVIRONMENT_ID + "/" + thread.id] }),
  );
  const cleanup = () => {
    desktop[Symbol.dispose]();
    environment[Symbol.dispose]();
    style.remove();
    store.clearComposerContent(threadRef);
  };
  try {
    await page.viewport(1400, 900);
    await router.load();
    expect(router.state.matches.find((match) => match.status === "error")?.error).toBeUndefined();
    const screen = await render(
      <StrictMode>
        <AppRoot router={router} />
      </StrictMode>,
      { router: false },
    );
    return {
      router,
      thread,
      chatDraft,
      originalPrompt,
      original: () => useComposerDraftStore.getState().getComposerDraft(threadRef),
      file,
      async [Symbol.asyncDispose]() {
        try {
          await screen[Symbol.asyncDispose]();
        } finally {
          cleanup();
        }
      },
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}

async function openClipperEntry() {
  await expect.element(page.getByTestId("composer-editor")).toBeVisible();
  await page.getByRole("button", { name: /^Attach files/ }).click();
  await page.getByRole("menuitem", { name: clipActionName }).click();
  const dialog = page.getByRole("dialog", { name: clipActionName });
  await expect.element(dialog).toBeVisible();
  return dialog;
}

it("opens a local Clipper project and resumes the original chat with its unsent draft", async () => {
  await using fixture = await mountChat("clip-picker");
  const dialog = await openClipperEntry();
  const goal = dialog.getByRole("textbox", { name: "What clips do you want?" });
  const useDraft = dialog.getByRole("checkbox", { name: "Use my chat draft as the clip goal" });
  await expect.element(useDraft).not.toBeChecked();
  await expect.element(goal).toHaveValue("");
  await userEvent.upload(
    dialog.getByLabelText("Choose a video file"),
    recording("owned-recording.webm"),
  );
  const manualGoal = "Find the clearest moment for a short tutorial.";
  await goal.fill(manualGoal);
  await dialog.getByRole("button", { name: "Create Clipper project" }).click();

  const player = page.getByLabelText("Source video");
  await expect.element(player).toBeVisible();
  await expect.poll(() => (player.element() as HTMLVideoElement).duration).toBeCloseTo(2);
  expect((player.element() as HTMLVideoElement).src).toMatch(/^blob:/);
  await expect
    .element(page.getByRole("textbox", { name: "What should the clip show?" }))
    .toHaveValue(manualGoal);
  expect(dispatchedCommands().filter(({ type }) => type !== "thread.visit")).toEqual([]);

  const studioHash = fixture.router.state.location.hash;
  const projectId = projectFromHash(studioHash, ENVIRONMENT_ID);
  expect(projectId).toBeTruthy();
  const saved = (await listDrafts(ENVIRONMENT_ID)).find(({ id }) => id === projectId);
  expect(saved).toMatchObject({ id: projectId, category: "clipper", stage: "source" });
  expect(JSON.stringify(saved)).not.toContain(manualGoal);
  expect(JSON.stringify(saved)).not.toContain("owned-recording.webm");

  await resumeChat(fixture.router, fixture.thread.id);
  const editor = page.getByTestId("composer-editor");
  await expect.element(editor).toBeVisible();
  await expect.poll(() => editor.element().textContent).toContain(fixture.chatDraft);
  expect(fixture.original()).toMatchObject({
    prompt: fixture.originalPrompt,
    files: [fixture.file],
  });

  await act(() => fixture.router.navigate({ to: "/", hash: studioHash }));
  await expect
    .element(page.getByRole("textbox", { name: "What should the clip show?" }))
    .toHaveValue("");
  await expect.element(page.getByLabelText("Source video")).not.toBeInTheDocument();
  expect(dispatchedCommands().filter(({ type }) => type !== "thread.visit")).toEqual([]);
});

it("accepts a real file drop and uses the unsent text only after explicit opt-in", async () => {
  await using fixture = await mountChat("clip-drop");
  const dialog = await openClipperEntry();
  const goal = dialog.getByRole("textbox", { name: "What clips do you want?" });
  const useDraft = dialog.getByRole("checkbox", { name: "Use my chat draft as the clip goal" });
  const create = dialog.getByRole("button", { name: "Create Clipper project" });
  await expect.element(create).toBeDisabled();

  const transfer = new DataTransfer();
  transfer.items.add(recording("dropped-recording.webm"));
  const target = dialog.getByLabelText("Drop a video here").element();
  await act(() => {
    target.dispatchEvent(
      new DragEvent("dragover", { dataTransfer: transfer, bubbles: true, cancelable: true }),
    );
    target.dispatchEvent(
      new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }),
    );
  });
  await expect.element(goal).toHaveValue("");
  await expect.element(create).toBeDisabled();
  await useDraft.click();
  await expect.element(goal).toHaveValue(fixture.chatDraft);
  await create.click();

  await expect.element(page.getByLabelText("Source video")).toBeVisible();
  await expect.element(page.getByText("dropped-recording.webm", { exact: true })).toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: "What should the clip show?" }))
    .toHaveValue(fixture.chatDraft);
  expect(fixture.original()).toMatchObject({
    prompt: fixture.originalPrompt,
    files: [fixture.file],
  });
  const projectId = projectFromHash(fixture.router.state.location.hash, ENVIRONMENT_ID);
  const readProject = async () =>
    (await listDrafts(ENVIRONMENT_ID)).find(({ id }) => id === projectId);
  expect(await readProject()).toMatchObject({ category: "clipper", stage: "source" });
  expect(JSON.stringify(await readProject())).not.toContain(fixture.chatDraft);
  await page.getByRole("button", { name: "Save goal with this project" }).click();
  await expect.poll(async () => (await readProject())?.fields.clipGoal).toBe(fixture.chatDraft);
  expect(JSON.stringify(await readProject())).not.toContain("dropped-recording.webm");
  expect(dispatchedCommands().filter(({ type }) => type !== "thread.visit")).toEqual([]);
});

it("cancels with Escape and clears the pending source and goal", async () => {
  await using fixture = await mountChat("clip-cancel");
  const before = (await listDrafts(ENVIRONMENT_ID)).map(({ id }) => id);
  const dialog = await openClipperEntry();
  await userEvent.upload(dialog.getByLabelText("Choose a video file"), recording("cancelled.webm"));
  await dialog.getByRole("textbox", { name: "What clips do you want?" }).fill("An abandoned goal");
  await userEvent.keyboard("{Escape}");
  await expect.element(dialog).not.toBeInTheDocument();

  const reopened = await openClipperEntry();
  await expect
    .element(reopened.getByRole("textbox", { name: "What clips do you want?" }))
    .toHaveValue("");
  await expect
    .element(reopened.getByRole("button", { name: "Create Clipper project" }))
    .toBeDisabled();
  await reopened.getByRole("button", { name: "Cancel" }).click();
  await expect.element(reopened).not.toBeInTheDocument();
  const editor = page.getByTestId("composer-editor");
  await expect.element(editor).toBeVisible();
  await expect.poll(() => editor.element().textContent).toContain(fixture.chatDraft);
  expect(fixture.original()).toMatchObject({
    prompt: fixture.originalPrompt,
    files: [fixture.file],
  });
  expect((await listDrafts(ENVIRONMENT_ID)).map(({ id }) => id)).toEqual(before);
  expect(dispatchedCommands().filter(({ type }) => type !== "thread.visit")).toEqual([]);
});
