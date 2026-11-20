import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ClipPick } from "./clipPicks";
import "./clipSettingsAssistant.css";

export type ClipSettings = ClipPick["settings"];
type Setting = keyof ClipSettings;

const controls = {
  aspect: {
    label: "Aspect ratio",
    options: {
      "9:16": "Portrait fits an upright phone. Check the sides of a wide shot for details you want to keep.",
      "16:9": "Landscape leaves room to show two people side by side or the width of a screen.",
      "1:1": "Square gives the picture equal width and height. Check the edges when reframing.",
    },
  },
  resolution: {
    label: "Resolution",
    options: {
      "720p": "Choose fewer pixels for a smaller file. Small lettering can be harder to read.",
      "1080p": "Choose more pixels to preserve fine detail from a sharp source. Expect a larger file at comparable quality.",
    },
  },
  captions: {
    label: "Captions",
    options: {
      on: "Include your caption text so viewers can follow with the sound off.",
      off: "Leave added captions out of the picture. Text already in the recording stays visible.",
    },
  },
  placement: {
    label: "Caption placement",
    options: {
      top: "Put captions above the action. Check that they leave faces and headings visible.",
      center: "Put captions across the middle. Check for hands or details behind the words.",
      bottom: "Put captions below the action. Check for menus, subtitles or controls along the lower edge.",
    },
  },
} satisfies { [K in Setting]: { label: string; options: Record<ClipSettings[K], string> } };

const keys = Object.keys(controls) as Setting[];
const schema = "studio-clip-settings/1";
const maxReplyLength = 8192;
const sameSettings = (a: ClipSettings, b: ClipSettings) => keys.every((key) => a[key] === b[key]);

function hasShape(value: unknown, names: readonly string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === names.length && names.every((key) => Object.hasOwn(value, key));
}

function isSettings(value: unknown): value is ClipSettings {
  return hasShape(value, keys) && keys.every((key) =>
    typeof value[key] === "string" && Object.hasOwn(controls[key].options, value[key]));
}

interface Proposal {
  base: ClipSettings;
  settings: ClipSettings;
  reason: string;
  scope: string;
}

