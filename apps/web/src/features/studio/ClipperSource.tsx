import { Film, Upload } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatClipTime } from "./clipTimes";
import {
  openClipSourceFile,
  primeClipPlayback,
  clipSourceLink,
  clipVideoAccept,
  type ClipperEvidence,
  type ClipTranscriptCue,
  prepareClipperEvidence,
  readClipCaptions,
} from "./clipperEvidence";
import { useClipperRecording } from "./useClipperRecording";
import { ClipLinkImport } from "./ClipLinkImport";
import { ClipperLocalTranscription } from "./ClipperLocalTranscription";
import "./clipRecordingPreview.css";
import "./clipperSource.css";

export interface SourceVideo {
  file: File;
  mediaRevision: string;
  durationMs: number;
}

export interface ClipperSourceState {
  video: SourceVideo | null;
  link: string;
  instruction: string;
  captions: { name: string; cues: ClipTranscriptCue[] } | null;
}

export const emptyClipperSource: ClipperSourceState = { video: null, link: "", instruction: "", captions: null };

interface Props {
  projectId: string;
  source: ClipperSourceState;
  onSourceChange: Dispatch<SetStateAction<ClipperSourceState>>;
  onEvidenceInputsChange?: ((mediaRevision?: string) => void) | undefined;
  onDuration?: ((durationMs: number | undefined) => void) | undefined;
  onEvidenceReady?: ((evidence: ClipperEvidence, signal: AbortSignal) => void | Promise<void>) | undefined;
}

function useObjectUrl(blob: Blob | undefined) {
  const [entry, setEntry] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return entry?.blob === blob ? entry?.url : undefined;
}

function SourcePlayback({ source }: { source: SourceVideo }) {
  const url = useObjectUrl(source.file);
  const [errorUrl, setErrorUrl] = useState<string>();
  if (!url) return null;
  return (
    <>
      <video
        key={url}
        className="ops-recording-player"
        controls playsInline disableRemotePlayback preload="metadata" src={url}
        aria-label="Source video"
        onLoadedMetadata={({ currentTarget }) => primeClipPlayback(currentTarget)}
        onError={() => setErrorUrl(url)}
      />
      {errorUrl === url && <p role="alert">The browser could not play this video. Try another MP4 or WebM.</p>}
      <div className="ops-recording-readout">
        <span className="ops-source-filename">{source.file.name}</span>
        <span>Duration <strong>{formatClipTime(source.durationMs)}</strong></span>
      </div>
    </>
  );
}

