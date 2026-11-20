import { afterEach, expect, it, vi } from "vite-plus/test";
import { assembleDirectorProposal, listOllamaModels, draftWithOllama } from "./builderOllama";
import {
  parseBuilderAssistantResponse,
  prepareBuilderAssistantRequest,
} from "./builderAssistantRecipes";
import { createDraft } from "./drafts";
import { tutorialDirectorSources } from "./tutorialDirectorSources";
const digest = "e".repeat(64);
const model = { name: "example:1b", digest, port: 11434 };
const local = { ...model, details: { quantization_level: "Q4" } };
afterEach(() => vi.unstubAllGlobals());
it("lists installed local weights and excludes remote models", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      models: [local, { ...local, name: "big:cloud" }, { ...local, remote_host: "upstream" }],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(await listOllamaModels(model.port, new AbortController().signal)).toEqual([model]);
  expect(fetcher.mock.calls[0]?.[0]).toBe("http://127.0.0.1:11434/api/tags");
});
it("holds the selected digest across the turn and rejects a changed tag", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ models: [local] }))
    .mockResolvedValueOnce(Response.json({ version: "0.9.3" }))
    .mockResolvedValueOnce(
      Response.json({
        done: true,
        model: model.name,
        message: { role: "assistant", content: "{}" },
      }),
    )
    .mockResolvedValueOnce(Response.json({ models: [{ ...local, digest: "f".repeat(64) }] }));
  vi.stubGlobal("fetch", fetcher);
  await expect(draftWithOllama(model, "explain", new AbortController().signal)).rejects.toThrow(
    "changed",
  );
  const args = JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body));
  expect(args.model).toBe(model.name);
  expect(args.tools).toBeUndefined();
});

function installedHost(...responses: unknown[]) {
  const request = vi.fn<typeof fetch>();
  for (const response of responses) request.mockResolvedValueOnce(Response.json(response));
  vi.stubGlobal("fetch", request);
  return request;
}

const inventory = { models: [local] };
const reference = "sha256:" + digest + ":local";
const display = "sha256-" + digest + ":latest";
const version = { version: "0.40.2" };
const description = { details: local.details };
const warmup = { model: reference, done: true, done_reason: "load" };
const running = { models: [{ name: display, digest: "sha256:" + digest }] };
const reply = (identity: string) => ({
  model: identity,
  done: true,
  message: { role: "assistant", content: "reviewed response" },
});

it("qualifies and dispatches the immutable local reference on a newer host", async () => {
  const request = installedHost(
    inventory,
    version,
    description,
    warmup,
    running,
    inventory,
    reply(display),
    inventory,
    running,
  );
  await expect(
    draftWithOllama(model, "private prompt", new AbortController().signal),
  ).resolves.toBe("reviewed response");
  const calls = request.mock.calls;
  expect(calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
    "/api/tags",
    "/api/version",
    "/api/show",
    "/api/chat",
    "/api/ps",
    "/api/tags",
    "/api/chat",
    "/api/tags",
    "/api/ps",
  ]);
  expect(JSON.parse(String(calls[2]?.[1]?.body))).toEqual({ model: reference });
  expect(JSON.parse(String(calls[3]?.[1]?.body))).toEqual({
    model: reference,
    messages: [],
    stream: false,
    keep_alive: "2m",
  });
  expect(JSON.parse(String(calls[6]?.[1]?.body))).toMatchObject({
    model: reference,
    messages: [{ role: "user", content: "private prompt" }],
  });
});

it("stops before submitting a prompt if the selected manifest points to a remote model", async () => {
  const request = installedHost(
    inventory,
    { version: "0.40.2" },
    { details: local.details, remote_host: "remote" },
  );
  await expect(
    draftWithOllama(model, "private prompt", new AbortController().signal),
  ).rejects.toThrow("local-only");
  expect(request.mock.calls.map(([url]) => new URL(String(url)).pathname)).not.toContain(
    "/api/chat",
  );
});

it("rejects a reply identified as remote even when the model name matches", async () => {
  installedHost(inventory, version, description, warmup, running, inventory, {
    ...reply(reference),
    remote_model: "other",
  });
  await expect(
    draftWithOllama(model, "reviewed text", new AbortController().signal),
  ).rejects.toThrow("mismatched");
});

it.each(["0.39.9", "0.40.17", "0.40.16-custom"])(
  "refuses unqualified host %s before preload or prompt delivery",
  async (version) => {
    const request = installedHost(inventory, { version });
    await expect(
      draftWithOllama(model, "private prompt", new AbortController().signal),
    ).rejects.toThrow("qualified");
    expect(request.mock.calls).toHaveLength(2);
  },
);