function readProposal(text: string, scope: string): Proposal {
  if (text.length > maxReplyLength) throw new Error("This reply is too long. Request a shorter settings reply.");
  const wrapped = /^\s*```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i.exec(text);
  let value: unknown;
  try {
    value = JSON.parse(wrapped?.[1] ?? text);
  } catch {
    throw new Error("Paste the JSON settings reply from T3.");
  }
  if (!hasShape(value, ["schema", "scope", "base", "settings", "reason"]) || value.schema !== schema ||
    !isSettings(value.base) || !isSettings(value.settings) ||
    typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 500) {
    throw new Error("This reply has an unsupported format or setting. Use “Suggest for me” to draft a new request.");
  }
  if (value.scope !== scope) throw new Error("This reply belongs to a different clip. Request settings for this clip.");
  return { scope, base: value.base, settings: value.settings, reason: value.reason.trim() };
}

function suggestionQuestion(scope: string, value: ClipSettings) {
  const choices = Object.fromEntries(keys.map((key) => [key, Object.keys(controls[key].options)]));
  return [
    "Suggest output settings for my Clipper edit plan. Use only information I have provided. If the intended viewing format is unclear, ask me about it first.",
    "Return one JSON settings proposal. Copy schema, scope and base exactly. Set settings to supported choices and replace reason with a plain-language tradeoff of at most 500 characters.",
    "Supported choices: " + JSON.stringify(choices),
    JSON.stringify({ schema, scope, base: value, settings: value, reason: "Your reason here" }),
  ].join("\n");
}

/** Native disclosure keeps explanations available with a keyboard and offline. */
export function AdvancedSettingHelp({ label, children, onAsk }: {
  label: string;
  children: ReactNode;
  onAsk?: (() => void) | undefined;
}) {
  const subject = label.toLowerCase();
  return (
    <details className="ops-setting-help">
      <summary>Explain {subject}</summary>
      {children}
      {onAsk && <button className="ops-link" type="button" onClick={onAsk}>Ask AI about {subject}</button>}
    </details>
  );
}

interface Props {
  value: ClipSettings;
  onChange: (next: ClipSettings) => void;
  onAsk?: ((question: string, scopeId?: string) => void) | undefined;
  onReadReply?: ((scopeId: string) => Promise<string | null>) | undefined;
  scopeId: string;
  assistantReply?: string | undefined;
}

export function ClipSettingsAssistant(props: Props) {
  return <ScopedClipSettings key={props.scopeId} {...props} />;
}

function ScopedClipSettings({ value, onChange, onAsk, onReadReply, scopeId, assistantReply }: Props) {
  const [reply, setReply] = useState("");
  const [proposal, setProposal] = useState<Proposal>();
  const [undo, setUndo] = useState<Proposal>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const pendingRead = useRef<AbortController | null>(null);
  const reviewHeading = useRef<HTMLElement>(null);
  useLayoutEffect(() => () => pendingRead.current?.abort(), []);
  const stale = proposal && (proposal.scope !== scopeId || !sameSettings(proposal.base, value));
  const changed = proposal ? keys.filter((key) => proposal.base[key] !== proposal.settings[key]) : [];

  function preview(text: string) {
    setProposal(undefined);
    setStatus("");
    try {
      setProposal(readProposal(text, scopeId));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this settings reply.");
    }
  }

  function cancelRead() {
    pendingRead.current?.abort();
    pendingRead.current = null;
    setLoading(false);
  }

  async function loadReply() {
    if (!onReadReply || pendingRead.current) return;
    const request = new AbortController();
    pendingRead.current = request;
    setLoading(true);
    setProposal(undefined);
    setError("");
    setStatus("Loading the settings reply…");
    try {
      const text = await onReadReply(scopeId);
      if (request.signal.aborted) return;
      if (text) preview(text);
      else setStatus("No completed settings reply yet. Return after T3 finishes answering your settings question.");
    } catch (cause) {
      if (request.signal.aborted) return;
      if (cause instanceof Error && cause.name === "AbortError") setStatus("Loading cancelled.");
      else {
        setStatus("");
        setError("Could not load settings from T3. Try again or paste the reply.");
      }
    } finally {
      if (!request.signal.aborted) {
        pendingRead.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <fieldset className="ops-clip-settings">
      <legend>Output settings</legend>
      <p>Choose the frame and captions for your marked clip.</p>
      <div className="ops-clip-settings-grid">
        {keys.map((key) => {
          const { label, options } = controls[key];
          return <div key={key}>
            <label className="ops-field">
              <span>{label}</span>
              <select value={value[key]} onChange={(event) => {
                const choice = event.currentTarget.value;
                if (!Object.hasOwn(options, choice)) return;
                setUndo(undefined);
                setStatus("");
                onChange({ ...value, [key]: choice });
              }}>
                {Object.keys(options).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <AdvancedSettingHelp label={label} onAsk={onAsk && (() => onAsk([
              "Explain " + label.toLowerCase() + " for my Clipper edit plan in plain language. Compare the supported choices and give one tradeoff. Only answer the question.",
              "Supported choices: " + Object.keys(options).join(", "),
              "Current settings: " + JSON.stringify(value),
            ].join("\n")))}>
              <dl>{Object.entries(options).map(([option, help]) =>
                <div key={option}><dt>{option}</dt><dd>{help}</dd></div>)}</dl>
            </AdvancedSettingHelp>
          </div>;
        })}
      </div>
      <div className="ops-clip-settings-ask">
        <button className="ops-button" type="button" disabled={!onAsk}
          onClick={() => onAsk?.(suggestionQuestion(scopeId, value), scopeId)}>Suggest for me</button>
        <p>{onAsk ? "AI questions open in T3 for you to review and send." : "AI suggestions require a connected T3 conversation."}</p>
      </div>
      <details className="ops-setting-help ops-settings-reply" onToggle={(event) => {
        if (!event.currentTarget.open && pendingRead.current) { cancelRead(); setStatus(""); }
      }}>
        <summary ref={reviewHeading}>Review a settings reply</summary>
        {onReadReply && <div className="ops-clip-settings-ask">
          <button className="ops-button" type="button" disabled={loading} onClick={() => void loadReply()}>Load AI settings</button>
          {loading && <button className="ops-link" type="button" onClick={() => { cancelRead(); setStatus("Loading cancelled."); }}>Cancel loading</button>}
        </div>}
        {assistantReply && <button className="ops-button" type="button"
          onClick={() => { cancelRead(); preview(assistantReply); }}>Preview latest T3 reply</button>}
        <label className="ops-field"><span>Settings reply</span>
          <textarea rows={3} value={reply} maxLength={maxReplyLength + 1}
            placeholder="Paste the JSON reply from T3." onChange={(event) => {
              cancelRead();
              setReply(event.currentTarget.value);
              setProposal(undefined);
              setError("");
              setStatus("");
            }} />
        </label>
        <button className="ops-button" type="button" disabled={!reply.trim()} onClick={() => { cancelRead(); preview(reply); }}>Preview pasted reply</button>
        {error && <p role="alert">{error}</p>}
        {proposal && <section className="ops-settings-preview" aria-label="Suggested changes">
          <h4>Suggested changes</h4>
          <p>{proposal.reason}</p>
          {changed.length > 0 ? <dl>{changed.map((key) => <div key={key}>
            <dt>{controls[key].label}</dt><dd>{proposal.base[key]} to {proposal.settings[key]}</dd>
          </div>)}</dl> : <p>These settings already match the proposal’s starting values.</p>}
          {stale && <p role="status">The clip or its settings changed. Request a new suggestion for the current settings.</p>}
          <div className="ops-clip-settings-ask">
            <button className="ops-button ops-primary" type="button" disabled={stale || !changed.length} onClick={() => {
              if (stale || !changed.length) return;
              onChange(proposal.settings);
              setUndo(proposal);
              setProposal(undefined);
              setStatus("Suggested settings applied.");
              reviewHeading.current?.focus();
            }}>Apply settings</button>
            <button className="ops-link" type="button" onClick={() => {
              setProposal(undefined);
              setStatus("Suggestion dismissed.");
              reviewHeading.current?.focus();
            }}>Dismiss</button>
          </div>
        </section>}
      </details>
      <div className="ops-clip-settings-ask">
        <span role="status">{status}</span>
        {undo?.scope === scopeId && sameSettings(value, undo.settings) && <button className="ops-link" type="button" onClick={() => {
          onChange(undo.base);
          setUndo(undefined);
          setStatus("Previous settings restored.");
          reviewHeading.current?.focus();
        }}>Undo settings</button>}
      </div>
    </fieldset>
  );
}
