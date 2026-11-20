import * as Schema from "effect/Schema";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import type { Category } from "./drafts";
import { tutorialDirectorSources } from "./tutorialDirectorSources";
export { tutorialDirectorSources } from "./tutorialDirectorSources";

const selectionSchema = Schema.NullOr(
  Schema.Struct({ port: Schema.Number, name: Schema.String, digest: Schema.String }),
);
export type InstalledModel = NonNullable<typeof selectionSchema.Type>;
export function useOllamaChoice(workspace: string, category: Category) {
  return useLocalStorage(
    "ops.studio.local-model/1/" + JSON.stringify([workspace, category]),
    null,
    selectionSchema,
  );
}

function endpoint(port: number) {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Choose a valid local port.");
  return "http://127.0.0.1:" + port;
}

async function jsonRequest(port: number, path: string, signal: AbortSignal, body?: unknown) {
  const response = await fetch(endpoint(port) + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "error",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal,
  });
  if (!response.ok || !response.body) throw Error("Local model unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) return JSON.parse(text + decoder.decode()) as unknown;
      text += decoder.decode(part.value, { stream: true });
      if (text.length > 512_000) {
        await reader.cancel();
        throw Error("Local model response too large.");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
async function modelInventory(port: number, signal: AbortSignal) {
  const result = await jsonRequest(port, "/api/tags", signal);
  if (!record(result) || !Array.isArray(result.models)) throw Error("Invalid model inventory.");
  return result.models.filter(record);
}

function installedModels(port: number, inventory: Record<string, unknown>[]): InstalledModel[] {
  return inventory.flatMap((item) =>
    typeof item.name === "string" &&
    /^[\w./-]+:[\w.-]+$/.test(item.name) &&
    item.name.length <= 180 &&
    !item.name.startsWith("/") &&
    !item.name.includes("..") &&
    !/[:-]cloud(?:$|-)/i.test(item.name) &&
    !item.remote_model &&
    !item.remote_host &&
    typeof item.digest === "string" &&
    /^[a-f0-9]{64}$/.test(item.digest) &&
    record(item.details) &&
    typeof item.details.quantization_level === "string" &&
    item.details.quantization_level.length > 0
      ? [{ port, name: item.name, digest: item.digest }]
      : [],
  );
}

export async function listOllamaModels(
  port: number,
  signal: AbortSignal,
): Promise<InstalledModel[]> {
  return installedModels(port, await modelInventory(port, signal));
}

// These upstream releases implement local source suffixes, immutable manifest lookup and loaded-runner digests.
function hasQualifiedDigestRouting(version: string) {
  const patch = /^0\.40\.(0|[1-9]\d*)$/.exec(version);
  return !!patch && Number(patch[1]) <= 16;
}

function manifestDigest(value: unknown) {
  if (typeof value !== "string") return undefined;
  return /^(?:sha256[:-])?([0-9a-f]{64})$/i.exec(value)?.[1]?.toLowerCase();
}

function digestName(value: unknown, digest: string) {
  if (typeof value !== "string") return false;
  const shortName = value
    .replace(/^(?:registry\.ollama\.ai|ollama\.com)\/library\//, "")
    .replace(/:(?:local|latest)$/, "");
  return manifestDigest(shortName) === digest;
}

function verifyAliases(inventory: Record<string, unknown>[], model: InstalledModel) {
  if (
    inventory.some(
      (row) =>
        (digestName(row.name, model.digest) || digestName(row.model, model.digest)) &&
        (manifestDigest(row.digest) !== model.digest || row.remote_host || row.remote_model),
    )
  )
    throw Error("A model alias conflicts with the selected manifest.");
}

function routingIdentity(value: unknown, model: InstalledModel, modern: boolean) {
  return value === model.name || (modern && digestName(value, model.digest));
}

async function verifyLoaded(model: InstalledModel, modern: boolean, signal: AbortSignal) {
  const value = await jsonRequest(model.port, "/api/ps", signal);
  const rows = record(value) && Array.isArray(value.models) ? value.models.filter(record) : [];
  const linked = rows.filter(
    (row) => routingIdentity(row.name, model, modern) || routingIdentity(row.model, model, modern),
  );
  if (
    !linked.length ||
    linked.some(
      (row) =>
        manifestDigest(row.digest) !== model.digest ||
        row.remote_host ||
        row.remote_model ||
        (row.name !== undefined && !routingIdentity(row.name, model, modern)) ||
        (row.model !== undefined && !routingIdentity(row.model, model, modern)),
    )
  )
    throw Error("The loaded model could not be verified.");
}

const string = { type: "string" };
function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}
const replySchema = object({
  summary: string,
  nextStep: string,
  changes: { type: "array", items: object({ key: string, value: string }) },
});

function fieldReplySchema(keys: readonly string[]) {
  return object({
    summary: { type: "string", minLength: 5, maxLength: 1000 },
    nextStep: { type: "string", minLength: 5, maxLength: 1000 },
    fields: {
      type: "object",
      properties: Object.fromEntries(keys.map((key) => [key, string])),
      required: keys,
      additionalProperties: false,
    },
  });
}

function fieldProposal(raw: string, keys: readonly string[]) {
  const reply: unknown = JSON.parse(raw);
  if (
    !record(reply) ||
    !record(reply.fields) ||
    typeof reply.summary !== "string" ||
    typeof reply.nextStep !== "string"
  )
    throw Error("Invalid local suggestion.");
  const changes = Object.entries(reply.fields).flatMap(([key, value]) => {
    if (!keys.includes(key) || typeof value !== "string") throw Error("Unknown suggestion field.");
    return value.trim() ? [{ key, value }] : [];
  });
  return JSON.stringify({ summary: reply.summary, nextStep: reply.nextStep, changes });
}

const framing = {
  wide: [0.5, 0.5, 1],
  center: [0.5, 0.5, 1.5],
  left: [0.3, 0.5, 1.75],
  right: [0.7, 0.5, 1.75],
  top: [0.5, 0.3, 1.75],
  bottom: [0.5, 0.7, 1.75],
} as const;
type Ranges = ReturnType<typeof tutorialDirectorSources>;
type ProposalCopy = { summary: string; nextStep: string };
export function assembleDirectorProposal(raw: string, ranges: Ranges, copy: ProposalCopy) {
  const result: unknown = JSON.parse(raw);
  if (
    !record(result) ||
    typeof result.title !== "string" ||
    !Array.isArray(result.shots) ||
    !result.shots.length ||
    result.shots.length > 8
  )
    throw Error("Invalid director proposal.");
  const scenes = result.shots.map((s: unknown, i: number) => {
    if (
      !record(s) ||
      typeof s.range !== "string" ||
      !/^take-[1-9]\d*$/.test(s.range) ||
      typeof s.caption !== "string" ||
      typeof s.narration !== "string" ||
      typeof s.framing !== "string" ||
      !Object.hasOwn(framing, s.framing)
    )
      throw Error("Invalid shot.");
    const r = ranges[Number(s.range.slice(5)) - 1];
    if (!r) throw Error("Unknown source.");
    const [x, y, zoom] = framing[s.framing as keyof typeof framing];
    const hold = Math.min(
      60,
      Math.max(
        0,
        Math.ceil(s.narration.trim().split(/\s+/).length / 2.4 + 0.5 - (r.end - r.start)),
      ),
    );
    return {
      id: "shot-" + (i + 1),
      source: r.id,
      start: r.start,
      end: r.end,
      caption: s.caption,
      narration: s.narration,
      focus: { x, y, zoom },
      hold,
    };
  });
  const plan = { schema: "studio-tutorial/1", title: result.title, scenes };
  return JSON.stringify({
    ...copy,
    changes: [{ key: "tutorialProductionProposal", value: JSON.stringify(plan) }],
  });
}

export async function draftWithOllama(
  model: InstalledModel,
  prompt: string,
  owner: AbortSignal,
  ranges: Ranges = [],
  copy?: ProposalCopy,
  writableKeys?: readonly string[],
) {
  const signal = AbortSignal.any([owner, AbortSignal.timeout(150_000)]);
  const check = async () => {
    const inventory = await modelInventory(model.port, signal);
    if (
      !installedModels(model.port, inventory).some(
        (m) => m.name === model.name && m.digest === model.digest,
      )
    )
      throw Error("The selected local model changed.");
    return inventory;
  };
  const initialInventory = await check();
  const host = await jsonRequest(model.port, "/api/version", signal);
  if (!record(host) || typeof host.version !== "string")
    throw Error("Cannot verify the local model runtime.");
  // 0.9.3 runs chat locally and accepts only installed names. Verify the actual loaded runner afterward.
  // Hosts with cloud routing must resolve the local manifest digest before receiving the reviewed text.
  const legacyLocalOnly = host.version === "0.9.3";
  if (!legacyLocalOnly && !hasQualifiedDigestRouting(host.version))
    throw Error("This Ollama version has no qualified local model route.");
  const reference = legacyLocalOnly ? model.name : "sha256:" + model.digest + ":local";
  if (!legacyLocalOnly) {
    verifyAliases(initialInventory, model);
    const info = await jsonRequest(model.port, "/api/show", signal, { model: reference });
    if (
      !record(info) ||
      info.remote_model ||
      info.remote_host ||
      !record(info.details) ||
      !info.details.quantization_level
    )
      throw Error("Cannot qualify local-only inference for this model.");
    const warmup = await jsonRequest(model.port, "/api/chat", signal, {
      model: reference,
      messages: [],
      stream: false,
      keep_alive: "2m",
    });
    if (
      !record(warmup) ||
      warmup.done !== true ||
      warmup.done_reason !== "load" ||
      !routingIdentity(warmup.model, model, true) ||
      warmup.remote_host ||
      warmup.remote_model
    )
      throw Error("Cannot qualify the local model preload.");
    await verifyLoaded(model, true, signal);
    verifyAliases(await check(), model);
  }
  const planSchema = object({
    title: string,
    shots: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: object({
        range: { type: "string", enum: ranges.map((_, i) => "take-" + (i + 1)) },
        caption: string,
        narration: string,
        framing: { type: "string", enum: Object.keys(framing) },
      }),
    },
  });
  const data = await jsonRequest(model.port, "/api/chat", signal, {
    model: reference,
    stream: false,
    messages: [{ role: "user", content: prompt }],
    format: ranges.length
      ? planSchema
      : writableKeys
        ? fieldReplySchema(writableKeys)
        : replySchema,
    options: { temperature: 0.2, num_predict: 1800 },
    keep_alive: "2m",
  });
  if (
    !record(data) ||
    !routingIdentity(data.model, model, !legacyLocalOnly) ||
    data.remote_model ||
    data.remote_host ||
    data.done !== true ||
    data.done_reason === "length" ||
    !record(data.message) ||
    data.message.role !== "assistant" ||
    typeof data.message.content !== "string" ||
    data.message.content.length > 12_000
  )
    throw Error("Incomplete or mismatched local response.");
  const finalInventory = await check();
  if (!legacyLocalOnly) verifyAliases(finalInventory, model);
  await verifyLoaded(model, !legacyLocalOnly, signal);
  if (ranges.length && !copy) throw Error("Missing director context.");
  if (ranges.length && copy) return assembleDirectorProposal(data.message.content, ranges, copy);
  return writableKeys ? fieldProposal(data.message.content, writableKeys) : data.message.content;
}
