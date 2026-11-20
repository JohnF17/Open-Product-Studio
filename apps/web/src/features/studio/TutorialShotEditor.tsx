/* oxlint-disable shadcn/no-unknown-classes -- Studio tutorial styles are defined in tutorialProduction.css and studio.css. */
import { T, useGT } from "gt-react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { tutorialSceneIssue, type TutorialScene } from "./tutorialPlanSchema";

function TimeField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [empty, setEmpty] = useState(false);
  return (
    <label className="ops-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={0.001}
        value={empty ? "" : value}
        onBlur={() => setEmpty(false)}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          setEmpty(Number.isNaN(next));
          if (Number.isFinite(next) && next >= 0 && next <= max) onChange(next);
        }}
      />
    </label>
  );
}

export function TutorialShotEditor({
  scene,
  index,
  count,
  sourceIds,
  onChange,
  onRemove,
  onMove,
}: {
  scene: TutorialScene;
  index: number;
  count: number;
  sourceIds: string[];
  onChange: (scene: TutorialScene) => void;
  onRemove: () => void;
  onMove: (offset: -1 | 1) => void;
}) {
  const gt = useGT();
  const focus = scene.focus;
  const issue = tutorialSceneIssue(scene);
  return (
    <section
      className="ops-tutorial-inspector"
      aria-label={gt("Edit shot {number}", { number: index + 1 })}
    >
      <div className="ops-tutorial-heading">
        <h3>{gt("Edit shot {number}", { number: index + 1 })}</h3>
        <div className="ops-tutorial-shift">
          <button
            type="button"
            className="ops-button"
            aria-label={gt("Move shot earlier")}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ops-button"
            aria-label={gt("Move shot later")}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ops-button"
            aria-label={gt("Remove shot")}
            onClick={onRemove}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="ops-tutorial-timing">
        <label className="ops-field">
          <span>
            <T>Source ID</T>
          </span>
          <select
            value={scene.source}
            onChange={(event) => onChange({ ...scene, source: event.currentTarget.value })}
          >
            {sourceIds.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <TimeField
          label={gt("Start (seconds)")}
          value={scene.start}
          max={86400}
          onChange={(start) => onChange({ ...scene, start })}
        />
        <TimeField
          label={gt("End (seconds)")}
          value={scene.end}
          max={86400}
          onChange={(end) => onChange({ ...scene, end })}
        />
        <TimeField
          label={gt("Freeze last frame (seconds)")}
          value={scene.hold ?? 0}
          max={60}
          onChange={(hold) => onChange({ ...scene, hold: hold || undefined })}
        />
      </div>
      <div className="ops-tutorial-script">
        <label className="ops-field">
          <span>
            <T>Narration</T>
          </span>
          <textarea
            rows={2}
            maxLength={900}
            value={scene.narration}
            aria-invalid={issue === "narration" && !!scene.narration}
            placeholder={gt("What should the viewer hear and read in the subtitles?")}
            onChange={(event) =>
              onChange({ ...scene, narration: event.currentTarget.value.replace(/\r?\n/g, " ") })
            }
          />
        </label>
        <label className="ops-field">
          <span>
            <T>On-screen label</T>
          </span>
          <input
            maxLength={80}
            value={scene.caption}
            aria-invalid={issue === "caption" && !!scene.caption}
            placeholder={gt("Name the action or area on screen")}
            onChange={(event) => onChange({ ...scene, caption: event.currentTarget.value })}
          />
        </label>
      </div>
      {issue &&
        !(issue === "narration" && !scene.narration) &&
        !(issue === "caption" && !scene.caption) && (
          <p className="ops-tutorial-error" role="status">
            {issue === "timing"
              ? gt("Leave at least one frame and no more than 180 seconds between start and end.")
              : issue === "narration"
                ? gt("Enter narration on one line without braces or backslashes.")
                : gt("Enter an on-screen label without braces or backslashes.")}
          </p>
        )}
      <label className="ops-tutorial-check">
        <input
          type="checkbox"
          checked={!!focus}
          onChange={(event) =>
            onChange({
              ...scene,
              focus: event.currentTarget.checked ? { x: 0.5, y: 0.5, zoom: 2 } : undefined,
            })
          }
        />
        <T>Zoom into the recording</T>
      </label>
      {focus && (
        <div className="ops-tutorial-focus">
          {(
            [
              ["x", gt("Horizontal focus"), 0, 1, 0.01, `${Math.round(focus.x * 100)}%`],
              ["y", gt("Vertical focus"), 0, 1, 0.01, `${Math.round(focus.y * 100)}%`],
              ["zoom", gt("Magnification"), 1, 3, 0.05, `${focus.zoom}×`],
            ] as const
          ).map(([key, label, min, max, step, display]) => (
            <label className="ops-tutorial-slider" key={key}>
              <span>{label}</span>
              <output>{display}</output>
              <input
                type="range"
                aria-label={label}
                aria-valuetext={display}
                value={focus[key]}
                min={min}
                max={max}
                step={step}
                onChange={(event) =>
                  onChange({
                    ...scene,
                    focus: { ...focus, [key]: event.currentTarget.valueAsNumber },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
