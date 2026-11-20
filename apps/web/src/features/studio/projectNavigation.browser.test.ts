import { expect, it } from "vite-plus/test";
import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { DraftId } from "../../composerDraftStore";
import { randomUUID } from "../../lib/randomUUID";
import { makeThreadFixture } from "../../test-fixtures";
import { createDraft, DraftEditor, insertDraft, readDraft, saveDraft } from "./drafts";
import { observeStudioEditor, rememberProjectChat, studioProjectIndex } from "./projectIndex";
import { projectFromHash, studioProjectHash } from "./projectNavigation";
import { studioProjectShelves } from "./projectShelves";

it("observes new, renamed, finished, reopened, restored and legacy projects within one workspace", async () => {
  const workspace = EnvironmentId.make(randomUUID());
  const other = EnvironmentId.make(randomUUID());
  const legacy = createDraft(workspace, "video");
  const editor = new DraftEditor(createDraft(workspace, "clipper"));
  const clip = editor.snapshot().draft;
  await saveDraft({ ...legacy, stage: "export" }, 0);
  await saveDraft({ ...legacy, workspaceId: other, title: "Other workspace" }, 0);
  const index = studioProjectIndex(workspace);
  const unsubscribe = index.subscribe(() => {});
  const close = observeStudioEditor(editor);
  try {
    await expect.poll(() => index.snapshot().length).toBe(2);
    const shelves = () => studioProjectShelves(workspace, index.snapshot(), []);
    expect(shelves().working.map((p) => p.project.category)).toEqual(["clipper"]);
    expect(shelves().settled.map((p) => p.project.id)).toEqual([legacy.id]);
    expect(shelves().finished).toEqual([]);
    editor.update({ title: "Review cut" });
    await editor.flush();
    expect(shelves().working[0]?.project.title).toBe("Review cut");
    const before = index.snapshot();
    editor.update({ fields: { privateNote: "Only in the builder" } });
    await editor.flush();
    expect(index.snapshot()).toBe(before);
    expect(JSON.stringify(index.snapshot())).not.toContain("Only in the builder");
    editor.update({ finished: true });
    await editor.flush();
    expect(shelves().finished[0]?.project.id).toBe(clip.id);
    editor.update({ finished: false });
    await editor.flush();
    close();
    await expect.poll(() => shelves().settled.length).toBe(2);
    await insertDraft(createDraft(workspace, "clipper"));
    await expect.poll(() => index.snapshot().some((row) => row.restoredCopy === 1)).toBe(true);
    expect(projectFromHash(studioProjectHash(workspace, legacy.id), other)).toBeNull();
    expect((await readDraft(workspace, legacy.id))?.stage).toBe("export");
    expect(await readDraft(other, clip.id)).toBeUndefined();
  } finally {
    close();
    unsubscribe();
  }
});

it("refreshes from IndexedDB on a sibling window's invalidation and ignores unrelated scopes", async () => {
  const workspace = randomUUID();
  const original = createDraft(workspace, "clipper");
  await saveDraft(original, 0);
  const index = studioProjectIndex(workspace);
  const stop = index.subscribe(() => {});
  const frame = document.createElement("iframe");
  frame.hidden = true;
  document.body.append(frame);
  try {
    await expect.poll(() => index.snapshot().length).toBe(1);
    // A same-origin frame has its own Window and sends native storage events to this one.
    const otherWindow = frame.contentWindow as Window & typeof globalThis;
    const draft = { ...original, revision: 2, title: "From another tab" };
    await new Promise<void>((resolve, reject) => {
      const request = otherWindow.indexedDB.open("open-product-studio-drafts");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("projects", "readwrite");
        tx.objectStore("projects").put(draft);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
    const key = "open-product-studio:project-list-change";
    const signal = (scope: string) =>
      new Promise<void>((resolve) => {
        window.addEventListener("storage", () => resolve(), { once: true });
        otherWindow.localStorage.setItem(key, JSON.stringify([scope, randomUUID()]));
      });
    await signal("another workspace");
    expect(index.snapshot()[0]?.title).not.toBe(draft.title);
    await signal(workspace);
    await expect.poll(() => index.snapshot()[0]?.title).toBe(draft.title);
  } finally {
    frame.remove();
    stop();
  }
});

it("uses only the matching live chat and keeps project completion explicit while its agent works", async () => {
  const workspace = EnvironmentId.make(randomUUID());
  const project = createDraft(workspace, "replica");
  const chat = {
    projectId: ProjectId.make("scratch"),
    threadId: ThreadId.make("thread"),
    draftId: DraftId.make("composer"),
  };
  await saveDraft(project, 0);
  rememberProjectChat(workspace, project.id, chat);
  const index = studioProjectIndex(workspace);
  const stop = index.subscribe(() => {});
  try {
    await expect.poll(() => index.snapshot()[0]?.chat).toEqual(chat);
    const thread = makeThreadFixture({
      environmentId: workspace,
      projectId: chat.projectId,
      id: chat.threadId,
    });
    const running = {
      ...thread,
      runtime: {
        status: "running" as const,
        activeRunId: null,
        providerInstanceId: thread.providerInstanceId,
        providerName: null,
        lastError: null,
        updatedAt: thread.updatedAt,
      },
    };
    const projectRow = index.snapshot()[0]!;
    const grouped = (threadRow: typeof thread, finished = false) =>
      studioProjectShelves(workspace, [{ ...projectRow, finished }], [threadRow]);
    expect(grouped(running).working[0]).toMatchObject({
      agentWorking: true,
      threadAvailable: true,
    });
    expect(grouped(running, true).finished[0]?.agentWorking).toBe(true);
    expect(
      grouped({ ...running, projectId: ProjectId.make("foreign") }).settled[0]?.threadAvailable,
    ).toBe(false);
    expect(
      grouped({ ...running, environmentId: EnvironmentId.make("other") }).settled[0]
        ?.threadAvailable,
    ).toBe(false);
  } finally {
    stop();
  }
});
