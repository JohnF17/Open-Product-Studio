import { useId, useLayoutEffect, useRef } from "react";

import { randomUUID } from "../../lib/randomUUID";
import { cueTextFields, inspectCueSheet, type VideoCue } from "./videoCues";
import "./videoCues.css";

export function VideoCueSheet({
  cues,
  onChange,
}: {
  cues: readonly VideoCue[];
  onChange: (cues: VideoCue[]) => void;
}) {
  const sheet = useRef<HTMLDetailsElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const nextFocus = useRef<number | null>(null);
  const prefix = useId();
  const { rows, timing } = inspectCueSheet(cues);

  useLayoutEffect(() => {
    if (nextFocus.current === null) return;
    const field = sheet.current?.querySelectorAll<HTMLInputElement>("[data-cue-time]")[nextFocus.current];
    (field ?? addButton.current)?.focus();
    nextFocus.current = null;
  }, [cues]);

  function addCue() {
    nextFocus.current = cues.length;
    onChange([...cues, { id: randomUUID(), timestamp: "", action: "", narration: "", caption: "", sound: "" }]);
  }

  function removeCue(index: number) {
    nextFocus.current = Math.max(0, Math.min(index, cues.length - 2));
    onChange(cues.filter((_, i) => i !== index));
  }

  function editCue(index: number, field: Exclude<keyof VideoCue, "id">, value: string) {
    onChange(cues.map((cue, i) => i === index ? { ...cue, [field]: value } : cue));
  }

  return (
    <details className="ops-reference ops-cue-sheet" ref={sheet}>
      <summary>Shot cue sheet (optional)</summary>
      <p>Use minutes and seconds such as 0:02.500, or hours, minutes and seconds. Add any action, narration, caption or sound that starts there.</p>
      {rows.map(({ cue, error }, index) => {
        const errorId = `${prefix}-cue-${index}-error`;
        return (
          <fieldset className="ops-cue-row" key={cue.id}>
            <legend>Cue {index + 1}</legend>
            <div className="ops-cue-fields">
              <label className="ops-field">
                <span>Start time</span>
                <input
                  data-cue-time=""
                  value={cue.timestamp}
                  placeholder="0:00"
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(event) => editCue(index, "timestamp", event.target.value)}
                />
              </label>
              {error && <small id={errorId} className="ops-cue-error">{error}</small>}
              {cueTextFields.map(([field, label]) => (
                <label key={field} className="ops-field">
                  <span>{label}</span>
                  <textarea
                    rows={2}
                    value={cue[field]}
                    onChange={(event) => editCue(index, field, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <button type="button" className="ops-link" onClick={() => removeCue(index)}>
              Remove cue {index + 1}
            </button>
          </fieldset>
        );
      })}
      <button type="button" className="ops-button" ref={addButton} onClick={addCue}>Add cue</button>
      {rows.length > 0 && (
        <p aria-live="polite">{timing === "ready" ? "Cue times are in order." : "Cue times need review."}</p>
      )}
    </details>
  );
}

export function VideoCuePreview({ cues }: { cues: readonly VideoCue[] }) {
  const { rows, timing } = inspectCueSheet(cues);
  return (
    <section className="ops-cue-preview">
      <h3 className="ops-subhead">Shot cue sheet</h3>
      <p className="ops-note">{timing === "ready" ? "Cue times are in order." : "Cue times need review."}</p>
      <ol className="ops-cue-list">
        {rows.map(({ cue, error }, index) => (
          <li key={cue.id}>
            <strong>Cue {index + 1} · {cue.timestamp.trim() || "Start time missing"}</strong>
            {error && <p className="ops-cue-error">{error}</p>}
            <dl>
              {cueTextFields.filter(([key]) => cue[key].trim()).map(([key, label]) => (
                <div key={key}><dt>{label}</dt><dd>{cue[key]}</dd></div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
