/* oxlint-disable shadcn/no-unknown-classes -- Studio tutorial styles are defined in tutorialProduction.css and studio.css. */
import { T, useGT } from "gt-react";
import { Copy, Plus, Video } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useStableCallback } from "../../hooks/useStableCallback";
import { clipVideoAccept, readClipVideo } from "./clipperEvidence";
import { TutorialMotionInsert } from "./TutorialMotionInsert";
import type { TutorialSource } from "./TutorialPreview";
import { isTutorialSourceId } from "./tutorialPlanSchema";

export function TutorialSources({
  ids,
  sources,
  onAddSource,
  onSource,
}: {
  ids: string[];
  sources: Map<string, TutorialSource>;
  onAddSource: (id: string) => void;
  onSource: (id: string, source?: TutorialSource) => void;
}) {
  const gt = useGT();
  const prefix = useId();
  const inflight = useRef(new Map<string, AbortController>());
  const rangeField = useRef<HTMLTextAreaElement>(null);
  const [states, setStates] = useState(new Map<string, "reading" | "failed">());
  const [added, setAdded] = useState("");
  const [copiedRanges, setCopiedRanges] = useState("");
  const ranges = ids
    .flatMap((id) => {
      const durationMs = sources.get(id)?.durationMs;
      return durationMs ? [`SOURCE ${id} 0 ${durationMs / 1000}`] : [];
    })
    .join("\n");

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Abort native media decoding when the recording picker leaves the sheet.
  useEffect(() => {
    const active = inflight.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  function updateState(id: string, value?: "reading" | "failed") {
    setStates((current) => {
      const next = new Map(current);
      if (value) next.set(id, value);
      else next.delete(id);
      return next;
    });
  }

  async function attach(id: string, file: File) {
    inflight.current.get(id)?.abort();
    const controller = new AbortController();
    inflight.current.set(id, controller);
    onSource(id);
    updateState(id, "reading");
    try {
      const opened = await readClipVideo(file, controller.signal);
      const { durationMs, type } = opened;
      opened.release();
      if (!controller.signal.aborted) {
        const localFile =
          file.type === type
            ? file
            : new File([file], file.name, { type, lastModified: file.lastModified });
        onSource(id, { file: localFile, durationMs, type });
        updateState(id);
      }
    } catch {
      if (!controller.signal.aborted) updateState(id, "failed");
    } finally {
      if (inflight.current.get(id) === controller) inflight.current.delete(id);
    }
  }

  function add() {
    if (isTutorialSourceId(added) && !ids.includes(added)) {
      onAddSource(added);
      setAdded("");
    }
  }

  const attachInsert = useStableCallback((id: string, file: File) => {
    let available = id;
    let suffix = 2;
    while (ids.includes(available)) available = `${id}-${suffix++}`;
    onAddSource(available);
    void attach(available, file);
  });

  async function copyRanges() {
    try {
      await navigator.clipboard.writeText(ranges);
      setCopiedRanges(ranges);
    } catch {
      rangeField.current?.focus();
      rangeField.current?.select();
    }
  }

  return (
    <section className="ops-tutorial-sources" aria-labelledby={`${prefix}-sources`}>
      <h3 id={`${prefix}-sources`}>
        <T>Recordings</T>
      </h3>
      <p>
        <T>
          Choose a local file for each source ID. Reattach the files when you reopen the project.
        </T>
      </p>
      <ul className="ops-tutorial-bindings">
        {ids.map((id, index) => {
          const source = sources.get(id);
          const status = states.get(id);
          const inputId = `${prefix}-recording-${index}`;
          return (
            <li key={id}>
              <Video size={17} aria-hidden="true" />
              <div className="ops-tutorial-binding-text">
                <strong>{id}</strong>
                <small aria-live="polite">
                  {status === "reading"
                    ? gt("Reading recording…")
                    : status === "failed"
                      ? gt("Choose a playable MP4 or WebM up to 250 MiB.")
                      : source
                        ? gt("{name} · {duration}s", {
                            name: source.file.name,
                            duration: source.durationMs / 1000,
                          })
                        : gt("No recording attached")}
                </small>
              </div>
              <div className="ops-tutorial-binding-actions">
                <input
                  id={inputId}
                  className="sr-only"
                  type="file"
                  accept={clipVideoAccept}
                  aria-label={gt("Choose recording for {source}", { source: id })}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void attach(id, file);
                  }}
                />
                <label htmlFor={inputId} className="ops-button">
                  {source ? gt("Replace file") : gt("Choose file")}
                </label>
                {source && (
                  <button
                    type="button"
                    className="ops-link"
                    aria-label={gt("Detach {source}", { source: id })}
                    onClick={() => onSource(id)}
                  >
                    <T>Detach</T>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ops-tutorial-source-add">
        <label className="ops-field">
          <span>
            <T>New source ID</T>
          </span>
          <input
            value={added}
            maxLength={64}
            placeholder="screen-2"
            onChange={(event) => setAdded(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
        </label>
        <button
          className="ops-button"
          type="button"
          disabled={!isTutorialSourceId(added) || ids.includes(added)}
          onClick={add}
        >
          <Plus size={15} aria-hidden="true" />
          <T>Add source</T>
        </button>
      </div>
      <TutorialMotionInsert occupied={ids} onCreated={attachInsert} />
      {ranges && (
        <details className="ops-tutorial-share">
          <summary>
            <T>Share source ranges with the step assistant</T>
          </summary>
          <p>
            <T>
              Copy these ranges into the assistant’s context and add your tutorial goal. Only source
              IDs and durations are included.
            </T>
          </p>
          <label className="ops-field">
            <span>
              <T>Source ranges</T>
            </span>
            <textarea ref={rangeField} readOnly rows={Math.min(4, ids.length)} value={ranges} />
          </label>
          <button type="button" className="ops-button" onClick={() => void copyRanges()}>
            <Copy size={15} aria-hidden="true" />
            {copiedRanges === ranges ? gt("Ranges copied") : gt("Copy source ranges")}
          </button>
        </details>
      )}
    </section>
  );
}
