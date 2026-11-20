import { useLayoutEffect, useRef, useState } from "react";
import { formatClipTime } from "./clipTimes";
import { footageCutRevision, renderFootageCut, supportsFootageExport, type FootageCut, type FootageOutput } from "./clipFootageRender";
import "./clipFootageExport.css";

type Result = { error: string } | { url: string; output: FootageOutput };

function ready(result: Result | undefined) {
  return !!result && "url" in result;
}

function outputName(cut: FootageCut, index: number, output: FootageOutput) {
  const title = cut.title.replace(/[^\p{L}\p{N} _-]+/gu, " ").trim().slice(0, 80) || "Clip";
  return String(index + 1).padStart(2, "0") + " - " + title + "." + output.extension;
}

export function ClipFootageExport({ file, cuts }: { file: File | null; cuts: readonly FootageCut[] }) {
  const [allowSilent, setAllowSilent] = useState(false);
  const retained = useRef(new Map<string, Result>());
  const [results, setResults] = useState<ReadonlyMap<string, Result>>(() => new Map());
  const [attempted, setAttempted] = useState(false);
  const [active, setActive] = useState<{ index: number; percent: number } | null>(null);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const rows = cuts.map((cut) => ({ cut, id: footageCutRevision(cut) }));
  const revision = JSON.stringify(rows.map((row) => row.id));
  useLayoutEffect(() => {
    const owned = retained.current;
    setAllowSilent(false);
    return () => {
      for (const result of owned.values()) if ("url" in result) URL.revokeObjectURL(result.url);
      owned.clear();
    };
  }, [file]);
  useLayoutEffect(() => {
    const currentIds = new Set(JSON.parse(revision) as string[]);
    for (const [id, result] of retained.current) {
      if (currentIds.has(id)) continue;
      if ("url" in result) URL.revokeObjectURL(result.url);
      retained.current.delete(id);
    }
    setResults(new Map(retained.current));
    setAttempted(retained.current.size > 0);
    setActive(null);
    setMessage("");
    return () => { controller.current?.abort(); controller.current = null; };
  }, [file, revision]);

  async function renderBatch() {
    if (!file || !remaining || controller.current) return;
    const job = new AbortController();
    controller.current = job;
    setAttempted(true);
    setMessage("");
    const saved = retained.current;
    try {
      for (const [index, { cut, id }] of rows.entries()) {
        const previous = saved.get(id);
        if (ready(previous)) continue;
        if (saved.delete(id)) setResults(new Map(saved));
        setActive({ index, percent: 0 });
        try {
          const output = await renderFootageCut(file, cut, allowSilent, job.signal, (fraction) => {
            if (!job.signal.aborted) setActive({ index, percent: Math.round(fraction * 100) });
          });
          job.signal.throwIfAborted();
          saved.set(id, { output, url: URL.createObjectURL(output.blob) });
        } catch (error) {
          if (job.signal.aborted) return;
          saved.set(id, { error: error instanceof Error ? error.message : "Local rendering failed." });
        }
        setResults(new Map(saved));
        if (document.hidden) break;
      }
      const completed = rows.filter(({ id }) => ready(saved.get(id))).length;
      setMessage(`${completed} of ${cuts.length} clips ready.`);
    } finally {
      if (controller.current === job) { controller.current = null; setActive(null); }
    }
  }

  const available = supportsFootageExport();
  const readyCount = rows.filter(({ id }) => ready(results.get(id))).length;
  const remaining = cuts.length - readyCount;
  const label = remaining === 1 ? "clip" : "clips";
  return <fieldset className="ops-look ops-footage-export">
    <legend>Render approved clips</legend>
    <p>Each clip is center-cropped and encoded locally at playback speed. Keep this window visible. Review the picture, timing and sound before saving.</p>
    {!file ? <p>Select the original video in Source to render your clips.</p> :
      !cuts.length ? <p>Approve at least one clip to render it here.</p> :
      <p>{file.name} · {cuts.length} approved {cuts.length === 1 ? "clip" : "clips"}</p>}
    {!available && <p role="status">Local video encoding is unavailable in this browser.</p>}
    <label className="ops-footage-consent">
      <input type="checkbox" checked={allowSilent} disabled={!!active}
        onChange={(e) => setAllowSilent(e.currentTarget.checked)} />
      Allow silent export if source audio is absent or cannot be captured
    </label>
    <div className="ops-footage-actions">
      <button type="button" className="ops-button" disabled={!available || !file || !remaining || !!active}
        onClick={() => void renderBatch()}>{!remaining && readyCount ? "All clips ready" :
          attempted ? `Retry ${remaining} unfinished ${label}` : `Render ${remaining} ${label}`}</button>
      {active && <button type="button" className="ops-link" onClick={() => {
        controller.current?.abort();
        setMessage(readyCount
          ? "Rendering canceled. Completed clips are available below." : "Rendering canceled.");
      }}>Cancel rendering</button>}
    </div>
    {active && <label>Rendering clip {active.index + 1} of {cuts.length} · {readyCount} ready
      <progress value={active.percent} max={100} /> {active.percent}%</label>}
    {message && <p role="status">{message}</p>}
    {results.size > 0 && <ol className="ops-footage-results">
      {rows.map(({ cut, id }, i) => {
        const result = results.get(id);
        if (!result) return null;
        const name = "url" in result ? outputName(cut, i, result.output) : "";
        return <li key={i} value={i + 1}>
          <strong>{cut.title}</strong>
          {"error" in result ? <p role="alert">{result.error}</p> : <>
            <video controls preload="metadata" playsInline src={result.url} aria-label={"Rendered clip " + (i + 1)} />
            <p>{formatClipTime(cut.startMs)} – {formatClipTime(cut.endMs)} · {result.output.width} × {result.output.height} · {result.output.audio ? "Source audio" : "Silent"} · {result.output.extension.toUpperCase()}</p>
            <a className="ops-link" href={result.url} download={name}>Download {name}</a>
          </>}
        </li>;
      })}
    </ol>}
  </fieldset>;
}
