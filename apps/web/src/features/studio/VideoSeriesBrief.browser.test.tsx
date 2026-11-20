import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { createDraft, listDrafts, saveDraft } from "./drafts";
import { projectBackupBlob } from "./projectBackup";
import StudioWorkspace from "./StudioWorkspace";
import { reviseSeriesBrief } from "./videoSeries";

it("starts an independent episode from saved Series choices and resumes its overrides", async () => {
  const workspaceId = randomUUID();
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { router: false });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const input = (name: string) => screen.getByRole("textbox", { name, exact: true });
  const step = screen.getByRole("combobox", { name: "Go to step" });
  await button(/^Video/).click();
  await input("Project name").fill("Making lanterns");
  await step.selectOptions("2");
  await input("What will you make?").fill("Private unreleased episode script");
  await screen.getByText("Series brief (optional)", { exact: true }).click();
  await input("Series audience").fill("New paper artists");
  await step.selectOptions("0");
  await step.selectOptions("2");
  await expect.element(input("Series audience")).toHaveValue("New paper artists");
  await input("Series format").fill("A 30-second making-of");
  await button("Save series brief").click();
  await input("Episode title").fill("Fold a panel");
  await expect.element(button("Start episode")).toBeEnabled();
  const start = button("Start episode").element() as HTMLButtonElement;
  start.click();
  start.click();
  await expect.element(input("Project name")).toHaveValue("Fold a panel");
  await expect.element(input("Who is it for?")).toHaveValue("New paper artists");
  await expect.element(input("Episode format")).toHaveValue("A 30-second making-of");
  await expect.element(input("What will you make?")).toHaveValue("");
  await input("Who is it for?").fill("Advanced paper artists");
  await input("Episode format").fill("A one-minute close-up");

  await button("Projects").click();
  await expect.element(button(/^Fold a panel/)).toBeVisible();
  const drafts = await listDrafts(workspaceId);
  expect(drafts).toHaveLength(2);
  expect(drafts.find((d) => d.title === "Making lanterns")?.seriesBrief?.audience).toBe("New paper artists");
  expect(drafts.find((d) => d.title === "Fold a panel")?.fields.brief).toBeUndefined();
  await button(/^Fold a panel/).click();
  await expect.element(input("Who is it for?")).toHaveValue("Advanced paper artists");
  await expect.element(input("Episode format")).toHaveValue("A one-minute close-up");
  await button("Use series choices").click();
  await expect.element(input("Who is it for?")).toHaveValue("New paper artists");
  await expect.element(input("Episode format")).toHaveValue("A 30-second making-of");
  await button("Projects").click();
  await button(/^Making lanterns/).click();
  await expect.element(input("Series audience")).toHaveValue("New paper artists");
  await input("Series audience").fill("Night market stallholders");
  await input("Episode title").fill("Light the stall");
  await expect.element(button("Start episode")).toBeDisabled();
  await button("Save new revision").click();
  await button("Start episode").click();
  await expect.element(input("Project name")).toHaveValue("Light the stall");
  await expect.element(input("Who is it for?")).toHaveValue("Night market stallholders");
  await button("Projects").click();
  await button(/^Fold a panel/).click();
  await expect.element(input("Who is it for?")).toHaveValue("New paper artists");
}, 30_000);

it("lets a restored project explicitly start its own series from the effective choices", async () => {
  const workspaceId = randomUUID();
  const original = createDraft(workspaceId, "video");
  const first = reviseSeriesBrief(undefined, "Gardeners", "Plant study", "kinetic-type");
  const latest = reviseSeriesBrief(first, "Gardeners", "Season diary", "product-demo");
  original.stage = "brief";
  original.fields = { notes: "Keep the lighting notes" };
  original.title = "Field diary";
  original.style = latest.style;
  original.seriesBrief = latest;
  original.seriesHistory = [first];
  original.seriesBriefOwner = true;
  await saveDraft(original, 0);
  const file = new File([projectBackupBlob(original)], "diary.json", { type: "application/json" });
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { router: false });
  const button = (name: string) => screen.getByRole("button", { name, exact: true });
  await expect.element(button("Import backup")).toBeEnabled();
  await userEvent.upload(screen.getByLabelText("Select a private backup"), file);
  await screen.getByRole("textbox", { name: "Episode format", exact: true }).fill("Weekly update");
  await button("Start independent series").click();
  await expect.element(screen.getByRole("textbox", { name: "Series format" })).toHaveValue("Weekly update");
  await button("Projects").click();
  await expect.element(screen.getByRole("heading", { name: "Your projects" })).toBeVisible();
  const rows = await listDrafts(workspaceId);
  const restored = rows.find(row => row.restoredCopy !== undefined);
  expect(restored?.fields).toEqual({ ...original.fields, seriesFormat: "Weekly update" });
  expect(restored?.seriesBriefOwner).toBeUndefined();
  expect(restored?.seriesHistory?.map((brief) => brief.revision)).toEqual([first.revision]);
  expect(restored?.seriesBrief?.revision).toBe(latest.revision);
  const fork = rows.find((row) => row.id !== original.id && row.id !== restored?.id);
  expect(fork?.seriesBriefOwner).toBe(true);
  expect(fork?.seriesBrief).toMatchObject({ revision: 1, style: latest.style, format: "Weekly update" });
  expect(fork?.seriesBrief?.seriesId).not.toBe(restored?.seriesBrief?.seriesId);
  expect(fork?.fields).toEqual({});
  expect(rows.find(row => row.id === original.id)?.seriesBrief).toEqual(latest);
});

it("downloads only the episode caption from the publication sheet", async () => {
  const workspaceId = randomUUID();
  const video = createDraft(workspaceId, "video");
  video.stage = "publish";
  video.title = "Private project name";
  video.fields = { caption: "A public lesson", notes: "Private production notes" };
  video.seriesBrief = reviseSeriesBrief(undefined, "Private audience", "Stories", video.style);
  await saveDraft(video, 0);
  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { router: false });
  await screen.getByRole("button", { name: /^Private project name/ }).click();
  let contents: Promise<string> | undefined;
  let name = "";
  function capture(event: MouseEvent) {
    if (!(event.target instanceof HTMLAnchorElement) || !event.target.download) return;
    event.preventDefault();
    name = event.target.download;
    contents = fetch(event.target.href).then((response) => response.text());
  }
  document.addEventListener("click", capture);
  try {
    await screen.getByRole("button", { name: "Download post caption" }).click();
    expect(await contents).toBe("A public lesson");
    expect(name).toBe("Post caption.txt");
  } finally {
    document.removeEventListener("click", capture);
  }
});
