/* oxlint-disable shadcn/no-unknown-classes -- Studio tutorial styles are defined in tutorialProduction.css and studio.css. */
import { T, useGT } from "gt-react";
import { MonitorPlay, Smartphone } from "lucide-react";
import { useId } from "react";
import {
  tutorialSocialReel,
  tutorialWalkthrough,
  type TutorialPresentation,
} from "./tutorialPlanSchema";

export function TutorialPresentationSettings({
  presentation,
  onChange,
}: {
  presentation: TutorialPresentation;
  onChange: (presentation: TutorialPresentation) => void;
}) {
  const gt = useGT();
  const headingId = useId();
  const socialDescription = useId();
  const walkthroughDescription = useId();

  return (
    <section className="ops-tutorial-presentation" aria-labelledby={headingId}>
      <h3 id={headingId}>
        <T>Presentation</T>
      </h3>
      <div className="ops-tutorial-presets">
        <button
          type="button"
          className="ops-tutorial-preset"
          aria-label={gt("Social reel")}
          aria-describedby={socialDescription}
          aria-pressed={presentation.style === "social-reel"}
          onClick={() => onChange(tutorialSocialReel)}
        >
          <Smartphone size={18} aria-hidden="true" />
          <span>
            <strong>
              <T>Social reel</T>
            </strong>
            <small id={socialDescription}>
              <T>Portrait crop and highlighted words</T>
            </small>
          </span>
        </button>
        <button
          type="button"
          className="ops-tutorial-preset"
          aria-label={gt("Walkthrough")}
          aria-describedby={walkthroughDescription}
          aria-pressed={presentation.style === "studio-lesson"}
          onClick={() => onChange(tutorialWalkthrough)}
        >
          <MonitorPlay size={18} aria-hidden="true" />
          <span>
            <strong>
              <T>Walkthrough</T>
            </strong>
            <small id={walkthroughDescription}>
              <T>Full picture and a label below</T>
            </small>
          </span>
        </button>
      </div>
      <div className="ops-tutorial-presentation-options">
        <label className="ops-field">
          <span>
            <T>Aspect ratio</T>
          </span>
          <select
            value={presentation.aspect}
            onChange={(event) =>
              onChange({
                ...presentation,
                aspect: event.currentTarget.value as TutorialPresentation["aspect"],
              })
            }
          >
            <option value="9:16">{gt("9:16 Portrait")}</option>
            <option value="1:1">{gt("1:1 Square")}</option>
            <option value="16:9">{gt("16:9 Landscape")}</option>
          </select>
        </label>
        <label className="ops-field">
          <span>
            <T>Subtitle position</T>
          </span>
          <select
            value={presentation.captions}
            onChange={(event) =>
              onChange({
                ...presentation,
                captions: event.currentTarget.value as TutorialPresentation["captions"],
              })
            }
          >
            <option value="center">{gt("Center")}</option>
            <option value="lower">{gt("Lower")}</option>
            <option value="off">{gt("Off in video")}</option>
          </select>
        </label>
      </div>
    </section>
  );
}
