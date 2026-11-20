/* oxlint-disable shadcn/no-unknown-classes -- The delivery panel uses tutorialProduction.css. */
import { useLayoutEffect, useRef, useState } from "react";
import { T, useGT } from "gt-react";
import { parseStudioMediaPairing } from "./studioMediaConnection";

interface Connection {
  origin: string;
  token: string;
  voice: string;
  nativeVoice: boolean;
}

interface Approval {
  id: string;
  manifest: string;
}

interface Delivery {
  movie: string;
  captions: string;
  poster: string;
}

interface Request {
  approvalId: string;
  controller: AbortController;
}

type SourceFiles = Readonly<Record<string, File>>;
const maxRenderBytes = 128 * 1024 * 1024;

function release(delivery: Delivery | null) {
  if (delivery) Object.values(delivery).forEach((url) => URL.revokeObjectURL(url));
}

function CompletedRender({ delivery }: { delivery: Delivery }) {
  const gt = useGT();
  return (
    <div>
      <h4>
        <T>Last completed render</T>
      </h4>
      <video
        aria-label={gt("Rendered tutorial")}
        controls
        playsInline
        preload="metadata"
        src={delivery.movie}
        poster={delivery.poster}
        style={{ width: "100%", maxHeight: "28rem" }}
      >
        <track kind="captions" src={delivery.captions} srcLang="en" label={gt("English")} />
      </video>
      <p>
        <a href={delivery.movie} download="Studio tutorial.mp4">
          <T>Download tutorial MP4</T>
        </a>
        {" · "}
        <a href={delivery.captions} download="Studio tutorial.vtt">
          <T>Download subtitles</T>
        </a>
      </p>
    </div>
  );
}

