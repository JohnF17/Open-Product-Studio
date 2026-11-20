import type { ClipPick } from "./clipPicks";
import { readClipVideo, type ClipTranscriptCue } from "./clipperEvidence";

type Cue = Pick<ClipTranscriptCue, "startMs" | "endMs" | "text">;
export type FootageCut = Pick<ClipPick, "title" | "startMs" | "endMs" | "settings"> & {
  caption?: string | undefined;
  captions?: readonly Cue[] | undefined;
};
export interface FootageOutput {
  blob: Blob;
  extension: "webm" | "mp4";
  audio: boolean;
  width: number;
  height: number;
}

function recorderFormat(audio: boolean) {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return;
  const types = audio
    ? ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/mp4;codecs=avc1.42E01E,mp4a.40.2"]
    : ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/mp4;codecs=avc1.42E01E"];
  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

export function supportsFootageExport() {
  return Boolean(recorderFormat(true) || recorderFormat(false));
}

function outputSize({ aspect, resolution }: FootageCut["settings"]) {
  const short = resolution === "1080p" ? 1080 : 720;
  const long = short * 16 / 9;
  return { width: aspect === "16:9" ? long : short, height: aspect === "9:16" ? long : short };
}

function cutCaptions(cut: FootageCut): Cue[] {
  if (cut.settings.captions === "off") return [];
  const cues = (cut.captions ?? [])
    .filter((cue) => cue.endMs > cut.startMs && cue.startMs < cut.endMs && cue.text.trim())
    .map((cue) => ({ startMs: Math.max(cue.startMs, cut.startMs), endMs: Math.min(cue.endMs, cut.endMs), text: cue.text.trim() }));
  if (cues.length || !cut.caption?.trim()) return cues;
  return [{ startMs: cut.startMs, endMs: cut.endMs, text: cut.caption.trim() }];
}

// Encode only picture, timing and caption inputs. Titles and download numbering can change independently.
export function footageCutRevision(cut: FootageCut) {
  const { aspect, resolution, captions, placement } = cut.settings;
  return JSON.stringify([cut.startMs, cut.endMs, aspect, resolution, captions, captions === "on" ? placement : null, cutCaptions(cut)]);
}

function captionOverlay(text: string, width: number, height: number, placement: FootageCut["settings"]["placement"]) {
  const overlay = document.createElement("canvas");
  overlay.width = width;
  overlay.height = height;
  const ctx = overlay.getContext("2d");
  if (!ctx) throw new Error("The browser could not draw the captions.");
  const maxWidth = width * 0.86;
  let size = Math.round(Math.min(width, height) * 0.052);
  let lines: string[];
  do {
    ctx.font = `600 ${size}px sans-serif`;
    lines = [""];
    for (const word of text.trim().split(/\s+/u)) {
      const i = lines.length - 1;
      const next = lines[i] ? lines[i] + " " + word : word;
      if (lines[i] && ctx.measureText(next).width > maxWidth) lines.push(word);
      else lines[i] = next;
    }
    if (lines.length * size * 1.25 < height * 0.42) break;
    size -= 2;
    if (size < 16) throw new Error("This caption is too long for the frame. Shorten it or split its timing.");
  } while (true);
  const pad = size * 0.35;
  const lineHeight = size * 1.25;
  const band = lineHeight * lines.length + pad * 2;
  const top = placement === "top" ? height * 0.06 : placement === "center" ? (height - band) / 2 : height * 0.94 - band;
  const boxWidth = Math.min(maxWidth, Math.max(...lines.map((line) => ctx.measureText(line).width))) + size;
  ctx.fillStyle = "rgba(0,0,0,0.80)";
  ctx.fillRect((width - boxWidth) / 2, top, boxWidth, band);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => ctx.fillText(line, width / 2, top + pad + (index + 0.5) * lineHeight, maxWidth));
  return overlay;
}

async function seek(video: HTMLVideoElement, seconds: number, signal: AbortSignal) {
  if (!video.seeking && video.readyState >= 2 && video.currentTime === seconds) return;
  await new Promise<void>((resolve, reject) => {
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const timeout = setTimeout(() => finish(new Error("The browser timed out seeking the selected range.")), 10_000);
    function finish(error?: unknown) {
      clearTimeout(timeout);
      listeners.abort();
      if (error) reject(error); else resolve();
    }
    const ready = () => { if (!video.seeking && video.readyState >= 2) finish(); };
    video.addEventListener("seeked", ready, options);
    video.addEventListener("loadeddata", ready, options);
    video.addEventListener("error", () => finish(new Error("The browser could not decode this range.")), options);
    signal.addEventListener("abort", () => finish(signal.reason), options);
    try {
      signal.throwIfAborted();
      video.currentTime = seconds;
      ready();
    } catch (error) { finish(error); }
  });
}

