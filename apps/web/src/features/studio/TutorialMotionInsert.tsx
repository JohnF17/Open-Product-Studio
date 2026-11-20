/* oxlint-disable shadcn/no-unknown-classes -- Uses the Studio controls and the tutorial sheet styles. */
import { T, useGT } from "gt-react";
import { useEffect, useRef, useState } from "react";
import { parseStudioMediaPairing } from "./studioMediaConnection";

export function TutorialMotionInsert({
  occupied,
  onCreated,
}: {
  occupied: readonly string[];
  onCreated: (id: string, file: File) => void;
}) {
  const gt = useGT();
  const [code, setCode] = useState("");
  const [style, setStyle] = useState("hyperframes");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const job = useRef<AbortController | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Close the local motion-render request when the sheet unmounts.
  useEffect(() => () => job.current?.abort(), []);
  async function create() {
    if (job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const pair = parseStudioMediaPairing(code);
      const form = new FormData();
      form.append("style", style);
      const res = await fetch(pair.origin + "/motion", {
        method: "POST",
        body: form,
        headers: { Authorization: "Bearer " + pair.token },
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (!res.ok || res.headers.get("Content-Type") !== "video/mp4") throw Error();
      const data = await res.blob();
      controller.signal.throwIfAborted();
      if (data.size < 12 || data.size > 20 * 1024 * 1024) throw Error();
      let n = 1;
      while (occupied.includes(style + "-" + n)) n++;
      const id = style + "-" + n;
      onCreated(id, new File([data], id + ".mp4", { type: "video/mp4" }));
      setMessage(gt("Motion insert rendered. Choose this source in a shot."));
      setCode("");
    } catch {
      if (!controller.signal.aborted)
        setMessage(
          gt(
            "Could not render that insert. Check the pairing code, the selected tool installation and the renderer’s motion setting.",
          ),
        );
    } finally {
      job.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <details className="ops-tutorial-share">
      <summary>
        <T>Create a motion insert</T>
      </summary>
      <p>
        <T>
          Render an original motion graphic as a source recording. The tool you choose must be
          installed on the paired computer.
        </T>
      </p>
      <label className="ops-field">
        <span>
          <T>Motion treatment</T>
        </span>
        <select disabled={busy} value={style} onChange={(e) => setStyle(e.currentTarget.value)}>
          <option value="hyperframes">{gt("HyperFrames · Animated rail")}</option>
          <option value="remotion">{gt("Remotion · Sequence cards")}</option>
          <option value="blender">{gt("Blender · Orbit")}</option>
        </select>
      </label>
      <label className="ops-field">
        <span>
          <T>Motion renderer pairing code</T>
        </span>
        <input
          type="password"
          value={code}
          autoComplete="off"
          disabled={busy}
          onChange={(e) => setCode(e.currentTarget.value)}
        />
      </label>
      <button
        type="button"
        className="ops-button"
        disabled={busy || !code}
        onClick={() => void create()}
      >
        {busy ? gt("Rendering insert…") : gt("Create and attach insert")}
      </button>
      <p role="status">{message}</p>
    </details>
  );
}
