import { describe, expect, it } from "vite-plus/test";

import {
  applyBuilderAssistantPreview,
  BUILDER_ASSISTANT_MAX_CONTEXT_CHARS,
  createLocalBuilderSuggestion,
  getBuilderAssistantRecipe,
  parseBuilderAssistantResponse,
  prepareBuilderAssistantRequest,
  revertBuilderAssistantPreview,
  suggestedBuilderContext,
} from "./builderAssistantRecipes";
import { createDraft, draftStages, type Category, type StudioDraft } from "./drafts";

function at(category: Category, stage: string, patch?: Partial<StudioDraft>): StudioDraft {
  return { ...createDraft("test-workspace", category), stage, ...patch };
}

function reply(changes: readonly unknown[] = []) {
  return JSON.stringify({
    summary: "A proposal for the current stage.",
    nextStep: "Check the draft.",
    changes,
  });
}

describe("local builder starters", () => {
  it.each([
    "blank",
    "digital-product",
    "video",
    "clipper",
    "replica",
    "day-trader",
    "affiliate-storefront",
  ] as const)("offers stage-specific assistance throughout %s", (category) => {
    const drafts = draftStages(category).map((stage) => at(category, stage));
    const recipes = drafts.map(getBuilderAssistantRecipe);
    const previews = drafts.map((draft) => createLocalBuilderSuggestion(draft));
    expect(recipes.every((recipe) => recipe?.actionLabel && recipe.explanation)).toBe(true);
    expect(new Set(previews.map((preview) => preview?.nextStep)).size).toBe(drafts.length);
    expect(
      previews.every(
        (preview) => preview?.source === "local" && preview.summary && preview.nextStep,
      ),
    ).toBe(true);
  });

  it("turns an existing Blank idea into a working note without changing the draft", () => {
    const draft = at("blank", "notes", { fields: { notes: "Build a garden checklist" } });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes).toEqual([
      expect.objectContaining({
        key: "notes",
        previousValue: "Build a garden checklist",
        value: expect.stringContaining("Build a garden checklist"),
      }),
    ]);
    expect(draft.fields.notes).toBe("Build a garden checklist");
    expect(applyBuilderAssistantPreview(draft, preview)?.fields?.notes).toContain("Next");
  });

  it("uses the digital product format and audience to shape an outline", () => {
    const draft = at("digital-product", "outline", {
      fields: { format: "Workbook", audience: "new gardeners", brief: "Start seedlings indoors" },
    });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes[0]?.value).toContain("new gardeners");
    expect(preview.changes[0]?.value.toLowerCase()).toContain("exercise");
    expect(preview.changes[0]?.value).toContain("Start seedlings indoors");
  });

  it("uses the saved brief and Video style to propose work in the storyboard fields", () => {
    const draft = at("video", "storyboard", {
      style: "stick-figure-explainer",
      fields: { brief: "Pack a balanced bag" },
    });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "script",
          value: expect.stringContaining("Pack a balanced bag"),
        }),
        expect.objectContaining({ key: "shots", value: expect.stringContaining("figure") }),
      ]),
    );
    expect(applyBuilderAssistantPreview(draft, preview)).not.toHaveProperty("videoCues");
  });

  it("helps with a Clipper edit plan while keeping source evidence and marks untouched", () => {
    const fields = { clipGoal: "Focus on the hands", markIn: "00:10", markOut: "00:30" };
    const draft = at("clipper", "edit", { fields });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "cropNotes",
          value: expect.stringContaining("Focus on the hands"),
        }),
      ]),
    );
    expect(applyBuilderAssistantPreview(draft, preview)?.fields).toMatchObject(fields);
    const source = createLocalBuilderSuggestion({ ...draft, stage: "source" })!;
    expect(source.changes).toEqual([]);
    expect(source.nextStep).toMatch(/recording/i);
  });

  it("uses Replica observations as design input without claiming that a test already passed", () => {
    const observation = "Participants checked the level before opening workshops.";
    const draft = at("replica", "brief", { fields: { observation } });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "brief", value: expect.stringContaining(observation) }),
        expect.objectContaining({
          key: "acceptanceScenario",
          value: expect.stringMatching(/given.*when.*then/is),
        }),
      ]),
    );
    expect(preview.changes.some(({ key }) => key === "observation")).toBe(false);
  });

  it("keeps Day Trader replay and journaling as offline written practice", () => {
    const draft = at("day-trader", "replay", {
      fields: { practiceRules: "Stop before revealing a new bar." },
    });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes).toEqual([
      expect.objectContaining({
        key: "replayCheckpoint",
        value: expect.stringContaining("Stop before revealing a new bar."),
      }),
    ]);
    expect(prepareBuilderAssistantRequest(draft, "Describe the exercise")).toBeNull();
    expect(
      prepareBuilderAssistantRequest(draft, "Describe the exercise", "suggest", "device")?.prompt,
    ).toContain("offline");
  });

  it("applies Affiliate copy to the nested public draft and invalidates its review", () => {
    const draft = at("affiliate-storefront", "design");
    const affiliate = { ...draft.affiliate!, title: "Houseplant tools", reviewed: true };
    const before = { ...draft, affiliate };
    const preview = createLocalBuilderSuggestion(before)!;
    expect(preview.changes).toEqual([
      expect.objectContaining({ key: "affiliate.intro", value: expect.any(String) }),
    ]);
    const patch = applyBuilderAssistantPreview(before, preview)!;
    expect(patch.affiliate).toMatchObject({
      title: "Houseplant tools",
      reviewed: false,
      candidates: [],
    });
    expect(patch.fields).toBeUndefined();
    const current = {
      ...before,
      ...patch,
      affiliate: { ...patch.affiliate!, title: "Edited title" },
    };
    expect(revertBuilderAssistantPreview(current, preview)?.affiliate).toMatchObject({
      title: "Edited title",
      intro: "",
      reviewed: false,
    });
    expect(createLocalBuilderSuggestion({ ...before, stage: "compare" })?.changes).toEqual([]);
  });

  it("preserves existing local copy when another empty field can be filled", () => {
    const draft = at("video", "storyboard", { fields: { script: "My script" } });
    const preview = createLocalBuilderSuggestion(draft)!;
    expect(preview.changes.some(({ key }) => key === "script")).toBe(false);
    expect(preview.changes.some(({ key }) => key === "shots")).toBe(true);
  });
});