// Audio capture may need a playing source to start. Prime its canvas track in advance.
async function warmPicture(track: MediaStreamTrack, draw: () => void, signal: AbortSignal) {
  const format = recorderFormat(false);
  const probe = new MediaRecorder(new MediaStream([track]), format ? { mimeType: format } : undefined);
  await new Promise<void>((resolve, reject) => {
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const timer = setInterval(() => { try { draw(); } catch (error) { finish(error); } }, 33);
    const timeout = setTimeout(() => finish(new Error("The local encoder did not produce a picture. Try again.")), 12_000);
    function finish(error?: unknown) {
      clearInterval(timer);
      clearTimeout(timeout);
      listeners.abort();
      if (probe.state !== "inactive") probe.stop();
      if (error) reject(error); else resolve();
    }
    probe.addEventListener("dataavailable", (e) => {
      if (e.data.size > 1 && probe.state !== "inactive") probe.stop();
    }, options);
    probe.addEventListener("stop", () => finish(), options);
    probe.addEventListener("error", () => finish(new Error("The browser could not start the local encoder.")), options);
    signal.addEventListener("abort", () => finish(signal.reason), options);
    try { signal.throwIfAborted(); probe.start(50); draw(); } catch (error) { finish(error); }
  });
}

function recordRange(
  video: HTMLVideoElement, recorder: MediaRecorder, cut: FootageCut,
  draw: (ms: number) => void, signal: AbortSignal, progress?: (fraction: number) => void,
) {
  return new Promise<Blob>((resolve, reject) => {
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const chunks: Blob[] = [];
    let frame = 0;
    let lastTime = video.currentTime;
    let lastAdvance = performance.now();
    let lastProgress = -1;
    let stopping = false;
    function release() {
      cancelAnimationFrame(frame);
      clearInterval(watchdog);
      listeners.abort();
      video.pause();
      if (recorder.state !== "inactive") recorder.stop();
    }
    function fail(error: unknown) { release(); reject(error); }
    function finish() {
      if (stopping) return;
      stopping = true;
      video.pause();
      if (recorder.state !== "inactive") recorder.stop();
      else fail(new Error("The selected range ended before the encoder started."));
    }
    function paint() {
      if (stopping) return;
      try {
        const ms = video.currentTime * 1000;
        if (ms >= cut.endMs || video.ended) { finish(); return; }
        draw(ms);
        if (video.currentTime !== lastTime) { lastTime = video.currentTime; lastAdvance = performance.now(); }
        const percent = Math.floor(100 * (ms - cut.startMs) / (cut.endMs - cut.startMs));
        if (percent !== lastProgress) { lastProgress = percent; progress?.(Math.max(0, percent) / 100); }
        frame = requestAnimationFrame(paint);
      } catch (error) { fail(error); }
    }
    const watchdog = setInterval(() => {
      if (performance.now() - lastAdvance > 12_000) fail(new Error("Local playback or encoding stalled. Try the range again."));
    }, 1000);
    signal.addEventListener("abort", () => fail(signal.reason), options);
    video.addEventListener("error", () => fail(new Error("The browser lost the source picture.")), options);
    video.addEventListener("ended", finish, options);
    recorder.addEventListener("error", () => fail(new Error("The browser could not encode this range.")), options);
    recorder.addEventListener("dataavailable", (e) => { if (e.data.size) chunks.push(e.data); }, options);
    recorder.addEventListener("stop", () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      release();
      if (!blob.size || !stopping) reject(new Error("Encoding stopped before the selected range completed."));
      else resolve(blob);
    }, options);
    function startRecorder() {
      try {
        recorder.start(100);
        paint();
      } catch (error) { fail(error); }
    }
    function play() {
      void video.play().catch((error: unknown) => { if (!listeners.signal.aborted) fail(error); });
    }
    try {
      signal.throwIfAborted();
      draw(cut.startMs);
      if (recorder.stream.getAudioTracks().length) {
        video.addEventListener("playing", startRecorder, { ...options, once: true });
        play();
      } else {
        // Feed the actual encoder the in-point until it starts. Advancing playback
        // first can consume a short cut while a cold encoder is still opening.
        recorder.addEventListener("start", play, { ...options, once: true });
        startRecorder();
      }
    } catch (error) { fail(error); }
  });
}

