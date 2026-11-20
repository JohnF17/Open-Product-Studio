import { useSyncExternalStore } from "react";
import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { createDraft, DraftEditor, listDrafts, saveDraft } from "./drafts";
import { EpisodeBriefUpdate } from "./EpisodeBriefUpdate";
import { createSeriesEpisode, reviseSeriesBrief } from "./videoSeries";

function Episode({ editor }: { editor: DraftEditor }) {
  const { draft } = useSyncExternalStore(editor.subscribe, editor.snapshot);
  return <EpisodeBriefUpdate draft={draft} editor={editor} />;
}

it("previews the effective choices and advances only the selected episode after confirmation", async () => {
  const workspace = randomUUID();
  const first = reviseSeriesBrief(undefined, "New potters", "Short lesson", "kinetic-type");
  const latest = reviseSeriesBrief(first, "Teachers", "Hands-on course", "product-demo");
  const owner = { ...createDraft(workspace, "video"), seriesBriefOwner: true as const, seriesBrief: latest };
  const sibling = createSeriesEpisode(workspace, first, "Glaze");
  const selected = { ...createSeriesEpisode(workspace, first, "Clay"), fields: { audience: "Students" } };
  for (const project of [owner, sibling, selected]) await saveDraft(project, 0);
  const editor = new DraftEditor({ ...selected, revision: 1 });
  await using screen = await render(<Episode editor={editor} />, { router: false });
  const check = screen.getByRole("button", { name: "Check for a newer brief" });
  await check.click();
  await expect.element(screen.getByText("Students", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Hands-on course", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Keep current revision" }).click();
  expect(editor.snapshot().draft.revision).toBe(1);
  await check.click();
  await screen.getByRole("button", { name: "Apply revision 2" }).click();
  await editor.flush();
  const reopened = await listDrafts(workspace);
  expect(reopened.find((row) => row.id === sibling.id)).toMatchObject({ revision: 1, seriesBrief: first });
  expect(reopened.find((row) => row.id === selected.id)).toMatchObject({
    revision: 2, seriesBrief: latest, seriesHistory: [first], fields: { audience: "Students" },
  });
  await check.click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("This episode already uses the latest brief.");
});

it("reports the unsaved update if an episode write fails", async () => {
  const workspace = randomUUID();
  const first = reviseSeriesBrief(undefined, "Potters", "Story", "kinetic-type");
  const latest = reviseSeriesBrief(first, "Teachers", "Lesson", "product-demo");
  await saveDraft({ ...createDraft(workspace, "video"), seriesBriefOwner: true, seriesBrief: latest }, 0);
  const editor = new DraftEditor({ ...createSeriesEpisode(workspace, first, "Clay"), revision: 1 }, async () => {
    throw new Error("Storage unavailable");
  });
  await using screen = await render(<Episode editor={editor} />, { router: false });
  await screen.getByRole("button", { name: "Check for a newer brief" }).click();
  await screen.getByRole("button", { name: "Apply revision 2" }).click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("The updated episode could not be saved. Check the project save status.");
  expect(editor.snapshot().status).toBe("error");
});