it("rejects a literal alias that conflicts with the selected digest", async () => {
  const request = installedHost(
    { models: [local, { ...local, name: reference, digest: "a".repeat(64) }] },
    version,
  );
  await expect(
    draftWithOllama(model, "private prompt", new AbortController().signal),
  ).rejects.toThrow("alias");
  expect(request.mock.calls).toHaveLength(2);
});

it("requires the preload to identify the same runner even when another correct runner is already loaded", async () => {
  const request = installedHost(inventory, version, description, warmup, {
    models: [
      { name: model.name, digest },
      { name: display, digest: "a".repeat(64) },
    ],
  });
  await expect(
    draftWithOllama(model, "private prompt", new AbortController().signal),
  ).rejects.toThrow("loaded model");
  expect(
    request.mock.calls.every(([, init]) => !String(init?.body).includes("private prompt")),
  ).toBe(true);
});

it("suppresses a reply when the linked runner no longer has its checked digest", async () => {
  installedHost(
    inventory,
    version,
    description,
    warmup,
    running,
    inventory,
    reply(display),
    inventory,
    { models: [] },
  );
  await expect(
    draftWithOllama(model, "private prompt", new AbortController().signal),
  ).rejects.toThrow("loaded model");
});

it("verifies the actual loaded digest on the named legacy host", async () => {
  const request = installedHost(inventory, { version: "0.9.3" }, reply(model.name), inventory, {
    models: [{ name: model.name, digest: "a".repeat(64) }],
  });
  await expect(
    draftWithOllama(model, "reviewed text", new AbortController().signal),
  ).rejects.toThrow("loaded model");
  expect(new URL(String(request.mock.calls.at(-1)?.[0])).pathname).toBe("/api/ps");
});

it("offers bounded cuts from a long reviewed recording and binds the chosen take to the same interval", () => {
  const context = "SOURCE demo 60 660\nThe save dialog appears near the end.";
  const cuts = tutorialDirectorSources(context);
  expect(cuts).toEqual([
    { id: "demo", start: 60, end: 72 },
    { id: "demo", start: 354, end: 366 },
    { id: "demo", start: 648, end: 660 },
  ]);
  const draft = { ...createDraft("local-fixture", "video"), stage: "render" };
  const request = prepareBuilderAssistantRequest(draft, context, "suggest", "ollama")!;
  expect(request.prompt).toContain("take-3: demo 648–660s");
  const proposed = assembleDirectorProposal(
    JSON.stringify({
      title: "Save a project",
      shots: [{ range: "take-3", caption: "Save", narration: "Choose Save.", framing: "right" }],
    }),
    cuts,
    { summary: "Choose a take", nextStep: "Review the timing." },
  );
  const accepted = parseBuilderAssistantResponse(draft, request, proposed);
  const scene = JSON.parse(accepted!.changes[0]!.value).scenes[0];
  expect(scene).toMatchObject({ source: "demo", start: 648, end: 660 });
});

it("retains a three-minute source interval and caps the list at 24 options", () => {
  expect(tutorialDirectorSources("SOURCE short 0.5 180.5")).toEqual([
    { id: "short", start: 0.5, end: 180.5 },
  ]);
  const ranges = Array.from({ length: 10 }, (_, n) => "SOURCE clip" + n + " 10 900").join("\n");
  expect(tutorialDirectorSources(ranges)).toHaveLength(24);
});

it("offers only the Replica brief's editable fields and rejects a reply with an unlisted key", async () => {
  const draft = { ...createDraft("local-fixture", "replica"), stage: "brief" };
  const review = prepareBuilderAssistantRequest(
    draft,
    "The reader can select a book.",
    "suggest",
    "ollama",
  )!;
  const request = async (fields: Record<string, string>) => {
    const mock = installedHost(
      inventory,
      { version: "0.9.3" },
      {
        ...reply(model.name),
        message: {
          role: "assistant",
          content: JSON.stringify({
            summary: "Book selection",
            nextStep: "Review the brief.",
            fields,
          }),
        },
      },
      inventory,
      { models: [{ name: model.name, digest }] },
    );
    const response = await draftWithOllama(
      model,
      review.prompt,
      new AbortController().signal,
      [],
      undefined,
      review.writableKeys,
    );
    const body = JSON.parse(String(mock.mock.calls[2]?.[1]?.body));
    expect(body.format.properties.fields).toEqual({
      type: "object",
      properties: { brief: { type: "string" }, acceptanceScenario: { type: "string" } },
      required: ["brief", "acceptanceScenario"],
      additionalProperties: false,
    });
    return parseBuilderAssistantResponse(draft, review, response)?.changes.map(
      (change) => change.key,
    );
  };
  await expect(
    request({ brief: "Readers can select a book from the list.", acceptanceScenario: "" }),
  ).resolves.toEqual(["brief"]);
  await expect(request({ privateReferenceLocation: "invented" })).rejects.toThrow(
    "Unknown suggestion field",
  );
});
