import type { ClipperSourceState } from "./ClipperSource";

// Only an explicit chat handoff retains the current source across the route change.
// File handles stay in this window's memory and expire if the user does not return.
let returnSource: { workspace: string; project: string; source: ClipperSourceState } | undefined;
let expiry: number | undefined;

export function forgetClipChatSource() {
  window.clearTimeout(expiry);
  returnSource = undefined;
}

export function rememberClipChatSource(workspace: string, project: string, source: ClipperSourceState) {
  forgetClipChatSource();
  if (!source.video) return;
  returnSource = { workspace, project, source };
  expiry = window.setTimeout(forgetClipChatSource, 10 * 60 * 1000);
}

export function readClipChatSource(workspace: string, project: string) {
  if (returnSource?.workspace === workspace && returnSource.project === project) return returnSource.source;
  return undefined;
}
