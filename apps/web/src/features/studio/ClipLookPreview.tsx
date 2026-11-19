import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./clipLook.css";

const looks = [
  { id: "quiet", name: "Subtitles" },
  { id: "headline", name: "Headline" },
  { id: "label", name: "Callout" },
] as const;

type Look = (typeof looks)[number]["id"];

export function clipLookName(id: string | undefined) {
  return looks.find((look) => look.id === id)?.name ?? "No saved look";
}

export function ClipLookPreview({
  fields,
  writeField,
}: {
  fields: Record<string, string>;
  writeField: (key: string, value: string) => void;
}) {
  const saved = looks.find((look) => look.id === fields.captionLook)?.id;
  const [candidate, setCandidate] = useState<Look>(saved ?? "quiet");
  const [reference, setReference] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const caption = useRef<HTMLElement>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const node = caption.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [candidate, fields.captionLine]);
  const [undo, setUndo] = useState<{ previous: string; applied: Look } | null>(null);
  useEffect(() => () => {
    if (reference) URL.revokeObjectURL(reference.url);
  }, [reference]);

  function chooseReference(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setError("Choose a PNG, JPEG or WebP image up to 12 MB.");
      return;
    }
    setError("");
    setReference({ url: URL.createObjectURL(file), name: file.name });
  }

  return (
    <fieldset className="ops-look">
      <legend>Try a caption look</legend>
      <p>Compare looks on one frame. Only the caption and your saved look go into the edit plan.</p>
      <div className="ops-look-layout">
        <figure className={`ops-look-frame ops-look-${candidate}`}>
          {reference && (
            <img src={reference.url} alt="Selected reference frame" onError={() => {
              setError("This image could not be opened. Choose another frame.");
              setReference(null);
            }} />
          )}
          <figcaption ref={caption}>{fields.captionLine?.trim() || "One small change"}</figcaption>
        </figure>
        <div className="ops-look-controls">
          <label className="ops-field">
            <span>Caption text</span>
            <input maxLength={160} placeholder="One small change" value={fields.captionLine ?? ""}
              onChange={(e) => writeField("captionLine", e.target.value)} />
          </label>
          <div className="ops-look-presets" role="group" aria-label="Caption look">
            {looks.map(({ id, name }) => (
              <button type="button" className="ops-button" key={id} aria-pressed={candidate === id}
                onClick={() => setCandidate(id)}>{name}</button>
            ))}
          </div>
          <label className="ops-look-import">
            Use a permitted reference still (optional)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => {
              chooseReference(e.target.files?.[0]);
              e.target.value = "";
            }} />
          </label>
          {reference && <button type="button" className="ops-link" onClick={() => setReference(null)}>
            Remove {reference.name}
          </button>}
          {error && <p role="alert">{error}</p>}
          {overflows && <p role="status">This caption exceeds the frame. Shorten it or choose a smaller look.</p>}
          <div className="ops-look-presets">
            <button type="button" className="ops-button" disabled={candidate === saved || overflows} onClick={() => {
              setUndo({ previous: fields.captionLook ?? "", applied: candidate });
              writeField("captionLook", candidate);
            }}>{candidate === saved ? "Look saved" : "Use this look"}</button>
            {undo && saved === undo.applied && (
              <button type="button" className="ops-link" onClick={() => {
                writeField("captionLook", undo.previous);
                setCandidate(looks.find((look) => look.id === undo.previous)?.id ?? "quiet");
                setUndo(null);
              }}>Undo look</button>
            )}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
