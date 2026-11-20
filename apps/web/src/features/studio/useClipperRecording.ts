import { useLayoutEffect, useRef, useState } from "react";
import { maxClipSourceBytes } from "./clipperEvidence";

const maxRecordingMs = 5 * 60 * 1000;
const recordingFormats = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];

interface Session {
  stream?: MediaStream;
  recorder?: MediaRecorder;
  cleanup?: () => void;
  timer?: ReturnType<typeof setTimeout>;
}

function releaseTracks(session: Session) {
  clearTimeout(session.timer);
  session.stream?.getTracks().forEach((track) => track.stop());
}
function discard(session: Session) {
  session.cleanup?.();
  if (session.recorder && session.recorder.state !== "inactive") session.recorder.stop();
  releaseTracks(session);
}

export function useClipperRecording(onFile: (file: File) => void, onError: (error: string) => void) {
  const session = useRef<Session | null>(null);
  const [phase, setPhase] = useState<"idle" | "choosing" | "recording" | "finishing">("idle");
  // T3's Electron preview capture is scoped to its own armed web contents. This route
  // needs a browser that presents a real screen/window chooser to the creator.
  const format = !("desktopBridge" in window) && typeof navigator.mediaDevices?.getDisplayMedia === "function"
    && typeof MediaRecorder !== "undefined" && recordingFormats.find((type) => MediaRecorder.isTypeSupported(type));

  useLayoutEffect(() => () => {
    const current = session.current;
    session.current = null;
    if (current) discard(current);
  }, []);

  function cancel() {
    const current = session.current;
    session.current = null;
    if (current) discard(current);
    setPhase("idle");
  }

  async function start() {
    if (!format || session.current || document.hidden) return;
    const current: Session = {};
    session.current = current;
    onError("");
    setPhase("choosing");
    try {
      // Keep this request in the click's user-activation stack. Only the browser
      // and the creator select the surface. Request no audio.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      current.stream = stream;
      if (session.current !== current || document.hidden) {
        if (session.current === current) cancel();
        else releaseTracks(current);
        return;
      }
      stream.getAudioTracks().forEach((track) => { track.stop(); stream.removeTrack(track); });
      const video = stream.getVideoTracks()[0];
      if (!video || video.readyState === "ended") throw new Error("No display video");
      const recorder = new MediaRecorder(stream, { mimeType: format });
      current.recorder = recorder;
      const chunks: Blob[] = [];
      let size = 0;
      const listeners = new AbortController();
      const options = { signal: listeners.signal };
      current.cleanup = () => listeners.abort();
      recorder.addEventListener("dataavailable", ({ data }) => {
        if (session.current !== current || !data.size) return;
        size += data.size;
        if (size > maxClipSourceBytes) {
          cancel();
          onError("The recording exceeded 250 MiB. Try a shorter recording or import a file.");
        } else {
          chunks.push(data);
        }
      }, options);
      recorder.addEventListener("stop", () => {
        if (session.current !== current) return;
        cancel();
        if (!chunks.length) {
          onError("The recording was empty. Try again or import a video file.");
          return;
        }
        const extension = recorder.mimeType.startsWith("video/mp4") ? "mp4" : "webm";
        onFile(new File(chunks, "screen-recording." + extension, { type: recorder.mimeType }));
      }, { ...options, once: true });
      recorder.addEventListener("error", () => {
        if (session.current !== current) return;
        cancel();
        onError("Recording stopped because the browser could not encode it. Import a video file instead.");
      }, { ...options, once: true });
      video.addEventListener("ended", stop, { ...options, once: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
      }, options);
      recorder.start(500);
      setPhase("recording");
      current.timer = setTimeout(stop, maxRecordingMs);
    } catch {
      if (session.current !== current) return;
      cancel();
      onError("Screen sharing was cancelled, denied or unavailable. You can try again or import a video file.");
    }
  }

  function stop() {
    const current = session.current;
    if (!current?.recorder || current.recorder.state === "inactive") return;
    setPhase("finishing");
    current.recorder.stop();
    releaseTracks(current);
  }

  return { available: !!format, phase, start, stop, cancel };
}
