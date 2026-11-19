import { expect, it } from "vite-plus/test";
import { randomUUID } from "../../lib/randomUUID";
import { createDraft, DraftConflict, listDrafts, saveDraft } from "./drafts";

it("commits one of two concurrent edits and reopens the winning draft in its own workspace", async () => {
  const scope = randomUUID();
  const original = createDraft(scope, "video");
  expect(await saveDraft(original, 0)).toBe(1);
  const competing = await Promise.allSettled(
    ["First cut", "Second cut"].map((title) =>
      saveDraft({ ...original, title, stage: "storyboard", fields: { script: title } }, 1),
    ),
  );
  expect(competing.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
  const failed = competing.find((entry) => entry.status === "rejected");
  expect(failed?.reason).toBeInstanceOf(DraftConflict);
  const reopened = await listDrafts(scope);
  expect(reopened).toHaveLength(1);
  expect(reopened[0]).toMatchObject({ id: original.id, revision: 2, stage: "storyboard" });
  expect(reopened[0]!.fields.script).toEqual(reopened[0]!.title);
  expect(await listDrafts(randomUUID())).toEqual([]);
});
