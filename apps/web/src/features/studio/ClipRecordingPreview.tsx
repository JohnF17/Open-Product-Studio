import { Film, Play, Square, Upload } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatClipTime, parseClipTime, readClipRange } from "./clipTimes";
import "./clipRecordingPreview.css";

interface MarkProps {
  fields: Record<string, string>;
  writeField: (key: string, value: string) => void;
  onDuration?: ((ms: number | undefined) => void) | undefined;
}

type Mark = "markIn" | "markOut";

// Only expose media containers to the native player. A renamed playlist or HTML file
// must never get a source URL, even if its extension or OS MIME type looks like video.
async function localVideoType(file: File) {
  const header = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) return "video/webm";
  const view = new DataView(header.buffer);
  for (let offset = 0; offset + 8 <= header.length;) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(...header.subarray(offset + 4, offset + 8));
    if (size < 8 || offset + size > file.size) break;
    if (type === "ftyp" && size >= 16) return "video/mp4";
    if (type !== "free" && type !== "skip" && type !== "wide") break;
    offset += size;
  }
  return null;
}

function Player({ url, fields, writeField, onDuration }: MarkProps & { url: string }) {
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

  useEffect(() => {
    const node = video.current;
    return () => { ++playRequest.current; node?.pause(); };
  }, []);

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
    const ms = Math.floor(node.duration * 1000);
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
        src={url} aria-label="Local recording" onLoadedMetadata={(e) => readDuration(e.currentTarget)}
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

function OpenRecording({ file, ...props }: MarkProps & { file: File }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let owned = "";
    async function open() {
      try {
        const type = await localVideoType(file);
        if (!active) return;
        if (!type) {
          setError("Choose a compatible MP4 or WebM video. You can also enter the marks below by hand.");
          return;
        }
        owned = URL.createObjectURL(file.slice(0, file.size, type));
        setUrl(owned);
      } catch {
        if (active) setError("The file could not be read. Choose the recording again.");
      }
    }
    void open();
    return () => { active = false; if (owned) URL.revokeObjectURL(owned); };
  }, [file]);
  if (error) return <p role="alert">{error}</p>;
  return url ? <Player url={url} {...props} /> : <p role="status">Opening recording…</p>;
}

export function ClipRecordingPreview(props: MarkProps) {
  const [picked, setPicked] = useState<{ file: File; key: number } | null>(null);
  const sequence = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="ops-recording" aria-label="Recording preview">
      <div className="ops-recording-header">
        <div><Film size={18} aria-hidden="true" /><h3>Recording preview</h3></div>
        {picked && <button type="button" className="ops-link" onClick={() => { setPicked(null); props.onDuration?.(undefined); input.current?.focus(); }}>Remove recording</button>}
      </div>
      <p>Choose a recording you have permission to use. The file stays on this sheet. Studio saves your written marks with the project.</p>
      <label className="ops-recording-picker">
        <Upload size={16} aria-hidden="true" /> Choose a local recording
        <input type="file" ref={input} accept=".mp4,.m4v,.webm,video/mp4,video/webm" onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) { props.onDuration?.(undefined); setPicked({ file, key: ++sequence.current }); }
        }} />
      </label>
      {picked && <>
        <p className="ops-recording-name">{picked.file.name}</p>
        <OpenRecording key={picked.key} file={picked.file} {...props} />
      </>}
    </section>
  );
}
