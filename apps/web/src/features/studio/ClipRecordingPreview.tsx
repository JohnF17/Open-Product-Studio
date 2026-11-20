import { Film, Play, Square, Upload } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatClipTime, parseClipTime, readClipRange } from "./clipTimes";
import "./clipRecordingPreview.css";
import { clipVideoAccept, localVideoType, openClipSourceFile, primeClipPlayback } from "./clipperEvidence";
import type { SourceVideo } from "./ClipperSource";

interface MarkProps {
  fields: Record<string, string>;
  writeField: (key: string, value: string) => void;
  onDuration?: ((ms: number | undefined) => void) | undefined;
}

type Mark = "markIn" | "markOut";

function Player({ url, fields, writeField, onDuration, selectionAttempt }: MarkProps & { url: string; selectionAttempt: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const focusPreview = useRef(false);
  const playRequest = useRef(0);
  const [duration, setDuration] = useState<number>();
  const [mediaError, setMediaError] = useState("");
  const [playError, setPlayError] = useState("");
  const [bound, setBound] = useState<Partial<Record<Mark, string>>>({});
  const [playing, setPlaying] = useState(false);
  const selection = readClipRange(fields, duration);
  const confirmed = !!selection && bound.markIn === fields.markIn && bound.markOut === fields.markOut;
  const playable = duration !== undefined && !mediaError;
  const inMs = parseClipTime(fields.markIn ?? "");
  const outMs = parseClipTime(fields.markOut ?? "");
  const start = selection?.start;
  const end = selection?.end;

  useLayoutEffect(() => {
    if (confirmed && focusPreview.current) {
      focusPreview.current = false;
      previewButton.current?.focus();
    }
  }, [confirmed]);

  useLayoutEffect(() => {
    const node = video.current;
    setPlaying(false);
    return () => { ++playRequest.current; node?.pause(); };
  }, [selectionAttempt]);

  useEffect(() => {
    const node = video.current;
    if (!playing || !node || start === undefined || end === undefined) return;
    const startSeconds = start / 1000;
    const endSeconds = end / 1000;
    let frame = 0;
    function stop() {
      ++playRequest.current;
      if (node) node.pause();
      setPlaying(false);
    }
    function check() {
      if (!node || node.seeking) return;
      if (node.currentTime >= endSeconds) {
        stop();
        node.currentTime = endSeconds;
      } else if (node.currentTime < startSeconds - 0.001) {
        stop();
      }
    }
    function tick() {
      check();
      if (node && !node.paused) frame = requestAnimationFrame(tick);
    }
    function onPlay() { cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); }
    function onVisibility() { if (document.hidden) stop(); }
    frame = requestAnimationFrame(tick);
    node.addEventListener("timeupdate", check);
    node.addEventListener("seeked", check);
    node.addEventListener("playing", onPlay);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("timeupdate", check);
      node.removeEventListener("seeked", check);
      node.removeEventListener("playing", onPlay);
      document.removeEventListener("visibilitychange", onVisibility);
      node.pause();
    };
  }, [playing, start, end]);

  // Edits to a live mark end its audition, including edits that make it invalid.
  useEffect(() => {
    if (playing && !confirmed) {
      video.current?.pause();
      setPlaying(false);
    }
  }, [playing, confirmed]);

  function readDuration(node: HTMLVideoElement) {
    const ms = Math.round(node.duration * 1000);
    const measured = Number.isSafeInteger(ms) && ms > 0 ? ms : undefined;
    setDuration(measured);
    onDuration?.(measured);
  }
  function stopPreview() {
    ++playRequest.current;
    video.current?.pause();
    setPlaying(false);
  }
  function setMark(key: Mark) {
    const node = video.current;
    if (!node || !playable || duration === undefined) return;
    stopPreview();
    const value = formatClipTime(Math.min(duration, Math.round(node.currentTime * 1000)));
    if (!value) return;
    setBound((old) => ({ ...old, [key]: value }));
    writeField(key, value);
  }
  function seek(ms: number | null) {
    if (!video.current || ms === null || duration === undefined || ms > duration) return;
    stopPreview();
    video.current.currentTime = ms / 1000;
  }
  async function preview() {
    const node = video.current;
    if (!node || !selection || !playable || !confirmed) return;
    const request = ++playRequest.current;
    setPlayError("");
    node.currentTime = selection.start / 1000;
    setPlaying(true);
    try { await node.play(); }
    catch {
      if (request === playRequest.current) {
        setPlaying(false);
        setPlayError("Playback could not start. Try the player controls or choose another recording.");
      }
    }
  }
  return (
    <>
      <video ref={video} className="ops-recording-player" controls playsInline disableRemotePlayback preload="metadata"
        src={url} aria-label="Local recording" onLoadedMetadata={({ currentTarget }) => { primeClipPlayback(currentTarget); readDuration(currentTarget); }}
        onDurationChange={(e) => readDuration(e.currentTarget)}
        onPause={() => { ++playRequest.current; }} onEnded={stopPreview}
        onError={() => { stopPreview(); setMediaError("This recording could not be played. Choose a compatible MP4 or WebM, or enter the marks below by hand."); }} />
      <div className="ops-recording-readout">
        <span>Recording <strong>{duration === undefined ? "—" : formatClipTime(duration)}</strong></span>
        <span>Selection <strong>{playable && selection ? formatClipTime(selection.duration) : "—"}</strong></span>
      </div>
      <div className="ops-recording-marks">
        {(["markIn", "markOut"] as const).map((key) => {
          const isIn = key === "markIn";
          const ms = isIn ? inMs : outMs;
          const label = isIn ? "in" : "out";
          return <div key={key}>
            <button type="button" className="ops-button" disabled={!playable} onClick={() => setMark(key)}>Set mark {label}</button>
            <button type="button" className="ops-link" aria-label={"Go to mark " + label} disabled={!playable || ms === null || ms > duration!} onClick={() => seek(ms)}>{ms === null ? "—" : formatClipTime(ms)}</button>
          </div>;
        })}
      </div>
      {mediaError ? <p role="alert">{mediaError}</p> : !playable ? (
        <p role="status">Waiting for a finite duration. If it stays unavailable, use an exported MP4 or WebM, or enter marks by hand.</p>
      ) : !selection ? (
        <p>Scrub to each endpoint and set its mark. Mark out must follow mark in and fit within this recording.</p>
      ) : !confirmed ? (
        <div className="ops-recording-bind">
          <p>Check the saved marks against this recording before previewing them.</p>
          <button type="button" className="ops-button" onClick={() => {
            focusPreview.current = true;
            setBound({ markIn: fields.markIn!, markOut: fields.markOut! });
          }}>Use saved marks for this recording</button>
        </div>
      ) : null}
      {(playError && !mediaError) && <p role="alert">{playError}</p>}
      <button type="button" ref={previewButton} className="ops-button ops-primary" disabled={!playing && !(playable && confirmed)}
        onClick={playing ? stopPreview : () => void preview()}>
        {playing ? <Square size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        {playing ? "Stop preview" : "Preview selection"}
      </button>
    </>
  );
}

