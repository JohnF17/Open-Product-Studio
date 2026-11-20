import type { ClipperSampleRequest, ClipperSampleResult, DesktopBridge } from "@t3tools/contracts";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { readSampleRange, SAMPLE_FRAMES, sampleRangeSummary } from "./clipperSample";
import "./clipLook.css";
import { rememberSampleSave, sampleFeedbackKey, useSampleSaveMessage } from "./sampleSaveFeedback";

type SampleBridge = NonNullable<DesktopBridge["clipperSample"]>;
type Availability = "unknown" | "ready" | "needs-encoder" | "unavailable";
type Preview = { token: string; url: string };

// Match the desktop sample IPC maximum, accounting for base64 padding.
const MAX_REVIEW_BYTES = 2 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_REVIEW_BYTES / 3) * 4;
let pendingDiscard: Promise<void> | undefined;
let nativeRequestActive = false;

function samplePreviewUrl(base64: string) {
  if (!base64 || base64.length > MAX_BASE64_LENGTH) {
    throw new Error("Invalid sample size");
  }
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  if (bytes.length === 0 || bytes.length > MAX_REVIEW_BYTES) {
    throw new Error("Invalid sample size");
  }
  return URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
}

export function ClipSampleExport({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const bridge = typeof window === "undefined" ? undefined : window.desktopBridge;
  if (typeof bridge?.clipperSample !== "function") return null;
  return (
    <NativeSampleExport
      key={projectId}
      projectId={projectId}
      feedbackKey={sampleFeedbackKey(workspaceId, projectId)}
      requestSample={bridge.clipperSample}
    />
  );
}

function NativeSampleExport({
  projectId,
  feedbackKey,
  requestSample,
}: {
  projectId: string;
  feedbackKey: string;
  requestSample: SampleBridge;
}) {
  const controlsId = useId();
  const lastSave = useSampleSaveMessage(feedbackKey);
  const rangeId = useId();
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<Availability>("unknown");
  const [start, setStart] = useState("30");
  const [end, setEnd] = useState("90");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [playable, setPlayable] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<ClipperSampleRequest["action"] | null>(null);
  const inFlight = useRef<ClipperSampleRequest | null>(null);
  const renderButton = useRef<HTMLButtonElement>(null);
  const reviewPanel = useRef<HTMLDivElement>(null);
  const currentPreview = useRef<Preview | null>(null);
  const generation = useRef(0);
  const attached = useRef(false);
  const range = readSampleRange(start, end);

  const discard = useCallback(
    (token: string) => {
      // The host also owns staging cleanup if the window or connection closes.
      const previous = pendingDiscard;
      const cleanup = (async () => {
        await previous;
        try {
          await requestSample({ action: "discard", projectId, token });
        } catch {
          // A discarded preview stays unavailable in the renderer.
        }
      })();
      pendingDiscard = cleanup;
      void cleanup.then(() => {
        if (pendingDiscard === cleanup) pendingDiscard = undefined;
      });
    },
    [projectId, requestSample],
  );

  const release = useCallback(() => {
    const old = currentPreview.current;
    if (!old) return;
    currentPreview.current = null;
    URL.revokeObjectURL(old.url);
    // Save already owns this token until its native dialog and finalization finish.
    if (inFlight.current?.action !== "save") discard(old.token);
  }, [discard]);

  useLayoutEffect(() => {
    attached.current = true;
    return () => {
      attached.current = false;
      generation.current++;
      release();
    };
  }, [release]);

  function clearPreview() {
    if (reviewPanel.current?.contains(document.activeElement)) {
      renderButton.current?.focus();
    }
    release();
    setPreview(null);
    setPlayable(false);
  }

  function changeRange(setBoundary: (value: string) => void, value: string) {
    if (inFlight.current?.action === "save") return;
    if (inFlight.current?.action === "render") generation.current++;
    const hadPreview = currentPreview.current !== null;
    clearPreview();
    setBoundary(value);
    if (hadPreview) setMessage("Range changed. Render the sample again to review it.");
    else if (availability === "ready") setMessage("");
  }

  function previewResult(
    result: Extract<ClipperSampleResult, { status: "review" }>,
    request: ClipperSampleRequest,
  ) {
    try {
      if (
        request.action !== "render" ||
        !result.token ||
        result.startFrame !== request.startFrame ||
        result.endFrameExclusive !== request.endFrameExclusive
      ) {
        throw new Error("Unexpected sample");
      }
      const next = { token: result.token, url: samplePreviewUrl(result.base64) };
      currentPreview.current = next;
      setPreview(next);
      setMessage("Sample rendered. Review the video before saving.");
    } catch {
      if (result.token) discard(result.token);
      setMessage("Studio could not open the rendered sample. Try rendering it again.");
    }
  }

  async function run(request: ClipperSampleRequest) {
    if (inFlight.current) return;
    if (nativeRequestActive) {
      setMessage("Another sample operation is finishing. Try again shortly.");
      return;
    }
    nativeRequestActive = true;
    inFlight.current = request;
    const requestedGeneration = generation.current;
    setBusy(request.action);
    setMessage("");

    try {
      if (pendingDiscard) await pendingDiscard;
      if (!attached.current || generation.current !== requestedGeneration) {
        if (request.action === "save") discard(request.token);
        return;
      }

      let result: ClipperSampleResult;
      if (request.action === "save") rememberSampleSave(feedbackKey, "uncertain");
      try {
        result = await requestSample(request);
      } catch {
        result = { status: request.action === "save" ? "uncertain" : "failed" };
      }
      if (request.action === "save") {
        switch (result.status) {
          case "saved": case "cancelled": case "occupied": case "failed":
            rememberSampleSave(feedbackKey, result.status);
            break;
          case "unavailable":
            rememberSampleSave(feedbackKey, "failed");
            break;
        }
      }
      if (!attached.current || generation.current !== requestedGeneration) {
        if (result.status === "review" && result.token) discard(result.token);
        if (request.action === "save") discard(request.token);
        return;
      }

      switch (result.status) {
        case "review":
          previewResult(result, request);
          break;
        case "ready":
          setAvailability("ready");
          if (request.action === "enroll")
            setMessage("FFmpeg is ready. You can render the sample.");
          break;
        case "needs-encoder":
          setAvailability("needs-encoder");
          if (request.action === "enroll") {
            setMessage(
              "Studio could not verify that FFmpeg build. Choose the exact qualified executable.",
            );
          }
          break;
        case "unavailable":
          if (request.action === "save") {
            setMessage(
              "That destination is unavailable. Use Save As to choose a folder on a supported local drive.",
            );
          } else if (request.action === "enroll") {
            setMessage(
              "That executable location is unavailable. Choose the qualified FFmpeg file on a supported local drive.",
            );
          } else {
            clearPreview();
            setAvailability("unavailable");
            setMessage("Sample rendering is unavailable on this desktop.");
          }
          break;
        case "cancelled":
          setMessage(
            request.action === "save"
              ? "Save As was cancelled. Your sample is still ready to save."
              : request.action === "enroll"
                ? "FFmpeg selection was cancelled. You can choose it again."
                : "The sample operation was cancelled. You can try again.",
          );
          break;
        case "saved":
          if (request.action === "save") discard(request.token);
          clearPreview();
          setMessage("Sample MP4 saved.");
          break;
        case "occupied":
          setMessage(
            request.action === "save"
              ? "That file already exists. Use Save As to choose a different name or folder."
              : "The desktop is busy. Wait for the other sample operation to finish and try again.",
          );
          break;
        case "uncertain":
          setMessage(
            request.action === "save"
              ? "Studio could not confirm the save. Check the destination before trying again."
              : "Studio could not confirm that the sample operation finished. Try again once the desktop is ready.",
          );
          if (request.action === "save") {
            discard(request.token);
            clearPreview();
          }
          break;
        case "failed":
          if (request.action === "save") {
            setMessage("Studio could not save the MP4. Use Save As to try another destination.");
          } else if (request.action === "enroll") {
            setMessage(
              "Studio could not use that executable. Choose the exact qualified FFmpeg build.",
            );
          } else if (request.action === "render") {
            setMessage("Studio could not render the sample. Try again.");
          } else {
            setMessage("Studio could not check the sample renderer. Try checking again.");
          }
          break;
      }
    } finally {
      nativeRequestActive = false;
      inFlight.current = null;
      if (attached.current) setBusy(null);
    }
  }

  function toggleSample() {
    if (open) {
      generation.current++;
      clearPreview();
      setOpen(false);
      setAvailability("unknown");
      setStart("30");
      setEnd("90");
      setMessage("");
    } else if (!inFlight.current) {
      setOpen(true);
      void run({ action: "status" });
    }
  }

  function renderSample() {
    if (!range || busy || availability !== "ready") return;
    clearPreview();
    void run({ action: "render", projectId, ...range });
  }

  return (
    <fieldset className="ops-look ops-clip-sample">
      <legend>Desktop sample export</legend>
      <p>
        Try an original five-second Studio test pattern. Your recording, marks, and captions stay
        separate.
      </p>
      <div className="ops-clip-sample-actions">
        <button
          type="button"
          className="ops-button"
          aria-expanded={open}
          aria-controls={controlsId}
          aria-disabled={!open && busy !== null}
          onClick={toggleSample}
        >
          {open ? "Close sample" : "Try a sample export"}
        </button>
      </div>
      {lastSave && (!open || (!message && !busy)) && <p aria-live="polite">{lastSave}</p>}
      <div id={controlsId} className="ops-clip-sample-controls" hidden={!open}>
        <p>
          The 800 × 450 source runs at 24 frames per second. Studio makes a centered, silent 360 ×
          640 H.264 MP4.
        </p>
        {availability !== "unavailable" && (
          <>
            <div className="ops-clip-sample-range">
              <label className="ops-field">
                <span>First frame to include</span>
                <input
                  type="number"
                  min={0}
                  max={SAMPLE_FRAMES - 1}
                  step={1}
                  value={start}
                  readOnly={busy === "save"}
                  aria-describedby={rangeId}
                  aria-invalid={!range}
                  onChange={(event) => changeRange(setStart, event.target.value)}
                />
              </label>
              <label className="ops-field">
                <span>End frame (excluded)</span>
                <input
                  type="number"
                  min={1}
                  max={SAMPLE_FRAMES}
                  step={1}
                  value={end}
                  readOnly={busy === "save"}
                  aria-describedby={rangeId}
                  aria-invalid={!range}
                  onChange={(event) => changeRange(setEnd, event.target.value)}
                />
              </label>
            </div>
            <p id={rangeId}>
              {range
                ? sampleRangeSummary(range)
                : "Enter a whole first frame from 0 to 119 and a later end frame up to 120."}
            </p>
            {availability === "needs-encoder" && (
              <p>
                Download the Windows x64 file ending in <code>win_amd64.whl</code> from{" "}
                <a href="https://pypi.org/project/imageio-ffmpeg/0.6.0/#files" target="_blank" rel="noopener noreferrer">ImageIO’s release files</a>,
                then choose it below. Studio checks the download and extracts the sample encoder.
                You can also choose the matching FFmpeg executable if you already have it.
              </p>
            )}
            <div className="ops-clip-sample-actions">
              {availability === "unknown" ? (
                <button
                  type="button"
                  className="ops-button"
                  aria-disabled={busy !== null}
                  onClick={() => void run({ action: "status" })}
                >
                  Check sample renderer
                </button>
              ) : availability === "needs-encoder" ? (
                <button
                  type="button"
                  className="ops-button"
                  aria-disabled={busy !== null}
                  onClick={() => void run({ action: "enroll" })}
                >
                  Choose FFmpeg…
                </button>
              ) : (
                <button
                  type="button"
                  className="ops-button ops-primary"
                  ref={renderButton}
                  aria-disabled={busy !== null || !range}
                  onClick={renderSample}
                >
                  Render sample
                </button>
              )}
            </div>
          </>
        )}
        <div role="status" className="ops-clip-sample-status">
          {busy === "status"
            ? "Checking the desktop renderer…"
            : busy === "enroll"
              ? "Waiting for FFmpeg selection and verification…"
              : busy === "render"
                ? "Rendering the sample…"
                : busy === "save"
                  ? "Waiting for Save As…"
                  : message}
        </div>
        {preview && (
          <div className="ops-clip-sample-controls" ref={reviewPanel}>
            <video
              key={preview.url}
              className="ops-clip-sample-player"
              aria-label="Rendered sample preview"
              src={preview.url}
              controls
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={() => {
                if (currentPreview.current === preview) setPlayable(true);
              }}
              onError={() => {
                if (currentPreview.current !== preview) return;
                clearPreview();
                setMessage("Studio could not play the rendered sample. Try rendering it again.");
              }}
            />
            <div className="ops-clip-sample-actions">
              <button
                type="button"
                className="ops-button"
                aria-disabled={!playable || busy !== null}
                onClick={() => {
                  if (playable && currentPreview.current === preview) {
                    void run({ action: "save", projectId, token: preview.token });
                  }
                }}
              >
                Save As… (.mp4)
              </button>
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}
