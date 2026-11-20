import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FilmIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "../ui/dialog";
import { clipVideoAccept, openClipSourceFile } from "../../features/studio/clipperEvidence";
import type { SourceVideo } from "../../features/studio/ClipperSource";
import { createChatClipProject } from "../../features/studio/chatClipSeed";
import { studioProjectHash } from "../../features/studio/projectNavigation";
import { formatClipTime } from "../../features/studio/clipTimes";
import { composerFloatingLayerProps } from "./composerEventScope";

export function ChatClipperEntry({ workspace, prompt, onCreated, onClose }: {
  workspace: string; prompt: string; onCreated?: ((id: string) => void) | undefined; onClose: () => void;
}) {
  const navigate = useNavigate();
  const operation = useRef<AbortController | null>(null);
  const committing = useRef(false);
  const mounted = useRef(false);
  const [video, setVideo] = useState<SourceVideo>();
  const [manualGoal, setManualGoal] = useState("");
  const [copiedGoal, setCopiedGoal] = useState<string | null>(null);
  const [phase, setPhase] = useState<"ready" | "reading" | "saving">("ready");
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");
  const goal = copiedGoal ?? manualGoal;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current?.abort(); };
  }, []);

  async function choose(files: File[]) {
    if (committing.current || savedId) return;
    operation.current?.abort();
    setVideo(undefined);
    setError("");
    if (files.length !== 1) { setPhase("ready"); setError("Choose one video at a time."); return; }
    const request = new AbortController();
    operation.current = request;
    setPhase("reading");
    try {
      const source = await openClipSourceFile(files[0]!, request.signal);
      if (!request.signal.aborted) setVideo(source);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not open this video.");
    } finally {
      if (!request.signal.aborted) setPhase("ready");
    }
  }

  async function submit() {
    if (committing.current || !video || !goal.trim()) return;
    committing.current = true;
    setPhase("saving"); setError("");
    let id = savedId;
    try {
      id ||= await createChatClipProject(workspace, video, goal);
      if (!mounted.current) return;
      if (!savedId) onCreated?.(id);
      setSavedId(id);
      await navigate({ to: "/", hash: studioProjectHash(workspace, id) });
      if (mounted.current) onClose();
    } catch {
      if (mounted.current) setError(id ? "The project was saved. Open it again or find it in Projects." : "Could not save this project on your device.");
    } finally {
      committing.current = false;
      if (mounted.current) setPhase("ready");
    }
  }
  const locked = phase === "saving" || Boolean(savedId);
  return <Dialog open onOpenChange={open => { if (!open && !committing.current) onClose(); }}>
    <DialogPopup {...composerFloatingLayerProps} showCloseButton={false} className="max-w-md space-y-4">
      <DialogTitle>Clip a video…</DialogTitle>
      <DialogDescription>The video and goal open in your new project. Choose “Save goal with this project” on Source to keep the instructions for next time.</DialogDescription>
      <div role="group" aria-label="Drop a video here" className="grid gap-2 rounded-lg border border-dashed p-4"
        onDragOver={event => { event.preventDefault(); event.stopPropagation(); }}
        onDrop={event => {
          event.preventDefault(); event.stopPropagation();
          if (!locked) void choose(Array.from(event.dataTransfer.files));
        }}>
        <span className="flex items-center gap-2 text-sm"><FilmIcon size={16} aria-hidden="true" />Drop a video here</span>
        <label className="grid gap-1 text-sm">Choose a video file
          <input className="w-full text-sm" type="file" accept={clipVideoAccept} disabled={locked}
            onChange={event => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (files.length) void choose(files);
            }} />
        </label>
        <small>{phase === "reading" ? "Reading your video…" : video ? video.file.name + " · " + formatClipTime(video.durationMs) : "MP4 or WebM, up to 250 MiB"}</small>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={copiedGoal !== null}
        disabled={locked || (!prompt.trim() && copiedGoal === null)} onChange={event => setCopiedGoal(event.target.checked ? prompt.slice(0, 2000) : null)} />
        Use my chat draft as the clip goal</label>
      <label className="grid gap-1 text-sm">What clips do you want?
        <textarea className="min-h-20 rounded-md border bg-background p-2" maxLength={2000} disabled={locked} value={goal}
          placeholder="Find three moments that show how to tie the knot."
          onChange={event => copiedGoal === null ? setManualGoal(event.target.value) : setCopiedGoal(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={phase === "saving"} onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={phase !== "ready" || !video || !goal.trim()} onClick={() => void submit()}>
          {savedId ? "Open saved project" : "Create Clipper project"}
        </Button>
      </div>
    </DialogPopup>
  </Dialog>;
}
