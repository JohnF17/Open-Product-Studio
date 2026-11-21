import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { recording } from "./clipRecordingFixture";
import { createDraft, readDraft, saveDraft } from "./drafts";
import StudioWorkspace from "./StudioWorkspace";

const bridge = "http://127.0.0.1:4772";
const pairingToken = "r".repeat(43);
const productionPlan = JSON.stringify({
  schema: "studio-tutorial/1",
  title: "Inbox tour",
  scenes: [
    {
      id: "opening",
      source: "screen",
      start: 0,
      end: 1.2,
      narration: "Open the inbox and select the first message.",
      caption: "Inbox",
    },
  ],
  presentation: { aspect: "9:16", style: "social-reel", captions: "center" },
});

const rendererInfo = {
  schema: "studio-media-bridge/1",
  voice: "Heart",
  nativeVoiceAvailable: true,
  soundtrack: true,
  narrators: [
    { id: "kokoro:af_heart", label: "Heart", engine: "neural" },
    { id: "kokoro:am_adam", label: "Adam", engine: "neural" },
    { id: "system", label: "Windows voice", engine: "system" },
  ],
};

async function tutorial() {
  const draft = createDraft(randomUUID(), "video");
  await saveDraft({ ...draft, stage: "render", fields: { tutorialProduction: productionPlan } }, 0);
  return draft;
}

type BrowserUI = Awaited<ReturnType<typeof render>>;

async function pair(ui: BrowserUI) {
  await ui.getByLabelText("Renderer pairing code").fill(bridge + "/#" + pairingToken);
  await ui.getByRole("button", { name: "Connect local renderer" }).click();
  await expect
    .element(ui.getByRole("combobox", { name: "Narrator" }))
    .toHaveValue("kokoro:af_heart");
}

async function selectSourceAndApprove(ui: BrowserUI) {
  await userEvent.upload(
    ui.getByLabelText("Choose recording for screen"),
    recording("private.webm"),
  );
  await expect.element(ui.getByRole("button", { name: "Play preview" })).toBeEnabled();
  await ui.getByRole("checkbox", { name: "I reviewed this production plan" }).click();
}

function authenticated(init: RequestInit | undefined) {
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer " + pairingToken);
  expect(init?.credentials).toBe("omit");
  expect(init?.redirect).toBe("error");
  expect(init?.referrerPolicy).toBe("no-referrer");
}

function completedRender() {
  const form = new FormData();
  form.append("movie", new Blob(["movie"], { type: "video/mp4" }), "movie.mp4");
  form.append("captions", new Blob(["WEBVTT\n"], { type: "text/vtt" }), "captions.vtt");
  form.append("preview", new Blob(["poster"], { type: "image/jpeg" }), "preview.jpg");
  return new Response(form);
}

function auditionWav() {
  const pcm = new Uint8Array(1644);
  const view = new DataView(pcm.buffer);
  const ascii = (text: string, offset: number) => pcm.set(new TextEncoder().encode(text), offset);
  ascii("RIFF", 0);
  view.setUint32(4, pcm.length - 8, true);
  ascii("WAVEfmt ", 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii("data", 36);
  view.setUint32(40, pcm.length - 44, true);
  return pcm;
}

it("auditions the selected local narrator at 390px, recovers from a failure and clears the old audio", async () => {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(390, 844);
  await using _restoreViewport = {
    [Symbol.asyncDispose]: () => page.viewport(viewport.width, viewport.height),
  };
  const draft = await tutorial();
  const localFetch = window.fetch.bind(window);
  const auditioned: FormDataEntryValue[][] = [];
  const wav = auditionWav();
  const fetchMock = vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    if (input === bridge + "/info") {
      authenticated(init);
      return Response.json(rendererInfo);
    }
    if (input !== bridge + "/voice-preview") return localFetch(input, init);
    authenticated(init);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init?.body as FormData;
    expect(Array.from(form.keys())).toEqual(["narrator"]);
    auditioned.push(form.getAll("narrator"));
    return auditioned.length === 1
      ? new Response("Local voice unavailable", { status: 422 })
      : new Response(wav, { headers: { "Content-Type": "audio/wav" } });
  });

  try {
    await using ui = await render(
      <StudioWorkspace workspaceId={draft.workspaceId} routeProjectId={draft.id} />,
      { router: false },
    );
    await selectSourceAndApprove(ui);
    await pair(ui);
    const narrator = ui.getByRole("combobox", { name: "Narrator" });
    await narrator.selectOptions("kokoro:am_adam");
    const preview = ui.getByRole("button", { name: "Preview this voice" });
    await preview.click();
    await expect
      .element(
        ui.getByText("Could not preview this voice. Check the local renderer and try again."),
      )
      .toBeVisible();
    await expect.element(preview).toBeEnabled();
    await preview.click();
    await expect
      .element(
        ui.getByText("Could not preview this voice. Check the local renderer and try again."),
      )
      .not.toBeInTheDocument();
    await expect.poll(() => ui.container.querySelector("audio")?.duration).toBeCloseTo(0.1, 3);
    const audio = ui.container.querySelector("audio")!;
    const previewUrl = audio.src;
    expect(previewUrl).toMatch(/^blob:/);
    expect(new Uint8Array(await (await localFetch(previewUrl)).arrayBuffer())).toEqual(wav);
    expect(auditioned).toEqual([["kokoro:am_adam"], ["kokoro:am_adam"]]);
    const delivery = ui.getByRole("region", { name: "Tutorial render" }).element();
    expect(delivery.scrollWidth).toBeLessThanOrEqual(delivery.clientWidth);
    await narrator.selectOptions("system");
    await expect.element(preview).not.toBeInTheDocument();
    expect(ui.container.querySelector("audio")).toBeNull();
    await expect
      .poll(() =>
        localFetch(previewUrl).then(
          () => false,
          () => true,
        ),
      )
      .toBe(true);
    expect((await readDraft(draft.workspaceId, draft.id))?.fields.tutorialProduction).toBe(
      productionPlan,
    );
  } finally {
    fetchMock.mockRestore();
  }
});

