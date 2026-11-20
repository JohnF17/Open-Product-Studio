import { describe, expect, it } from "vite-plus/test";
import { createDraft } from "./drafts";
import { pinBriefUpdate } from "./pinEpisodeBrief";

const first = { seriesId: "e45e9015-d2a5-4fa7-9d55-775e38ae413a", revision: 1, audience: "New potters", format: "Short lesson", style: "kinetic-type" as const };
const second = { ...first, revision: 2, audience: "Teachers", style: "product-demo" as const };

describe("explicit Series updates", () => {
  it("pins the reviewed revision and keeps the previous snapshot and episode choices", () => {
    const episode = { ...createDraft("local", "video"), seriesBrief: first, fields: { audience: "Children" } };
    const result = pinBriefUpdate(episode, second);
    expect(result?.seriesBrief).toEqual(second);
    expect(result?.seriesHistory).toEqual([first]);
    expect(result?.style).toBe(second.style);
    expect(episode.seriesBrief).toEqual(first);
    expect(result).not.toHaveProperty("fields");
    expect(pinBriefUpdate({ ...episode, ...result }, second)).toBeNull();
  });

  it("keeps explicitly selected style and tools even when the old pin had the same style", () => {
    const episode = { ...createDraft("local", "video"), seriesBrief: first, fields: { seriesStyleOverride: first.style }, tools: ["renderer-remotion"] };
    const result = pinBriefUpdate(episode, second);
    expect(result?.style).toBe(first.style);
    expect(result?.tools).toEqual(episode.tools);
    expect(pinBriefUpdate(episode, { ...second, seriesId: "foreign" })).toBeNull();
    expect(pinBriefUpdate({ ...episode, seriesBriefOwner: true }, second)).toBeNull();
  });
});
