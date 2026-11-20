import { Check, PersonStanding, Play, Square } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { StudioDraft, VideoStyle } from "./drafts";
import { catalog, selectedTools, styleDescriptions, styleNames } from "./guide";
import { compatibleVideoTools } from "./videoToolSelection";
import "./videoStyleAudition.css";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const sampleCaption = "Save the idea before you move on.";
const treatments: Record<VideoStyle, { action: string; sound: string }> = {
  "kinetic-type": {
    action: "Large type lands in two beats, then holds on the takeaway.",
    sound: "Two short beats, then a quiet hold.",
  },
  "product-demo": {
    action: "A screen stays in view as a card is saved and a confirmation appears.",
    sound: "A soft confirmation click.",
  },
  "3d-showcase": {
    action: "A close-up tilts around the card and settles on its confirmation mark.",
    sound: "A low swell under the reveal.",
  },
  "stick-figure-explainer": {
    action: "A figure places a card in the frame and pauses on the result.",
    sound: "A light tap when the card lands.",
  },
};

export function VideoStyleAudition({
  draft,
  onApply,
}: {
  draft: StudioDraft;
  onApply: (patch: Pick<StudioDraft, "style" | "tools">) => void;
}) {
  const radioName = useId();
  const captionId = useId();
  const options = useRef<HTMLFieldSetElement>(null);
  const playback = useRef<HTMLButtonElement>(null);
  const [pendingStyle, setPendingStyle] = useState<VideoStyle | null>(null);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia(reducedMotionQuery).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(reducedMotionQuery);
    function onChange(event: MediaQueryListEvent) {
      if (event.matches && document.activeElement === playback.current) {
        options.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
      }
      setReducedMotion(event.matches);
      if (event.matches) setPlaying(false);
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const style = pendingStyle ?? draft.style;
  const recipe = catalog.styles[style];
  const hasChange = style !== draft.style;
  const caption = draft.videoCues?.find((cue) => cue.caption.trim())?.caption;
  const brief = draft.fields.brief?.trim() ? draft.fields.brief : undefined;
  const sceneText = caption ?? brief ?? sampleCaption;
  const sourceLabel = caption
    ? "Storyboard caption"
    : brief
      ? "Project brief"
      : "Original Studio sample";
  const treatment = treatments[style];

  const tools = hasChange ? compatibleVideoTools(draft.tools, style) : draft.tools;
  const planned = selectedTools({ ...draft, style, tools });
  const currentPlan = selectedTools(draft);
  const optional = recipe.optional.filter((id) => planned.includes(id));
  const added = planned.filter((id) => !currentPlan.includes(id));
  const removed = currentPlan.filter((id) => !planned.includes(id));
  const toolLabels = (ids: string[]) => ids.map((id) => catalog.stackEntries[id]!.label).join(", ");

  function choose(next: VideoStyle) {
    setPlaying(false);
    setPendingStyle(next === draft.style ? null : next);
  }

  function apply() {
    if (!hasChange) return;
    setPendingStyle(null);
    onApply({ style, tools });
  }

  return (
    <div className="ops-audition">
      <div className="ops-audition-compare">
        <fieldset ref={options} className="ops-audition-options">
          <legend className="ops-subhead">Style to preview</legend>
          <div className="ops-audition-choices">
            {styleNames.map((id) => (
              <label className="ops-audition-choice" key={id}>
                <span className={`ops-swatch swatch-${id}`} aria-hidden="true">
                  {id === "stick-figure-explainer" && <PersonStanding strokeWidth={1.5} />}
                </span>
                <input
                  type="radio"
                  name={radioName}
                  checked={style === id}
                  onChange={() => choose(id)}
                />
                <span>{catalog.styles[id].label}</span>
              </label>
            ))}
          </div>
          <p className="ops-audition-description">{styleDescriptions[style]}</p>
        </fieldset>

        <div className="ops-audition-display">
          <figure
            className="ops-audition-preview"
            aria-label="Same-scene preview"
            aria-describedby={captionId}
          >
            <div
              className="ops-audition-frame"
              data-style={style}
              data-playing={playing && !reducedMotion}
            >
              <div className="ops-audition-scene" aria-hidden="true">
                {style === "kinetic-type" ? (
                  <div className="ops-audition-type">
                    <span>Idea.</span>
                    <strong>Saved.</strong>
                  </div>
                ) : (
                  <div className="ops-audition-set">
                    {style === "stick-figure-explainer" && (
                      <PersonStanding className="ops-audition-figure" strokeWidth={1.4} />
                    )}
                    <div className="ops-audition-card">
                      <Check strokeWidth={2.6} />
                    </div>
                  </div>
                )}
              </div>
              <p className="ops-audition-caption" data-truncated={sceneText.length > 80}>
                {sceneText}
              </p>
              <div
                className="ops-audition-progress"
                aria-hidden="true"
                onAnimationEnd={() => setPlaying(false)}
              />
            </div>
            <figcaption id={captionId}>
              <span>
                {sourceLabel} · {reducedMotion ? "Still preview" : "4-second silent preview"}
              </span>
              <span>{treatment.action}</span>
              <span>Suggested sound: {treatment.sound}</span>
            </figcaption>
            {sceneText.length > 80 && (
              <details className="ops-audition-full-text">
                <summary>Read full {brief && !caption ? "brief" : "caption"}</summary>
                <p>{sceneText}</p>
              </details>
            )}
            {!reducedMotion && (
              <button
                type="button"
                className="ops-button ops-audition-play"
                ref={playback}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? (
                  <Square size={14} aria-hidden="true" />
                ) : (
                  <Play size={14} aria-hidden="true" />
                )}
                {playing ? "Stop preview" : "Play preview"}
              </button>
            )}
          </figure>
          <div className="ops-audition-commit">
            <div className="ops-actions">
              <button
                type="button"
                className="ops-button ops-primary"
                aria-disabled={!hasChange}
                onClick={apply}
              >
                Apply style
              </button>
              <button
                type="button"
                className="ops-link"
                aria-disabled={!hasChange}
                onClick={() => {
                  if (hasChange) choose(draft.style);
                }}
              >
                Discard preview
              </button>
            </div>
            <p role="status" className="ops-audition-hint">
              Applied style: {catalog.styles[draft.style].label}.
              {hasChange && " Apply to keep this look before leaving this step."}
            </p>
            {hasChange && added.length > 0 && <p>Added on Apply: {toolLabels(added)}</p>}
            {hasChange && removed.length > 0 && <p>Removed on Apply: {toolLabels(removed)}</p>}
          </div>
        </div>
      </div>

      <div className="ops-audition-plan">
        <h3 className="ops-subhead">{hasChange ? "Tool plan after Apply" : "Current tool plan"}</h3>
        <dl>
          {recipe.required.map((slot, index) => {
            const tool = catalog.stackEntries[planned[index]!]!;
            return (
              <div key={slot.need}>
                <dt>{slot.need}</dt>
                <dd>
                  <span>{tool.label}</span>
                  <small>{tool.cost.replaceAll("-", " ")}</small>
                </dd>
              </div>
            );
          })}
        </dl>
        <p>Optional tools selected: {optional.length ? toolLabels(optional) : "None"}</p>
        <p className="ops-audition-hint">
          Applying saves tool preferences. You can edit them in Tool plan.
        </p>
      </div>
    </div>
  );
}
