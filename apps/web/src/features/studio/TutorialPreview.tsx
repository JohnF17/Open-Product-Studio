/* oxlint-disable shadcn/no-unknown-classes -- Studio tutorial styles are defined in tutorialProduction.css. */
import { T, useGT } from "gt-react";
import { Aperture, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { primeClipPlayback } from "./clipperEvidence";
import {
  tutorialCrop,
  tutorialFps,
  tutorialFrames,
  tutorialSceneFrames,
  type TutorialPresentation,
  type TutorialScene,
} from "./tutorialPlanSchema";

export interface TutorialSource {
  file: File;
  durationMs: number;
  type: string;
}

function reelWordsAtFrame(text: string, frame: number, frameCount: number) {
  const groups: RegExpExecArray[][] = [];
  let group: RegExpExecArray[] = [];
  for (const word of text.matchAll(/\S+/gu)) {
    if (
      group.length &&
      (group.length === 3 ||
        [...group, word].map((token) => token[0]).join(" ").length > 18 ||
        /[.!?…。！？]["'”’]?$/u.test(group.at(-1)?.[0] ?? ""))
    ) {
      groups.push(group);
      group = [];
    }
    group.push(word);
  }
  if (group.length) groups.push(group);
  if (frameCount < 1 || !groups.length) return null;

  // Preview estimates speech timing from the shot. The renderer uses the generated voice when available.
  const weight = (word: RegExpExecArray) => Array.from(word[0]).length;
  const total = groups.flat().reduce((sum, word) => sum + weight(word), 0);
  let cutoff = (Math.max(0, Math.min(frame, frameCount - 1)) * total) / frameCount;
  for (const words of groups) {
    for (const [index, word] of words.entries()) {
      cutoff -= weight(word);
      if (cutoff < 0) return { words, index };
    }
  }
  return null;
}

export function TutorialPreview({
  scene,
  source,
  presentation,
}: {
  scene: TutorialScene | undefined;
  source: TutorialSource | undefined;
  presentation: TutorialPresentation;
}) {
  const gt = useGT();
  const video = useRef<HTMLVideoElement>(null);
  const animation = useRef<number | null>(null);
  const run = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState<number | null>(null);
  const from = tutorialFrames(scene?.start ?? 0);
  const until = tutorialFrames(scene?.end ?? 0);
  const count = scene ? tutorialSceneFrames(scene) : 0;
  const playable = source && until > from && until <= tutorialFrames(source.durationMs / 1000);
  const social = presentation.style === "social-reel";
  const historicalLayout =
    !social && presentation.aspect === "16:9" && presentation.captions === "lower";
  const crop = tutorialCrop(scene?.focus, frame ?? count - 1, count, social);
  const transcript = scene?.narration.match(/\S(?:.{0,50}\S)?(?=\s|$)|\S{1,52}/gu) ?? [];
  const currentLine =
    transcript[
      Math.min(
        transcript.length - 1,
        Math.floor(((frame ?? 0) / Math.max(1, count)) * transcript.length),
      )
    ];
  const reelText =
    social && presentation.captions !== "off"
      ? reelWordsAtFrame(scene?.narration ?? "", frame ?? 0, count)
      : null;
  const overlay = source && scene && !error;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Bind the native media element to a scoped object URL and release playback resources when it changes.
  useEffect(() => {
    const element = video.current;
    if (!source || !element) return;
    const url = URL.createObjectURL(source.file.slice(0, source.file.size, source.type));
    element.src = url;
    return () => {
      run.current += 1;
      if (animation.current !== null) cancelAnimationFrame(animation.current);
      element.pause();
      element.removeAttribute("src");
      element.load();
      URL.revokeObjectURL(url);
    };
  }, [source]);

  function stop() {
    run.current += 1;
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    video.current?.pause();
    setPlaying(false);
  }

  function play() {
    const element = video.current;
    if (!element || !playable) return;
    const request = ++run.current;
    let holdStarted: number | null = null;
    const cutFrames = until - from;
    const moment = frame === null || frame >= count - 1 ? 0 : frame;
    element.currentTime = (from + Math.min(moment, cutFrames - 1)) / tutorialFps;
    setFrame(moment);
    setPlaying(true);
    function tick(now: number) {
      if (request !== run.current || !element) return;
      const current = Math.max(0, Math.floor(element.currentTime * tutorialFps - from));
      let next = current;
      if (holdStarted !== null) {
        next = cutFrames + Math.floor(((now - holdStarted) * tutorialFps) / 1000);
      } else if (current >= cutFrames || element.ended) {
        holdStarted = now - (Math.max(0, moment - cutFrames) * 1000) / tutorialFps;
        element.pause();
        element.currentTime = (until - 1) / tutorialFps;
        next = Math.max(cutFrames, moment);
      }
      setFrame(Math.min(count - 1, next));
      if (next >= count - 1 && (holdStarted !== null || element.ended)) stop();
      else animation.current = requestAnimationFrame(tick);
    }
    if (moment >= cutFrames) {
      holdStarted = performance.now() - ((moment - cutFrames) * 1000) / tutorialFps;
      animation.current = requestAnimationFrame(tick);
    } else {
      void element
        .play()
        .then(() => {
          if (request === run.current) animation.current = requestAnimationFrame(tick);
        })
        .catch(() => {
          if (request === run.current) {
            stop();
            setError(true);
          }
        });
    }
  }

  return (
    <section className="ops-tutorial-monitor" aria-label={gt("Shot preview")}>
      <div
        className="ops-tutorial-screen"
        data-aspect={presentation.aspect}
        data-style={presentation.style}
        data-captions={presentation.captions}
        data-historical={historicalLayout || undefined}
      >
        {source && (
          <div className="ops-tutorial-matte">
            <div
              className="ops-tutorial-footage"
              style={{ transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})` }}
            >
              <video
                ref={video}
                muted
                playsInline
                preload="auto"
                disableRemotePlayback
                aria-label={gt("Selected source footage")}
                style={
                  social
                    ? {
                        objectPosition:
                          (scene?.focus?.x ?? 0.5) * 100 +
                          "% " +
                          (scene?.focus?.y ?? 0.5) * 100 +
                          "%",
                      }
                    : undefined
                }
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  if (Number.isFinite(element.duration))
                    element.currentTime = Math.min(element.duration, from / tutorialFps);
                  else primeClipPlayback(element);
                }}
                onLoadedData={() => setReady(true)}
                onError={() => {
                  stop();
                  setError(true);
                }}
              />
            </div>
          </div>
        )}
        {(!scene || !source || error) && (
          <div className="ops-tutorial-monitor-empty">
            <Aperture size={24} aria-hidden="true" />
            <span>
              {error
                ? gt("This recording could not be played.")
                : scene
                  ? gt("Attach this shot’s recording to preview it.")
                  : gt("Select a shot to preview it.")}
            </span>
          </div>
        )}
        {overlay && !social && (
          <div className="ops-tutorial-screen-text ops-tutorial-label" aria-hidden="true">
            <strong>{scene.caption}</strong>
            {historicalLayout && <span>{currentLine}</span>}
          </div>
        )}
        {overlay && !historicalLayout && presentation.captions !== "off" && (
          <div className="ops-tutorial-screen-text ops-tutorial-spoken" aria-hidden="true">
            {reelText ? (
              <span>
                {reelText.words.map((word, index) => (
                  <span key={word.index} data-highlight={index === reelText.index || undefined}>
                    {index > 0 && " "}
                    {word[0]}
                  </span>
                ))}
              </span>
            ) : !social ? (
              <span>{currentLine}</span>
            ) : null}
          </div>
        )}
      </div>
      <div className="ops-tutorial-transport">
        <button
          type="button"
          className="ops-button"
          disabled={!ready || !playable || error}
          onClick={playing ? stop : play}
        >
          {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          {playing ? gt("Pause preview") : gt("Play preview")}
        </button>
        <small>
          <T>Framing and subtitles</T>
        </small>
      </div>
      {source && !playable && (
        <p role="status" className="ops-tutorial-error">
          <T>Set a start and end inside this recording.</T>
        </p>
      )}
    </section>
  );
}