function OpenRecording({ file, verified, ...props }: MarkProps & { file: File; verified: boolean; selectionAttempt: number }) {
  const [opened, setOpened] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    let active = true;
    let owned = "";
    setError("");
    async function open() {
      try {
        const type = verified ? file.type : await localVideoType(file);
        if (!active) return;
        if (!type) {
          setError("Choose a compatible MP4 or WebM video. You can also enter the marks below by hand.");
          return;
        }
        owned = URL.createObjectURL(file.slice(0, file.size, type));
        setOpened({ file, url: owned });
      } catch {
        if (active) setError("The file could not be read. Choose the recording again.");
      }
    }
    void open();
    return () => { active = false; if (owned) URL.revokeObjectURL(owned); };
  }, [file, verified]);
  if (error) return <p role="alert">{error}</p>;
  return opened?.file === file ? <Player key={opened.url} url={opened.url} {...props} /> : <p role="status">Opening recording…</p>;
}

interface RecordingProps extends MarkProps {
  sourceFile?: File | undefined;
  mediaRevision?: string | undefined;
  onSourceVideoChange?: ((video: SourceVideo | null) => void) | undefined;
}

export function ClipRecordingPreview({ sourceFile, mediaRevision, onSourceVideoChange, ...props }: RecordingProps) {
  const [local, setLocal] = useState<{ file: File; mediaRevision?: string | undefined } | null>(
    !onSourceVideoChange && sourceFile ? { file: sourceFile, mediaRevision } : null,
  );
  const [selectionAttempt, setSelectionAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const candidate = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const file = onSourceVideoChange ? sourceFile : local?.file;
  const revision = onSourceVideoChange ? mediaRevision : local?.mediaRevision;

  useLayoutEffect(() => {
    setOpening(false);
    setError("");
    return () => { candidate.current?.abort(); candidate.current = null; };
  }, [sourceFile, mediaRevision]);

  async function choose(next: File) {
    candidate.current?.abort();
    const request = new AbortController();
    candidate.current = request;
    setSelectionAttempt((previous) => previous + 1);
    setOpening(true);
    setError("");
    try {
      const verified = await openClipSourceFile(next, request.signal);
      request.signal.throwIfAborted();
      if (onSourceVideoChange) onSourceVideoChange(verified);
      else setLocal(verified);
      props.onDuration?.(verified.durationMs);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "The recording could not be opened.");
    } finally {
      if (candidate.current === request) { candidate.current = null; setOpening(false); }
    }
  }

  function remove() {
    candidate.current?.abort();
    candidate.current = null;
    setOpening(false);
    setError("");
    if (onSourceVideoChange) onSourceVideoChange(null);
    else setLocal(null);
    props.onDuration?.(undefined);
    input.current?.focus();
  }

  return (
    <section className="ops-recording" aria-label="Recording preview">
      <div className="ops-recording-header">
        <div><Film size={18} aria-hidden="true" /><h3>Recording preview</h3></div>
        {file && <button type="button" className="ops-link" onClick={remove}>Remove recording</button>}
      </div>
      <p>Choose a recording you have permission to use. Studio saves your written marks with the project. Video stays in memory.</p>
      <label className="ops-recording-picker">
        <Upload size={16} aria-hidden="true" /> Choose a local recording
        <input type="file" ref={input} accept={clipVideoAccept} onChange={(e) => {
          const next = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (next) void choose(next);
        }} />
      </label>
      {opening && <p role="status">Checking the selected recording…</p>}
      {error && <p role="alert">{error}</p>}
      {file && <>
        <p className="ops-recording-name">{file.name}</p>
        <OpenRecording key={revision} file={file} verified={!!revision} selectionAttempt={selectionAttempt} {...props} />
      </>}
    </section>
  );
}
