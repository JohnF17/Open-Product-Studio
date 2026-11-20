import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ClipEvidence, ClipPick } from "./clipPicks";
import { clipMediaRevision, primeClipPlayback } from "./clipperEvidence";
import { formatClipTime, readClipRange } from "./clipTimes";
import "./clipRecordingPreview.css";
import "./clipPickRange.css";

// A File is immutable. Repeated auditions can reuse its checked digest without retaining the file.
const knownRevisions = new WeakMap<File, string>();

function RangePlayer({ url, title, start, end }: { url: string; title: string; start?: number | undefined; end?: number | undefined }) {
  const video = useRef<HTMLVideoElement>(null);
  const request = useRef(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const available = start !== undefined && end !== undefined && duration >= end;
  useLayoutEffect(() => {
    const node = video.current;
    setPlaying(false);
    if (node && available) node.currentTime = start / 1000;
    return () => { request.current++; node?.pause(); };
  }, [start, end, available]);

  useEffect(() => {
    const node = video.current;
    if (!node || !playing || end === undefined) return;
    const endSeconds = end / 1000;
    let frame = 0;
    function check() {
      if (node && !node.seeking && node.currentTime >= endSeconds) {
        node.pause();
        node.currentTime = endSeconds;
      }
    }
    function tick() {
      check();
      if (!node?.paused) frame = requestAnimationFrame(tick);
    }
    function hide() { if (document.hidden) node?.pause(); }
    hide();
    frame = requestAnimationFrame(tick);
    node.addEventListener("timeupdate", check);
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("timeupdate", check);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [playing, end]);

  function measure(node: HTMLVideoElement) {
    setDuration(Number.isFinite(node.duration) ? Math.round(node.duration * 1000) : 0);
  }
  return <>
    <video ref={video} src={url} preload="auto" playsInline disableRemotePlayback disablePictureInPicture
      className="ops-recording-player" aria-label={"Footage for " + title}
      onLoadedMetadata={({ currentTarget }) => { primeClipPlayback(currentTarget); measure(currentTarget); }}
      onDurationChange={({ currentTarget }) => measure(currentTarget)}
      onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onError={() => { setDuration(0); setError("This recording could not be played."); }} />
    <button type="button" className="ops-button" disabled={!available} onClick={() => {
      const node = video.current;
      if (!node || !available) return;
      if (playing) { request.current++; node.pause(); return; }
      const current = ++request.current;
      setError("");
      node.currentTime = start / 1000;
      void node.play().catch(() => { if (current === request.current) setError("Playback could not start. Try playing the range again."); });
    }}>{playing ? "Stop this range" : "Play this range"}</button>
    {error && <p role="alert">{error}</p>}
  </>;
}

interface Props {
  file: File | undefined;
  evidence: ClipEvidence;
  picks: ClipPick[];
  index: number;
  expanded: boolean;
  onToggle: (open: boolean) => void;
  onSave: (next: ClipPick[]) => boolean;
}

function RangeEditor({ file, evidence, picks, index, onSave, onClose }: Omit<Props, "expanded" | "onToggle"> & {
  file: File; onClose: () => void;
}) {
  const pick = picks[index]!;
  const [start, setStart] = useState(formatClipTime(pick.startMs));
  const [end, setEnd] = useState(formatClipTime(pick.endMs));
  const [media, setMedia] = useState<{ file: File; url?: string; error?: string }>();
  const entry = media?.file === file ? media : undefined;
  useLayoutEffect(() => {
    const controller = new AbortController();
    let owned: string | undefined;
    async function open() {
      try {
        const revision = knownRevisions.get(file) ?? await clipMediaRevision(file, controller.signal);
        controller.signal.throwIfAborted();
        knownRevisions.set(file, revision);
        if (revision !== evidence.mediaRevision) {
          setMedia({ file, error: "This file differs from the reviewed footage. Reattach the matching recording on Source." });
          return;
        }
        owned = URL.createObjectURL(file);
        setMedia({ file, url: owned });
      } catch {
        if (!controller.signal.aborted) setMedia({ file, error: "Could not open this recording. Reattach it on Source." });
      }
    }
    void open();
    return () => { controller.abort(); if (owned) URL.revokeObjectURL(owned); };
  }, [file, evidence.mediaRevision]);

  if (!entry?.url) return <p role={entry?.error ? "alert" : "status"}>{entry?.error ?? "Opening the reviewed footage…"}</p>;
  const range = readClipRange({ markIn: start, markOut: end }, evidence.durationMs);
  const evidenceIds = range ? pick.evidenceIds.filter(id =>
    evidence.frames.some(f => f.id === id && f.timeMs >= range.start && f.timeMs < range.end) ||
    evidence.transcript?.some(c => c.id === id && c.startMs < range.end && c.endMs > range.start)) : [];
  const duplicate = range && picks.some((p, n) => n !== index && p.startMs === range.start && p.endMs === range.end);
  const error = !range ? "Enter a start before the end, both within the reviewed recording." :
    duplicate ? "Another cut already uses this same range." :
    !evidenceIds.length ? "Include at least one cited frame or caption in this cut." : "";
  const changed = range && (range.start !== pick.startMs || range.end !== pick.endMs);
  return <>
    <div className="ops-pick-times">
      <label className="ops-field"><span>Cut start</span><input value={start} maxLength={24} onChange={e => setStart(e.target.value)} /></label>
      <label className="ops-field"><span>Cut end</span><input value={end} maxLength={24} onChange={e => setEnd(e.target.value)} /></label>
    </div>
    <RangePlayer key={entry.url} url={entry.url} title={pick.title} start={range?.start} end={range?.end} />
    {error ? <p role="status">{error}</p> : <p>Citations retained in this range: {evidenceIds.join(", ")}</p>}
    <button type="button" className="ops-button" disabled={!!error || !changed} onClick={() => {
      if (!range || error || !changed) return;
      const next = picks.map((p, n) => n === index ? { ...p, startMs: range.start, endMs: range.end, evidenceIds } : p);
      if (onSave(next)) onClose();
    }}>Apply range</button>
  </>;
}

export function ClipPickRange(props: Props) {
  const { file, picks, index, expanded, onToggle } = props;
  const pick = picks[index]!;
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const open = expanded && !!file;
  return <div className="ops-pick-range">
    <button type="button" className="ops-button" ref={trigger} disabled={!file} aria-expanded={open} aria-controls={panelId}
      onClick={() => onToggle(!open)}>Preview or edit {pick.title}</button>
    <div id={panelId} hidden={!open} className="ops-pick-editor">
      {open && <RangeEditor key={pick.startMs + "/" + pick.endMs} {...props} file={file} onClose={() => {
        onToggle(false);
        trigger.current?.focus();
      }} />}
    </div>
  </div>;
}