function EvidenceReview({ evidence, onEvidenceReady, onPending }: {
  evidence: ClipperEvidence;
  onEvidenceReady: Props["onEvidenceReady"];
  onPending: (pending: boolean) => void;
}) {
  const url = useObjectUrl(evidence.contactSheet);
  const [handoff, setHandoff] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [imageReady, setImageReady] = useState(false);
  const request = useRef<AbortController | null>(null);
  useLayoutEffect(() => () => request.current?.abort(), []);
  async function selectEvidence() {
    if (!onEvidenceReady || request.current || handoff === "done") return;
    const operation = new AbortController();
    request.current = operation;
    setHandoff("busy");
    onPending(true);
    try {
      await onEvidenceReady(evidence, operation.signal);
      if (!operation.signal.aborted) setHandoff("done");
    } catch {
      if (!operation.signal.aborted) setHandoff("error");
    } finally {
      request.current = null;
      if (!operation.signal.aborted) onPending(false);
    }
  }
  return (
    <section className="ops-source-review" aria-label="Evidence preview">
      <h3>Review evidence for AI</h3>
      <p>The times below show where each frame came from.</p>
      {url && <img src={url} alt="Contact sheet of sampled video frames" onLoad={() => setImageReady(true)} />}
      <p>{evidence.frames.map(({ id, timeMs }) => id + " " + formatClipTime(timeMs)).join(" · ")}</p>
      <div><strong>Instruction</strong><p className="ops-source-verbatim">{evidence.instruction}</p></div>
      {evidence.transcript?.length ? (
        <div>
          <strong>Caption excerpt</strong>
          <ol className="ops-source-cues">
            {evidence.transcript.map(({ id, text, startMs, endMs }) => (
              <li key={id}>
                <span>{id} · {formatClipTime(startMs)} – {formatClipTime(endMs)}</span>
                <p className="ops-source-verbatim">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : <p>No caption excerpt is included.</p>}
      {onEvidenceReady ? (
        <>
          <p>Use reviewed evidence adds this image, your instruction and any caption excerpt shown here to an unsent T3 chat draft. Your provider receives them when you send the message.</p>
          <button type="button" className="ops-button ops-primary" disabled={!imageReady || handoff === "busy" || handoff === "done"}
            onClick={() => void selectEvidence()}>{handoff === "busy" ? "Preparing handoff..." : "Use reviewed evidence"}</button>
        </>
      ) : <p>Evidence preview is local. An AI handoff is unavailable here.</p>}
      {handoff === "done" && <p role="status">Evidence selected for the AI handoff.</p>}
      {handoff === "error" && <p role="alert">The evidence handoff could not be prepared. Try again.</p>}
    </section>
  );
}

export function ClipperSource({ projectId, source, onSourceChange, onEvidenceReady, onEvidenceInputsChange, onDuration }: Props) {
  const choose = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [linkInput, setLinkInput] = useState(source.link);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"video" | "captions" | "evidence">();
  const [evidence, setEvidence] = useState<ClipperEvidence>();
  const [handingOff, setHandingOff] = useState(false);
  const capture = useClipperRecording((file) => void importVideo(file), setError);

  useLayoutEffect(() => () => pending.current?.abort(), []);

  function resetEvidence() {
    pending.current?.abort();
    pending.current = null;
    setBusy(undefined);
    setEvidence(undefined);
    setError("");
  }

  async function run(kind: typeof busy, task: (signal: AbortSignal) => Promise<void>) {
    resetEvidence();
    const operation = new AbortController();
    pending.current = operation;
    setBusy(kind);
    try {
      await task(operation.signal);
    } catch (cause) {
      if (!operation.signal.aborted) {
        setError(cause instanceof Error && cause.name === "Error"
          ? cause.message : "Could not read this file. Choose another file and try again.");
      }
    } finally {
      if (pending.current === operation) {
        pending.current = null;
        setBusy(undefined);
      }
    }
  }

  async function importVideo(file: File) {
    await run("video", async (signal) => {
      const video = await openClipSourceFile(file, signal);
      signal.throwIfAborted();
      onSourceChange((current) => ({
        ...current,
        video,
        captions: current.video?.mediaRevision === video.mediaRevision ? current.captions : null,
      }));
      onEvidenceInputsChange?.(video.mediaRevision);
      onDuration?.(video.durationMs);
    });
  }

  const capturing = capture.phase !== "idle";
  const inputBusy = handingOff || capturing || busy === "video" || busy === "captions";
  const activeVideo = source.video;
  return (
    <div className="ops-source">
      <section className="ops-recording" aria-label="Source media">
        <div className="ops-recording-header">
          <div><Film size={18} aria-hidden="true" /><h3>Source media</h3></div>
          {activeVideo && (
            <button type="button" className="ops-link" disabled={handingOff || capturing} onClick={() => {
              resetEvidence();
              onSourceChange((current) => ({ ...current, video: null, captions: null }));
              onEvidenceInputsChange?.();
              onDuration?.(undefined);
              choose.current?.focus();
            }}>Remove video</button>
          )}
        </div>
        <div className="ops-source-drop" role="group" aria-label="Video file drop area"
          onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
          onDrop={(event) => {
            event.preventDefault();
            if (handingOff || capturing || !event.dataTransfer.files.length) return;
            if (event.dataTransfer.files.length !== 1) {
              setError("Drop one video at a time.");
              return;
            }
            const file = event.dataTransfer.files[0];
            if (file) void importVideo(file);
          }}
        >
          <label className="ops-recording-picker">
            <Upload size={16} aria-hidden="true" /> Choose a video file
            <input type="file" ref={choose} accept={clipVideoAccept} disabled={handingOff || capturing} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void importVideo(file);
            }} />
          </label>
          <p>Or drop one MP4 or WebM here. Maximum 250 MiB.</p>
        </div>
        {capture.available ? (
          <div className="ops-source-actions">
            {capture.phase === "idle" && <button type="button" className="ops-button" disabled={handingOff || busy === "video" || busy === "captions"}
              onClick={() => void capture.start()}>Choose a screen or window</button>}
            {capture.phase === "choosing" && <button type="button" className="ops-button" onClick={capture.cancel}>Cancel recording request</button>}
            {capture.phase === "recording" && <button type="button" className="ops-button ops-primary" onClick={capture.stop}>Stop recording</button>}
            {capture.phase === "recording" && <button type="button" className="ops-button" onClick={capture.cancel}>Discard recording</button>}
            <p role="status">{{
              idle: "The browser asks what to share. Recording is silent and lasts up to five minutes.",
              choosing: "Waiting for the browser’s sharing chooser.",
              recording: "Recording in progress. Leaving Source or hiding this page stops capture.",
              finishing: "Finishing your recording…",
            }[capture.phase]}</p>
          </div>
        ) : <p>Screen recording is unavailable here. Choose a local video file to continue.</p>}
        {activeVideo && <SourcePlayback source={activeVideo} />}
        <details className="ops-reference ops-source-link">
          <summary>Keep a video link</summary>
          <form className="ops-source-review" onSubmit={(event) => {
            event.preventDefault();
            const link = clipSourceLink(linkInput);
            if (!link) {
              setError("Enter an HTTP or HTTPS video link without account credentials.");
              return;
            }
            setError("");
            setLinkInput(link);
            onSourceChange((current) => ({ ...current, link }));
          }}>
            <label className="ops-field">
              <span>Video link</span>
              <input type="text" inputMode="url" autoCapitalize="off" autoComplete="off" spellCheck={false}
                maxLength={2048} value={linkInput} onChange={(event) => setLinkInput(event.currentTarget.value)}
                placeholder="https://…" />
            </label>
            <button type="submit" className="ops-button">Keep link as reference</button>
          </form>
          <ClipLinkImport key={source.video?.mediaRevision} link={linkInput} disabled={inputBusy} onFile={file => void importVideo(file)} />
        </details>
        {source.link && <div className="ops-source-reference">
          <p>Reference only. No video acquired from this link. Import a copy you have permission to use.</p>
          <p className="ops-source-filename">{source.link}</p>
          <button type="button" className="ops-link" onClick={() => {
            setLinkInput("");
            onSourceChange((current) => ({ ...current, link: "" }));
          }}>Remove link</button>
        </div>}
        <p>Your original video stays on this device. Reattach it when you reopen the project.</p>
      </section>
      <label className="ops-field">
        <span>What should the clip show?</span>
        <textarea rows={3} maxLength={2000} value={source.instruction} disabled={handingOff}
          placeholder="Find the part where the instructor demonstrates the full knot."
          onChange={(event) => {
            const instruction = event.currentTarget.value;
            if (instruction.trim() !== source.instruction.trim()) onEvidenceInputsChange?.();
            if (busy === "evidence") resetEvidence();
            else setEvidence(undefined);
            onSourceChange((current) => ({ ...current, instruction }));
          }} />
      </label>
      {activeVideo && <div className="ops-source-actions">
        <label className="ops-recording-picker">
          <Upload size={16} aria-hidden="true" /> Import captions (optional)
          <input type="file" accept=".vtt,.srt,text/vtt" disabled={inputBusy} onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void run("captions", async (signal) => {
              const cues = await readClipCaptions(file);
              signal.throwIfAborted();
              onSourceChange((current) => ({ ...current, captions: { name: file.name, cues } }));
              onEvidenceInputsChange?.();
            });
          }} />
        </label>
        <p>Choose a timed UTF-8 WebVTT or SRT file up to 256 KiB.</p>
        <ClipperLocalTranscription
          key={activeVideo.mediaRevision}
          video={activeVideo}
          captions={source.captions}
          disabled={inputBusy || busy === "evidence"}
          onApply={(expected, captions) => {
            if (inputBusy || busy === "evidence" || activeVideo !== expected.video || source.captions !== expected.captions) return;
            resetEvidence();
            onSourceChange((current) =>
              current.video === expected.video && current.captions === expected.captions
                ? { ...current, captions } : current,
            );
            onEvidenceInputsChange?.();
          }}
        />
        {source.captions && <>
          <p className="ops-source-filename">{source.captions.name}</p>
          <button type="button" className="ops-link" disabled={inputBusy} onClick={() => {
            resetEvidence();
            onSourceChange((current) => ({ ...current, captions: null }));
            onEvidenceInputsChange?.();
          }}>Remove captions</button>
        </>}
      </div>}
      {activeVideo && !evidence && <div className="ops-source-actions">
        <button type="button" className="ops-button ops-primary"
          disabled={!!busy || capturing || !source.instruction.trim()}
          onClick={() => void run("evidence", async (signal) => {
            const prepared = await prepareClipperEvidence(
              projectId, activeVideo.file, activeVideo.mediaRevision, source.instruction.trim(), source.captions?.cues ?? [], signal,
            );
            signal.throwIfAborted();
            setEvidence(prepared);
          })}>Prepare evidence</button>
        {!source.instruction.trim() && <p>Enter an instruction to prepare an evidence preview.</p>}
      </div>}
      {busy && <p role="status">{{
        video: "Checking the local video…",
        captions: "Reading caption times…",
        evidence: "Sampling video frames on this device…",
      }[busy]}</p>}
      {error && <p role="alert">{error}</p>}
      {evidence && !capturing && <EvidenceReview evidence={evidence} onEvidenceReady={onEvidenceReady} onPending={setHandingOff} />}
    </div>
  );
}
