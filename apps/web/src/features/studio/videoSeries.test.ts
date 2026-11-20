import { expect, it } from "vite-plus/test";
import { createDraft, isStudioDraft } from "./drafts";
import { createSeriesEpisode, reviseSeriesBrief } from "./videoSeries";

it("pins episodes to their starting settings and forks a fresh series when no owner is supplied", () => {
  const first = reviseSeriesBrief(undefined, " New gardeners ", " Walkthrough ", "product-demo");
  const second = reviseSeriesBrief(first, "New gardeners", "Interview", "kinetic-type");
  const fork = reviseSeriesBrief(undefined, second.audience, second.format, second.style);
  expect(reviseSeriesBrief(first, "New gardeners", " Walkthrough", "product-demo")).toBe(first);
  expect(second).toMatchObject({ seriesId: first.seriesId, revision: 2 });
  expect(fork).toMatchObject({ revision: 1 });
  expect(fork.seriesId).not.toBe(second.seriesId);

  const episode = createSeriesEpisode("workspace", first, " Winter greens ");
  expect(episode).toMatchObject({
    category: "video", stage: "brief", title: "Winter greens", style: "product-demo",
    fields: {}, tools: [], seriesBrief: first, revision: 0,
  });
  expect(episode.seriesBrief).not.toBe(first);
  expect(episode.seriesBrief).toMatchObject({ revision: 1, format: "Walkthrough" });
  expect(episode).not.toHaveProperty("seriesBriefOwner");
  expect(episode.id).not.toBe(createSeriesEpisode("workspace", first, "Winter greens").id);
  expect(isStudioDraft(episode, "workspace")).toBe(true);
});

it("accepts only same-series, increasing episode history earlier than the pinned revision", () => {
  const first = reviseSeriesBrief(undefined, "Gardeners", "Interview", "kinetic-type");
  const third = { ...first, revision: 3 };
  const project = createSeriesEpisode("workspace", third, "");
  const valid = (patch: object) => isStudioDraft({ ...project, ...patch }, "workspace");
  expect(valid({ seriesHistory: [first] })).toBe(true);
  for (const seriesHistory of [
    null, [null], [{ ...first, seriesId: project.id }], [third], [first, first],
    [{ ...first, revision: 2 }, first], [{ ...first, format: "  " }], [{ ...first, revision: 0.5 }],
  ]) {
    expect(valid({ seriesHistory })).toBe(false);
  }
  expect(valid({ seriesBriefOwner: false })).toBe(false);
  expect(valid({ seriesBriefOwner: true, seriesHistory: [first] })).toBe(true);
  expect(valid({ seriesHistory: [first], seriesBrief: undefined })).toBe(false);
  expect(valid({ seriesBrief: { ...first, account: "account" } })).toBe(false);
  expect(isStudioDraft({ ...createDraft("workspace", "clipper"), seriesBrief: first }, "workspace")).toBe(false);
  expect(() => reviseSeriesBrief(undefined, "   ", "Interview", first.style)).toThrow(/audience/i);
  expect(() => reviseSeriesBrief({ ...first, revision: Number.MAX_SAFE_INTEGER }, "Other", "Other", first.style)).toThrow(/revision/i);
});