export async function renderFootageCut(
  file: File, cut: FootageCut, allowSilent: boolean, signal: AbortSignal, progress?: (fraction: number) => void,
): Promise<FootageOutput> {
  if (!supportsFootageExport()) throw new Error("This browser has no supported local video encoder.");
  const cues = cutCaptions(cut);
  if (cut.settings.captions === "on" && !cues.length) {
    throw new Error("Add a caption, import timed captions for this range, or turn captions off in the clip settings.");
  }
  const lifecycle = new AbortController();
  const renderSignal = AbortSignal.any([signal, lifecycle.signal]);
  const onVisibility = () => {
    if (document.hidden) lifecycle.abort(new Error("Rendering stopped because the window was hidden. Keep it visible and retry."));
  };
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();
  let source: Awaited<ReturnType<typeof readClipVideo>> | undefined;
  let picture: MediaStream | undefined;
  let captured: MediaStream | undefined;
  try {
    source = await readClipVideo(file, renderSignal);
    const { video, durationMs } = source;
    if (!Number.isSafeInteger(cut.startMs) || !Number.isSafeInteger(cut.endMs) ||
        cut.startMs < 0 || cut.startMs >= cut.endMs || cut.endMs > durationMs) {
      throw new Error("The approved range does not fit the selected recording. Review its marks.");
    }
    await seek(video, cut.startMs / 1000, renderSignal);
    const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
    try { captured = capture?.call(video); } catch { /* Silent export requires user consent below. */ }
    const track = captured?.getAudioTracks().find((item) => item.readyState === "live" && item.enabled);
    const audioFormat = track && recorderFormat(true);
    if (!audioFormat && !allowSilent) throw new Error("Source audio is absent or unavailable here. Allow silent export to continue.");
    const format = audioFormat || recorderFormat(false);
    if (!format) throw new Error("The browser has no encoder for this track combination.");
    const canvas = document.createElement("canvas");
    const { width, height } = outputSize(cut.settings);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!ctx) throw new Error("The browser could not create a video frame.");
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const sw = width / scale;
    const sh = height / scale;
    let previousText = "";
    let overlay: HTMLCanvasElement | undefined;
    const draw = (ms: number) => {
      ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, width, height);
      const text = cues.filter((cue) => cue.startMs <= ms && ms < cue.endMs).map((cue) => cue.text).join(" ");
      if (text !== previousText) {
        overlay = text ? captionOverlay(text, width, height, cut.settings.placement) : undefined;
        previousText = text;
      }
      if (overlay) ctx.drawImage(overlay, 0, 0);
    };
    picture = canvas.captureStream(30);
    const canvasTrack = picture.getVideoTracks()[0];
    if (!canvasTrack) throw new Error("The browser could not capture the rendered picture.");
    if (audioFormat && track) {
      await warmPicture(canvasTrack, () => draw(cut.startMs), renderSignal);
      picture.addTrack(track);
    }
    const expectedMs = cut.endMs - cut.startMs;
    const attempts = expectedMs < 5000 ? 2 : 1;
    let measured = "";
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt) await seek(video, cut.startMs / 1000, renderSignal);
      if (audioFormat && track?.readyState !== "live") throw new Error("The source audio ended. Retry this clip.");
      const recorder = new MediaRecorder(picture, { mimeType: format });
      const blob = await recordRange(video, recorder, cut, draw, renderSignal, progress);
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const verified = await readClipVideo(new File([blob], "clip." + extension, { type: blob.type }), renderSignal);
      try {
        if (verified.video.videoWidth === width && verified.video.videoHeight === height &&
            Math.abs(verified.durationMs - expectedMs) <= Math.min(expectedMs * 0.35, 350)) {
          return { blob, width, height, audio: Boolean(audioFormat), extension };
        }
        measured = `${verified.durationMs} ms at ${verified.video.videoWidth} × ${verified.video.videoHeight}`;
      } finally { verified.release(); }
      // A short cut can lose its opening frames while the codec initializes.
      // Reuse the live capture track for one bounded retry before reporting failure.
    }
    throw new Error(`The encoder produced ${measured}. The cut requires ${expectedMs} ms at ${width} × ${height}. Retry with the window visible.`);
  } finally {
    document.removeEventListener("visibilitychange", onVisibility);
    picture?.getTracks().forEach((track) => track.stop());
    captured?.getTracks().forEach((track) => track.stop());
    source?.release();
  }
}
