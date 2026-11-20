/* oxlint-disable shadcn/no-unknown-classes -- Studio tutorial styles are defined in tutorialProduction.css and studio.css. */
import { T, useGT } from "gt-react";
import { useState } from "react";
import { tutorialMaxScenes, type TutorialPlan, type TutorialScene } from "./tutorialPlanSchema";

export function TutorialProposalReview({
  proposal,
  currentCount,
  onApply,
  onDismiss,
}: {
  proposal: TutorialPlan;
  currentCount: number;
  onApply: (scenes: TutorialScene[], replace: boolean) => void;
  onDismiss: () => void;
}) {
  const gt = useGT();
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const chosen = proposal.scenes.filter((scene) => selection.has(scene.id));
  return (
    <section className="ops-tutorial-proposal" aria-label={gt("Review proposed shots")}>
      <h3>
        <T>Review proposed shots</T>
      </h3>
      <p>
        <strong>{proposal.title}</strong>
      </p>
      <p>
        <T>
          Select the shots you want to use. Applying them keeps the source IDs and leaves recordings
          to attach separately.
        </T>
      </p>
      <div className="ops-actions">
        <button
          type="button"
          className="ops-link"
          onClick={() => setSelection(new Set(proposal.scenes.map((scene) => scene.id)))}
        >
          <T>Select all shots</T>
        </button>
        {chosen.length > 0 && (
          <button type="button" className="ops-link" onClick={() => setSelection(new Set())}>
            <T>Clear selection</T>
          </button>
        )}
      </div>
      <ol className="ops-tutorial-proposed-shots">
        {proposal.scenes.map((scene, index) => (
          <li key={scene.id}>
            <label className="ops-tutorial-check">
              <input
                type="checkbox"
                checked={selection.has(scene.id)}
                aria-label={gt("Include shot {number}", { number: index + 1 })}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setSelection((previous) => {
                    const next = new Set(previous);
                    if (checked) next.add(scene.id);
                    else next.delete(scene.id);
                    return next;
                  });
                }}
              />
              <strong>{scene.caption}</strong>
            </label>
            <small>
              {scene.source} · {scene.start}s–{scene.end}s
              {scene.hold ? <> · {gt("Freeze {duration}s", { duration: scene.hold })}</> : null}
              {scene.focus ? (
                <>
                  {" "}
                  ·{" "}
                  {gt("Zoom {zoom}× at {x}%, {y}%", {
                    zoom: scene.focus.zoom,
                    x: Math.round(scene.focus.x * 100),
                    y: Math.round(scene.focus.y * 100),
                  })}
                </>
              ) : null}
            </small>
            <p>{scene.narration}</p>
          </li>
        ))}
      </ol>
      <div className="ops-actions">
        <button
          type="button"
          className="ops-button ops-primary"
          disabled={!chosen.length || chosen.length + currentCount > tutorialMaxScenes}
          onClick={() => onApply(chosen, false)}
        >
          <T>Add selected shots</T>
        </button>
        {currentCount > 0 && (
          <button
            type="button"
            className="ops-button"
            disabled={!chosen.length}
            onClick={() => onApply(chosen, true)}
          >
            <T>Replace shot list with selected shots</T>
          </button>
        )}
        <button type="button" className="ops-link" onClick={onDismiss}>
          <T>Dismiss proposal</T>
        </button>
      </div>
    </section>
  );
}
