/* oxlint-disable shadcn/no-unknown-classes -- Reuses Studio source and field classes from clipperSource.css and studio.css. */
import { T, useGT } from "gt-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ClipperSourceState, SourceVideo } from "./ClipperSource";
import { readClipCaptions, type ClipTranscriptCue } from "./clipperEvidence";
import { formatClipTime } from "./clipTimes";
import { transcribeStudioRecording } from "./studioMediaConnection";

type Captions = ClipperSourceState["captions"];
type Snapshot = { video: SourceVideo; captions: Captions };

export function ClipperLocalTranscription({
  video,
  captions,
  disabled,
  onApply,
}: Snapshot & {
  disabled: boolean;
  onApply: (expected: Snapshot, generated: NonNullable<Captions>) => void;
}) {
  const gt = useGT();
  const [pairingCode, setPairingCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<(Snapshot & { cues: ClipTranscriptCue[] }) | null>(null);
  const request = useRef<(Snapshot & { controller: AbortController }) | null>(null);
  const actionable = !disabled && proposal?.video === video && proposal.captions === captions;
  const tooLarge = video.file.size >= 128 * 1024 * 1024;
  const appOrigin =
    window.location.origin === "null"
      ? window.location.protocol + "//" + window.location.host
      : window.location.origin;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Cancel a request to the local speech service if its source inputs are superseded.
  useLayoutEffect(() => {
    const pending = request.current;
    if (pending && (disabled || pending.video !== video || pending.captions !== captions)) {
      pending.controller.abort();
      request.current = null;
      setBusy(false);
    }
  }, [disabled, video, captions]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Close the speech service request when leaving Source or changing projects.
  useLayoutEffect(() => () => request.current?.controller.abort(), []);

  async function createSubtitles() {
    if (disabled || tooLarge || !pairingCode.trim() || request.current) return;
    const job = { video, captions, controller: new AbortController() };
    request.current = job;
    setBusy(true);
    setError("");
    setProposal(null);
    try {
      const text = await transcribeStudioRecording(pairingCode, video.file, job.controller.signal);
      job.controller.signal.throwIfAborted();
      const cues = (await readClipCaptions(new File([text], "local-subtitles.srt")))
        .filter((cue) => cue.startMs < video.durationMs)
        .map((cue) => ({ ...cue, endMs: Math.min(cue.endMs, video.durationMs) }));
      job.controller.signal.throwIfAborted();
      if (cues.length) setProposal({ video, captions, cues });
      else setError(gt("No subtitle times matched this recording."));
    } catch (cause) {
      if (!job.controller.signal.aborted) {
        setError(
          cause instanceof Error &&
            cause.message === "Start your paired renderer with a local whisper.cpp model."
            ? gt("Start your paired renderer with a local whisper.cpp model.")
            : gt(
                "Could not create subtitles. Check the renderer pairing code, model and recording audio.",
              ),
        );
      }
    } finally {
      if (request.current === job && !job.controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  function cancel() {
    request.current?.controller.abort();
    request.current = null;
    setBusy(false);
  }

  return (
    <details className="ops-reference ops-local-transcription">
      <summary>
        <T>Generate subtitles locally</T>
      </summary>
      <div className="ops-source-review">
        <p>
          <T>
            The paired renderer reads the selected recording on this computer and returns timed
            subtitles for review.
          </T>
        </p>
        <details className="ops-local-transcription-setup">
          <summary>
            <T>Start the local renderer with speech recognition</T>
          </summary>
          <p>
            <T>
              Run this command from the Studio source checkout with your installed FFmpeg and a
              local whisper.cpp model. Make whisper-cli available on PATH or set STUDIO_WHISPER_BIN
              to its local path.
            </T>
          </p>
          <code>{`node tools/studio-media/bridge.mjs --origin "${appOrigin}" --ffmpeg "PATH_TO_FFMPEG" --whisper-model "PATH_TO_WHISPER_MODEL"`}</code>
        </details>
        {tooLarge && (
          <p>
            <T>Choose a recording under 128 MiB for local transcription.</T>
          </p>
        )}
        <label className="ops-field">
          <span>
            <T>Renderer pairing code</T>
          </span>
          <input
            type="password"
            value={pairingCode}
            autoComplete="off"
            spellCheck={false}
            maxLength={300}
            disabled={disabled || busy || tooLarge}
            onChange={(event) => setPairingCode(event.currentTarget.value)}
          />
        </label>
        <div className="ops-actions">
          <button
            type="button"
            className="ops-button"
            disabled={disabled || busy || tooLarge || !pairingCode.trim()}
            onClick={() => void createSubtitles()}
          >
            <T>Create subtitles on this computer</T>
          </button>
          {busy && (
            <button type="button" className="ops-link" onClick={cancel}>
              <T>Cancel transcription</T>
            </button>
          )}
        </div>
        {busy && (
          <p role="status">
            <T>Creating timed subtitles…</T>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {actionable && (
          <section className="ops-source-review" aria-label={gt("Review generated subtitles")}>
            <h3>
              <T>Review generated subtitles</T>
            </h3>
            {captions && (
              <p>
                <T>Applying these subtitles replaces the current captions for this recording.</T>
              </p>
            )}
            <ol className="ops-source-cues">
              {proposal.cues.map(({ id, startMs, endMs, text }) => (
                <li key={id}>
                  <span>
                    {formatClipTime(startMs)}–{formatClipTime(endMs)}
                  </span>
                  <p className="ops-source-verbatim">{text}</p>
                </li>
              ))}
            </ol>
            <div className="ops-actions">
              <button
                type="button"
                className="ops-button ops-primary"
                onClick={() => {
                  onApply(proposal, { name: gt("Local subtitles"), cues: proposal.cues });
                  setProposal(null);
                }}
              >
                <T>Use reviewed subtitles</T>
              </button>
              <button type="button" className="ops-link" onClick={() => setProposal(null)}>
                <T>Discard generated subtitles</T>
              </button>
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
