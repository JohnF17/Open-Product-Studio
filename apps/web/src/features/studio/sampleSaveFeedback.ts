import { useSyncExternalStore } from "react";

type Status = "saved" | "uncertain" | "cancelled" | "occupied" | "failed";
const messages: Record<Status, string> = {
  saved: "Last sample export was saved.",
  uncertain: "A sample save was started. Check the destination before exporting again.",
  cancelled: "The last sample save was cancelled.",
  occupied: "The last sample save found an existing filename. Choose a new name to save a copy.",
  failed: "The last sample save could not finish.",
};
const updates = new EventTarget();
const fallback = new Map<string, Status>();

export function sampleFeedbackKey(workspace: string, project: string) {
  return "studio:clipper:last-save:" + JSON.stringify([workspace, project]);
}

/** Store status text only. Native approval, file paths and render handles never leave their owner. */
export function rememberSampleSave(key: string, status: Status) {
  fallback.set(key, status);
  try { localStorage.setItem(key, status); } catch { /* Keep feedback for this window. */ }
  updates.dispatchEvent(new Event(key));
}

export function useSampleSaveMessage(key: string) {
  const status = useSyncExternalStore(
    (notify) => {
      const onStorage = (event: StorageEvent) => { if (event.key === key) notify(); };
      updates.addEventListener(key, notify);
      window.addEventListener("storage", onStorage);
      return () => { updates.removeEventListener(key, notify); window.removeEventListener("storage", onStorage); };
    },
    () => {
      try { return localStorage.getItem(key) ?? fallback.get(key); }
      catch { return fallback.get(key); }
    },
    () => undefined,
  );
  return status && Object.hasOwn(messages, status) ? messages[status as Status] : undefined;
}