describe("reviewed AI assistance", () => {
  const reviewed = "A reviewed line about a beginner activity.";

  it("includes only the reviewed user text in the request and keeps the scope private", () => {
    const draft = at("replica", "brief", {
      title: "unshared title",
      fields: {
        referenceNote: "unshared location",
        observation: "unshared observation",
        referenceRights: "unshared rights",
      },
      archivedFields: { archived: "unshared archive" },
    });
    const request = prepareBuilderAssistantRequest(draft, reviewed)!;
    expect(request.reviewedContext).toBe(reviewed);
    expect(request.prompt).toContain(reviewed);
    expect(request.prompt).not.toContain("unshared");
    expect(request.prompt).not.toContain(draft.id);
    expect(request.prompt).not.toContain(draft.workspaceId);
    expect(request.prompt).toContain("acceptanceScenario");
    expect(request.prompt).not.toContain("referenceRights");
  });

  it("bounds reviewed context and requires a written question for explain", () => {
    const draft = at("blank", "notes");
    expect(prepareBuilderAssistantRequest(draft, "     ", "explain")).toBeNull();
    expect(
      prepareBuilderAssistantRequest(draft, "Why choose one outcome?", "explain")?.prompt,
    ).toContain("Why choose one outcome?");
    expect(prepareBuilderAssistantRequest(draft, "x".repeat(10_000))).toBeNull();
    expect(
      prepareBuilderAssistantRequest(draft, "x".repeat(BUILDER_ASSISTANT_MAX_CONTEXT_CHARS)),
    ).not.toBeNull();
    expect(prepareBuilderAssistantRequest(draft, "", "suggest")).toMatchObject({
      reviewedContext: "",
    });
  });

  it("offers an explicit, bounded excerpt of writing while omitting locations and credentials", () => {
    const draft = at("digital-product", "draft", {
      title: "Private project title",
      fields: {
        brief:
          "A guide to indoor seedlings\nhttps://example.com/private\nTOKEN = hello\nC:\\Users\\Name\\notes",
        audience: "New gardeners",
        outline: "Prepare trays\nnotes/private.txt\nPaste examples from /home/user/private",
        draft: "A".repeat(3000) + "\nA sample introduction. ".repeat(500),
        notes: "Private notes",
      },
    });
    const context = suggestedBuilderContext(draft);
    expect(context).toContain("A guide to indoor seedlings");
    expect(context).toContain("New gardeners");
    expect(context).toContain("Prepare trays");
    expect(context).toContain("A sample introduction.");
    expect(context).not.toMatch(/private|token|hello|Users/i);
    expect(context.length).toBeLessThanOrEqual(BUILDER_ASSISTANT_MAX_CONTEXT_CHARS);
    expect(prepareBuilderAssistantRequest(draft)?.prompt).not.toContain("Prepare trays");
    expect(suggestedBuilderContext(at("blank", "notes"))).toBe("");
  });

  it("keeps an episode's series-owned audience out of editable changes", () => {
    const draft = at("video", "brief", {
      seriesBrief: {
        seriesId: "series",
        style: "kinetic-type",
        format: "Walkthrough",
        audience: "Group A",
        revision: 1,
      },
    });
    const local = createLocalBuilderSuggestion(draft)!;
    expect(local.changes.some(({ key }) => key === "audience")).toBe(false);
    const request = prepareBuilderAssistantRequest(draft, reviewed)!;
    expect(
      parseBuilderAssistantResponse(draft, request, reply([{ key: "audience", value: "Group B" }])),
    ).toBeNull();
    expect(request.prompt).not.toContain("Group A");
  });

  it("validates and applies only the current sheet's explicit field changes", () => {
    const draft = at("digital-product", "draft", {
      fields: { brief: "Keep this", digitalProductApproval: "stale" },
    });
    const request = prepareBuilderAssistantRequest(draft, reviewed)!;
    const preview = parseBuilderAssistantResponse(
      draft,
      request,
      reply([{ key: "draft", value: "A new manuscript" }]),
    )!;
    expect(preview).toMatchObject({
      source: "ai",
      changes: [
        { key: "draft", label: "Manuscript", previousValue: "", value: "A new manuscript" },
      ],
    });
    const patch = applyBuilderAssistantPreview({ ...draft, revision: 1 }, preview);
    expect(patch?.fields).toEqual({ brief: "Keep this", draft: "A new manuscript" });
    const current = { ...draft, ...patch, fields: { ...patch!.fields, outline: "Unrelated edit" } };
    expect(revertBuilderAssistantPreview(current, preview)?.fields).toEqual({
      brief: "Keep this",
      outline: "Unrelated edit",
    });
    expect(
      revertBuilderAssistantPreview(
        { ...current, fields: { ...current.fields, draft: "Edited manuscript" } },
        preview,
      ),
    ).toBeNull();
  });

  it("rejects a stale reply or apply after editing project context or changing stage", () => {
    const draft = at("clipper", "edit", { fields: { clipGoal: "Keep the full demonstration" } });
    const request = prepareBuilderAssistantRequest(draft, reviewed)!;
    const response = reply([{ key: "cropNotes", value: "Leave room for the caption." }]);
    const preview = parseBuilderAssistantResponse(draft, request, response)!;
    const edited = { ...draft, fields: { ...draft.fields, clipGoal: "Focus on the result" } };
    expect(parseBuilderAssistantResponse(edited, request, response)).toBeNull();
    expect(applyBuilderAssistantPreview(edited, preview)).toBeNull();
    expect(applyBuilderAssistantPreview({ ...draft, stage: "review" }, preview)).toBeNull();
    expect(applyBuilderAssistantPreview({ ...draft, workspaceId: "another" }, preview)).toBeNull();
  });

  it.each([
    () => reply([{ key: "markIn", value: "00:01" }]),
    () => reply([{ key: "clipSourceEvidence", value: "fake" }]),
    () => reply([{ key: "__proto__", value: "injected" }]),
    () => reply([{ key: "cropNotes", value: " " }]),
    () => reply([{ key: "cropNotes", value: "hidden\u0000text" }]),
    () => reply([{ key: "cropNotes", value: { nested: true } }]),
    () => reply([{ key: "cropNotes", value: "x".repeat(5000) }]),
    () =>
      reply([
        { key: "cropNotes", value: "first" },
        { key: "cropNotes", value: "second" },
      ]),
    () => reply([{ key: "cropNotes", value: "first", approval: true }]),
    () => JSON.stringify({ summary: "ready", nextStep: "continue", changes: [], executed: true }),
    () => "Here is the result: " + reply(),
    () => '{"summary":"Draft","nextStep":"Check the draft.","changes":[],"chan\u0067es":[]}',
    () =>
      '{"summary":"Draft","nextStep":"Check the draft.","changes":[{"key":"approval","key":"cropNotes","value":"Trim"}]}',
    () => reply() + reply(),
    () => JSON.stringify({ summary: "", nextStep: "continue", changes: [] }),
  ])("rejects an invalid or overreaching receipt %#", (invalid) => {
    const draft = at("clipper", "edit");
    const request = prepareBuilderAssistantRequest(draft, reviewed)!;
    expect(parseBuilderAssistantResponse(draft, request, invalid())).toBeNull();
  });

  it("keeps explanations and sensitive specialized sheets read-only", () => {
    const clip = at("clipper", "edit");
    const explanation = prepareBuilderAssistantRequest(clip, "How do I check framing?", "explain")!;
    expect(parseBuilderAssistantResponse(clip, explanation, reply())?.changes).toEqual([]);
    expect(
      parseBuilderAssistantResponse(
        clip,
        explanation,
        reply([{ key: "cropNotes", value: "Overwrite" }]),
      ),
    ).toBeNull();

    const trader = at("day-trader", "rules");
    const local = prepareBuilderAssistantRequest(trader, "", "suggest", "device")!;
    expect(parseBuilderAssistantResponse(trader, local, reply())?.changes).toEqual([]);
    expect(
      parseBuilderAssistantResponse(
        trader,
        local,
        reply([{ key: "practiceRules", value: "Make a trade" }]),
      ),
    ).toBeNull();

    const affiliate = at("affiliate-storefront", "design");
    const request = prepareBuilderAssistantRequest(affiliate, reviewed)!;
    expect(
      parseBuilderAssistantResponse(
        affiliate,
        request,
        reply([{ key: "affiliate.title", value: "An example title" }]),
      )?.changes,
    ).toHaveLength(1);
    expect(
      parseBuilderAssistantResponse(
        affiliate,
        request,
        reply([{ key: "affiliate.reviewed", value: "true" }]),
      ),
    ).toBeNull();
  });

  it("rejects a preview with added or modified field entries", () => {
    const draft = at("blank", "notes");
    const preview = createLocalBuilderSuggestion(draft)!;
    const injected = { ...preview, changes: [{ ...preview.changes[0]!, key: "sourceRights" }] };
    expect(applyBuilderAssistantPreview(draft, injected)).toBeNull();
    expect(revertBuilderAssistantPreview(draft, injected)).toBeNull();
  });
});
