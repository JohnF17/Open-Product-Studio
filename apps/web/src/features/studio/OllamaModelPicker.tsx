import { useState } from "react";
import { T, useGT } from "gt-react";
import type { Category } from "./drafts";
import { listOllamaModels, useOllamaChoice, type InstalledModel } from "./builderOllama";

export function OllamaModelPicker({
  workspace,
  category,
}: {
  workspace: string;
  category: Category;
}) {
  const gt = useGT();
  const [current, choose] = useOllamaChoice(workspace, category);
  const desktopOrigin = /^open-product-studio(?:-dev)?:$/.test(window.location.protocol)
    ? window.location.protocol + "//" + window.location.host
    : null;
  const [port, setPort] = useState(String(current?.port ?? (desktopOrigin ? 11435 : 11434)));
  const [models, setModels] = useState<InstalledModel[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setMessage("");
    setModels([]);
    try {
      const found = await listOllamaModels(Number(port), AbortSignal.timeout(6500));
      setModels(found);
      if (!found.length) setMessage(gt("No installed local models were found."));
    } catch {
      setMessage(
        gt("Could not reach Ollama. Start it on this computer and allow this Studio origin."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label={gt("Local model connection")} className="space-y-2 text-sm">
      <label>
        <T>Ollama port</T>{" "}
        <input
          type="number"
          min="1"
          max="65535"
          value={port}
          disabled={busy}
          onChange={(e) => {
            choose(null);
            setPort(e.currentTarget.value);
            setModels([]);
            setMessage("");
          }}
        />
      </label>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        <T>Find installed models</T>
      </button>
      {models.length > 0 && (
        <label>
          <T>Installed model</T>{" "}
          <select
            value={
              models.some(
                (m) =>
                  m.digest === current?.digest &&
                  m.port === current.port &&
                  m.name === current.name,
              )
                ? current?.digest + " " + current?.name
                : ""
            }
            onChange={(e) => {
              const model = models.find((m) => m.digest + " " + m.name === e.currentTarget.value);
              choose(model ?? null);
            }}
          >
            <option value="">{gt("Choose a model")}</option>
            {models.map((m) => (
              <option key={m.name} value={m.digest + " " + m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {current && (
        <p>
          {current.name} · {current.digest.slice(0, 12)} · 127.0.0.1:{current.port}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <details>
        <summary>
          <T>Local model setup</T>
        </summary>
        {desktopOrigin ? (
          <p>
            <T>
              For Ollama 0.9.3, start your model host normally. From the Studio checkout, run this
              desktop relay and enter its port above.
            </T>{" "}
            <code>
              {"node tools/studio-media/ollama-relay.mjs --port 11435 --ollama-port 11434 --origin " +
                desktopOrigin}
            </code>
          </p>
        ) : (
          <p>
            <T>
              Install a model with Ollama. Set OLLAMA_ORIGINS to this Studio origin when starting
              Ollama, then find and choose the installed model.
            </T>{" "}
            <code>{window.location.origin}</code>
          </p>
        )}
      </details>
    </section>
  );
}