export function TutorialRenderPanel({
  approval,
  sources,
}: {
  approval: Approval | null;
  sources: SourceFiles;
}) {
  const gt = useGT();
  const [code, setCode] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const [narration, setNarration] = useState<{ approvalId: string; file: File }>();
  const [busy, setBusy] = useState<"connect" | "render" | null>(null);
  const [message, setMessage] = useState<{ approvalId: string; text: string } | null>(null);
  const [result, setResult] = useState<Delivery | null>(null);
  const request = useRef<Request | null>(null);
  const delivered = useRef<Delivery | null>(null);
  const approvalId = approval?.id;
  const voiceover = narration?.approvalId === approvalId ? narration?.file : undefined;
  const origin =
    window.location.origin === "null"
      ? window.location.protocol + "//" + window.location.host
      : window.location.origin;
  const plan = approval
    ? (JSON.parse(approval.manifest) as { scenes: { source: string }[] })
    : null;
  const ids = [...new Set(plan?.scenes.map((scene) => scene.source))];
  const ready =
    !!approval && ids.every((id) => Object.hasOwn(sources, id) && sources[id] instanceof File);
  const size = ids.reduce(
    (sum, id) => sum + (sources[id]?.size ?? 0) + 512,
    (voiceover?.size ?? 0) + new Blob([approval?.manifest ?? ""]).size + 4096,
  );
  const canRender =
    ready &&
    !!connection &&
    (connection.nativeVoice || !!voiceover) &&
    !busy &&
    size < maxRenderBytes;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Cancel work sent under an approval the author has superseded.
  useLayoutEffect(() => {
    const active = request.current;
    if (active && active.approvalId !== approvalId) {
      request.current = null;
      active.controller.abort();
      setBusy(null);
    }
  }, [approvalId]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Release the local request and browser media URLs when the sheet unmounts.
  useLayoutEffect(
    () => () => {
      const active = request.current;
      request.current = null;
      active?.controller.abort();
      release(delivered.current);
      delivered.current = null;
    },
    [],
  );

  function start(kind: "connect" | "render", id: string) {
    const next = { approvalId: id, controller: new AbortController() };
    request.current = next;
    setBusy(kind);
    setMessage(null);
    return next;
  }

  function finish(pending: Request) {
    if (request.current === pending) {
      request.current = null;
      setBusy(null);
    }
  }

  function report(pending: Request, text: string) {
    if (request.current === pending) setMessage({ approvalId: pending.approvalId, text });
  }

  async function connect() {
    if (!approval || request.current) return;
    const pending = start("connect", approval.id);
    const signal = AbortSignal.any([pending.controller.signal, AbortSignal.timeout(6000)]);
    try {
      const chosen = parseStudioMediaPairing(code);
      const response = await fetch(chosen.origin + "/info", {
        headers: { Authorization: "Bearer " + chosen.token },
        signal,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error();
      const info: unknown = await response.json();
      if (
        !info ||
        typeof info !== "object" ||
        !("schema" in info) ||
        info.schema !== "studio-media-bridge/1" ||
        !("voice" in info) ||
        typeof info.voice !== "string" ||
        !info.voice ||
        info.voice.length > 120
      )
        throw new Error();
      signal.throwIfAborted();
      setConnection({
        ...chosen,
        voice: info.voice,
        nativeVoice: "nativeVoiceAvailable" in info && info.nativeVoiceAvailable === true,
      });
      setCode("");
    } catch {
      report(
        pending,
        gt("Could not connect. Check the pairing code and the Studio origin shown below."),
      );
    } finally {
      finish(pending);
    }
  }

  async function render() {
    if (!approval || !connection || !canRender || request.current) return;
    const pending = start("render", approval.id);
    const { signal } = pending.controller;
    try {
      const form = new FormData();
      form.append("plan", approval.manifest);
      for (const id of ids) form.append("source-" + id, sources[id]!, id + ".media");
      if (voiceover) form.append("narration-wav", voiceover, "narration.wav");
      const response = await fetch(connection.origin + "/render", {
        method: "POST",
        body: form,
        headers: { Authorization: "Bearer " + connection.token },
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
      });
      if (!response.ok) {
        const reason = await response.text();
        throw new Error(reason.length < 180 ? reason : "");
      }
      const output = await response.formData();
      const movie = output.get("movie");
      const captions = output.get("captions");
      const poster = output.get("preview");
      if (
        !(movie instanceof Blob) ||
        movie.type !== "video/mp4" ||
        !movie.size ||
        !(captions instanceof Blob) ||
        captions.type !== "text/vtt" ||
        !(poster instanceof Blob) ||
        poster.type !== "image/jpeg"
      )
        throw new Error();
      signal.throwIfAborted();
      const next = {
        movie: URL.createObjectURL(movie),
        captions: URL.createObjectURL(captions),
        poster: URL.createObjectURL(poster),
      };
      release(delivered.current);
      delivered.current = next;
      setResult(next);
    } catch (error) {
      report(
        pending,
        signal.aborted
          ? gt("Render cancelled.")
          : error instanceof Error && error.message && error.message.length < 180
            ? error.message
            : gt("Could not finish the tutorial render."),
      );
    } finally {
      finish(pending);
    }
  }

  if (!approval && !result) return null;
  return (
    <section className="ops-tutorial-delivery" aria-label={gt("Tutorial render")}>
      <h3>
        <T>Render your tutorial</T>
      </h3>
      {approval &&
        (connection ? (
          <>
            <p>
              <T>Local renderer connected</T>
              {" · "}
              {connection.nativeVoice ? connection.voice : gt("Recorded WAV narration")}{" "}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  setConnection(null);
                  setNarration(undefined);
                  setMessage(null);
                }}
              >
                <T>Disconnect</T>
              </button>
            </p>
            <label>
              {connection.nativeVoice
                ? gt("Recorded narration (optional WAV)")
                : gt("Narration WAV for the full timeline")}
              <input
                key="narration-wav"
                type="file"
                accept=".wav,audio/wav"
                disabled={!!busy}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  setNarration(file ? { approvalId: approval.id, file } : undefined);
                }}
              />
            </label>
            <p>
              {!ready
                ? gt("Attach all the source recordings used in these shots.")
                : size >= maxRenderBytes
                  ? gt("This render accepts up to 128 MiB of source footage and narration.")
                  : gt(
                      "Your recording and reviewed shot list go to the renderer on this computer.",
                    )}
            </p>
            <button type="button" disabled={!canRender} onClick={() => void render()}>
              <T>Render narrated MP4</T>
            </button>
          </>
        ) : (
          <>
            <details>
              <summary>
                <T>Start the local renderer</T>
              </summary>
              <p>
                <T>
                  On Windows, open start-renderer.ps1 in the studio-media tools folder with
                  PowerShell. It can help you choose FFmpeg. For a browser workspace or another
                  operating system, run this command from the Studio source directory.
                </T>
              </p>
              <code>
                {'node tools/studio-media/bridge.mjs --origin "' +
                  origin +
                  '" --ffmpeg "PATH_TO_FFMPEG"'}
              </code>
              <p>
                <T>
                  Windows can narrate with an installed system voice. On other systems, attach a
                  recorded WAV covering the whole timeline.
                </T>
              </p>
            </details>
            <label>
              <T>Renderer pairing code</T>
              <input
                key="renderer-pairing-code"
                type="password"
                value={code}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setCode(event.currentTarget.value)}
              />
            </label>
            <button type="button" disabled={!code || !!busy} onClick={() => void connect()}>
              <T>Connect local renderer</T>
            </button>
          </>
        ))}
      {busy === "render" && (
        <p role="status">
          <T>Rendering picture, voice and subtitles…</T>{" "}
          <button type="button" onClick={() => request.current?.controller.abort()}>
            <T>Cancel render</T>
          </button>
        </p>
      )}
      {message && message.approvalId === approvalId && <p role="status">{message.text}</p>}
      {result && <CompletedRender delivery={result} />}
    </section>
  );
}