it("sends session audio using private filenames, lets recorded narration override the narrator, and clears files on disconnect", async () => {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(1280, 900);
  await using _restoreViewport = {
    [Symbol.asyncDispose]: () => page.viewport(viewport.width, viewport.height),
  };
  const draft = await tutorial();
  const localFetch = window.fetch.bind(window);
  const submitted: FormData[] = [];
  let cancelling: AbortSignal | null | undefined;
  const fetchMock = vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    if (input === bridge + "/info") {
      authenticated(init);
      return Response.json(rendererInfo);
    }
    if (input !== bridge + "/render") return localFetch(input, init);
    authenticated(init);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    submitted.push(init?.body as FormData);
    if (submitted.length === 2) {
      cancelling = init?.signal;
      return new Promise<Response>((_, reject) => {
        cancelling?.addEventListener("abort", () => reject(cancelling?.reason), { once: true });
      });
    }
    return completedRender();
  });

  try {
    await using ui = await render(
      <StudioWorkspace workspaceId={draft.workspaceId} routeProjectId={draft.id} />,
      { router: false },
    );
    await selectSourceAndApprove(ui);
    await pair(ui);
    const narrator = ui.getByRole("combobox", { name: "Narrator" });
    const renderButton = ui.getByRole("button", { name: "Render narrated MP4" });
    await narrator.selectOptions("kokoro:am_adam");
    const music = ui.getByLabelText("Music or sound effects (optional WAV)");
    const narration = ui.getByLabelText("Recorded narration (optional WAV)");
    const soundtrackWav = new File(["music bytes"], "private-music.wav", { type: "audio/wav" });
    const voiceoverWav = new File(["voiceover bytes"], "private-voiceover.wav", {
      type: "audio/wav",
    });
    await userEvent.upload(music, soundtrackWav);
    const level = ui.getByRole("combobox", { name: /Soundtrack level/ });
    await level.selectOptions("present");
    await renderButton.click();
    const output = ui.getByRole("link", { name: "Download tutorial MP4" });
    await expect.element(output).toBeVisible();
    const completed = output.element().getAttribute("href");
    const generated = submitted[0]!;
    expect(JSON.parse(generated.get("plan") as string)).toEqual(JSON.parse(productionPlan));
    expect((generated.get("source-screen") as File).name).toBe("screen.media");
    expect(generated.get("narrator")).toBe("kokoro:am_adam");
    expect(generated.has("narration-wav")).toBe(false);
    const soundtrack = generated.get("soundtrack-wav") as File;
    expect(soundtrack.name).toBe("soundtrack.wav");
    expect(await soundtrack.text()).toBe(await soundtrackWav.text());
    expect(generated.get("soundtrack-level")).toBe("present");

    await userEvent.upload(narration, voiceoverWav);
    await expect.element(narrator).toBeDisabled();
    await renderButton.click();
    await expect.poll(() => !!cancelling).toBe(true);
    const recorded = submitted[1]!;
    expect(recorded.has("narrator")).toBe(false);
    const voiceover = recorded.get("narration-wav") as File;
    expect(voiceover.name).toBe("narration.wav");
    expect(await voiceover.text()).toBe(await voiceoverWav.text());
    await ui.getByRole("button", { name: "Cancel render" }).click();
    await expect.poll(() => cancelling?.aborted).toBe(true);
    await expect.element(ui.getByText("Render cancelled.", { exact: true })).toBeVisible();
    await expect.element(output).toHaveAttribute("href", completed!);

    const selectedWavs = () =>
      [music.element(), narration.element()].map(
        (input) => (input as HTMLInputElement).files?.length,
      );
    await ui.getByRole("button", { name: "Remove recorded narration" }).click();
    await expect.element(narrator).toBeEnabled();
    await ui.getByRole("button", { name: "Remove soundtrack" }).click();
    await expect.element(level).not.toBeInTheDocument();
    expect(selectedWavs()).toEqual([0, 0]);

    await userEvent.upload(music, soundtrackWav);
    await userEvent.upload(narration, voiceoverWav);
    expect(selectedWavs()).toEqual([1, 1]);
    await ui.getByRole("button", { name: "Disconnect" }).click();
    await expect.element(ui.getByLabelText("Renderer pairing code")).toHaveValue("");
    await pair(ui);
    expect(selectedWavs()).toEqual([0, 0]);
    await renderButton.click();
    await expect.poll(() => submitted.length).toBe(3);
    expect(submitted[2]!.get("narrator")).toBe("kokoro:af_heart");
    expect(submitted[2]!.has("soundtrack-wav")).toBe(false);
    expect(submitted[2]!.has("soundtrack-level")).toBe(false);
    expect(submitted[2]!.has("narration-wav")).toBe(false);
    const saved = await readDraft(draft.workspaceId, draft.id);
    expect(saved?.fields).toEqual({ tutorialProduction: productionPlan });
  } finally {
    fetchMock.mockRestore();
  }
});
