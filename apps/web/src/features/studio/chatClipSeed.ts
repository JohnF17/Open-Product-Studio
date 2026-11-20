import { createDraft, saveDraft } from "./drafts";
import { rememberClipChatSource } from "./clipChatReturn";
import type { SourceVideo } from "./ClipperSource";

/** Persist a normal project. The local File enters only this window's one-shot source transfer. */
export async function createChatClipProject(workspace: string, video: SourceVideo, instruction: string) {
  const draft = createDraft(workspace, "clipper");
  const goal = instruction.trim();
  draft.title = "Clips from chat";
  await saveDraft(draft, 0);
  rememberClipChatSource(workspace, draft.id, { video, instruction: goal, captions: null, link: "" });
  return draft.id;
}
