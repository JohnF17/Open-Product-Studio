import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { createAffiliateCandidate } from "./affiliateDraft";
import { digitalProductManuscript, digitalProductPublicTitle } from "./digitalProductExport";
import { createDraft, insertDraft, listDrafts, saveDraft, type Category } from "./drafts";
import { draftExport } from "./guide";
import { importProjectBackup, projectBackupBlob, PROJECT_BACKUP_MAX_BYTES } from "./projectBackup";
import StudioWorkspace from "./StudioWorkspace";

function jsonFile(data: unknown) {
  return new File([JSON.stringify(data)], "backup.json", { type: "application/json" });
}

const cue = {
  id: "cue-1",
  timestamp: "still drafting",
  action: "Raise the flag",
  narration: "",
  caption: "Check the wind",
  sound: "",
};

const cases = [
  ["blank", "notes", { notes: "Private notes" }],
  [
    "digital-product",
    "export",
    { format: "Workbook", draft: "# Exercise", [digitalProductPublicTitle]: "Exercises" },
  ],
  ["video", "storyboard", { shots: "Wide shot\nClose-up", motionDirection: "Slow pan" }],
  [
    "clipper",
    "edit",
    { cropNotes: "Keep hands in frame", captionLook: "label", captionLine: "Cut here" },
  ],
  ["replica", "design", { referenceNote: "Private source", interfaceSketch: "Original design" }],
  ["day-trader", "journal", { journalNotes: "Synthetic exercise" }],
  ["affiliate-storefront", "export", {}],
] as const satisfies readonly (readonly [Category, string, Record<string, string>])[];

it.each(cases)(
  "restores %s from a private backup and a compatible working export",
  async (category, stage, fields) => {
    const source = createDraft(randomUUID(), category);
    const destination = randomUUID();
    source.stage = stage;
    source.title = "Edited title";
    source.fields = { ...fields };
    if (category === "digital-product") {
      source.fields.digitalProductApproval = digitalProductManuscript(source)!.approval;
    }
    if (category === "video") {
      source.style = "stick-figure-explainer";
      source.videoCues = [cue];
    }
    if (source.affiliate) {
      source.affiliate.reviewed = true;
      source.affiliate.target = "custom-stack";
      source.affiliate.stack = "astro";
      source.affiliate.candidates = [
        {
          ...createAffiliateCandidate("candidate-1"),
          evidenceNotes: "Private evidence",
          pinned: true,
          listing: { name: "Item", description: "Public copy", href: "https://example.com/item" },
        },
      ];
    }
    await saveDraft(source, 0);

    const current = JSON.parse(await projectBackupBlob(source).text());
    expect(current).not.toHaveProperty("id");
    expect(current).not.toHaveProperty("workspaceId");
    expect(current).not.toHaveProperty("revision");
    const restored = await importProjectBackup(
      jsonFile({
        ...current,
        id: source.id,
        workspaceId: source.workspaceId,
        revision: 999,
        grants: ["publish"],
      }),
      destination,
    );
    const legacy = await importProjectBackup(jsonFile(draftExport(source, "draft")), destination);
    for (const draft of [restored, legacy]) {
      expect(draft).toMatchObject({
        category,
        stage,
        title: source.title,
        workspaceId: destination,
        revision: 1,
      });
      expect(draft.fields).toEqual(fields);
      expect(draft.id).not.toBe(source.id);
      expect(draft).not.toHaveProperty("grants");
      expect(draft.videoCues).toEqual(source.videoCues);
      if (category === "digital-product")
        expect(digitalProductManuscript(draft)?.approved).toBe(false);
      if (source.affiliate) {
        expect(draft.affiliate).toEqual({ ...source.affiliate, reviewed: false });
      }
    }
    expect(restored.id).not.toBe(legacy.id);
    expect((await listDrafts(destination)).map(({ id }) => id)).toEqual(
      expect.arrayContaining([restored.id, legacy.id]),
    );
    expect(await listDrafts(source.workspaceId)).toEqual([{ ...source, revision: 1 }]);
  },
);

it("distinguishes historical full Replica drafts from incomplete public handoffs", async () => {
  const scope = randomUUID();
  const replica = createDraft(randomUUID(), "replica");
  replica.fields = {
    referenceNote: "Private source",
    observation: "May be shared explicitly",
    brief: "Design",
  };
  await expect(
    importProjectBackup(jsonFile(draftExport(replica, "brief-with-observation")), scope),
  ).rejects.toThrow(/handoff/i);
  await expect(
    importProjectBackup(jsonFile({ schema: "studio-affiliate-handoff/1", page: {} }), scope),
  ).rejects.toThrow(/handoff/i);
  await expect(
    importProjectBackup(new File(["<!doctype html>"], "page.html"), scope),
  ).rejects.toThrow(/handoff/i);
  const oldReplica = { ...draftExport(replica, "draft"), kind: "design-brief" };
  expect((await importProjectBackup(jsonFile(oldReplica), scope)).fields).toEqual(replica.fields);
});

it("restores an early Video export and limits its tools to planning choices", async () => {
  const draft = await importProjectBackup(
    jsonFile({
      schema: "studio-working-draft/1",
      category: "video",
      title: "Early video",
      stage: "prepare",
      fields: { notes: "Wide shot", connection: "created" },
      style: { id: "kinetic-type", version: 1 },
      plannedTools: ["scene-editor", "publish", "scene-editor"],
    }),
    randomUUID(),
  );
  expect(draft).toMatchObject({
    style: "kinetic-type",
    tools: ["scene-editor"],
    fields: { notes: "Wide shot" },
  });
  expect(draft.fields).not.toHaveProperty("connection");
  expect(draft.archivedFields).toBeUndefined();
  expect(draft).not.toHaveProperty("videoCues");
});

it("keeps extra authored strings inert across private and legacy backup round trips", async () => {
  const source = createDraft(randomUUID(), "video");
  source.fields = {
    notes: "  Original notes\r\n",
    earlySceneNotes: "  Keep the previous transitions\r\n",
    pronunciationHints: "",
    apiKey: "discard-token",
    providerRefreshToken: "discard-credential",
    publishApproval: "discard-approval",
    permissionGrant: "discard-grant",
    constructor: "discard-reserved-key",
  };
  const expected = {
    earlySceneNotes: source.fields.earlySceneNotes,
    pronunciationHints: "",
  };
  const backup = JSON.parse(await projectBackupBlob(source).text());
  expect(backup.fields).toEqual({ notes: source.fields.notes });
  expect(backup.archivedFields).toEqual(expected);
  expect(JSON.stringify(backup)).not.toContain("discard-");
  for (const input of [draftExport(source, "draft"), backup]) {
    const scope = randomUUID();
    const restored = await importProjectBackup(jsonFile(input), scope);
    const [persisted] = await listDrafts(scope);
    expect(persisted).toEqual(restored);
    expect(restored.fields).toEqual({ notes: source.fields.notes });
    expect(restored.archivedFields).toEqual(expected);
    expect(JSON.parse(await projectBackupBlob(persisted!).text()).archivedFields).toEqual(expected);
  }
});

it("rejects unsupported Video style versions and restores older private backups", async () => {
  const source = createDraft(randomUUID(), "video");
  const current = JSON.parse(await projectBackupBlob(source).text());
  const { styleVersion, ...unversioned } = current;
  const legacy = draftExport(source, "draft");
  const scope = randomUUID();
  expect(styleVersion).toBe(1);
  for (const version of [0, 2, Number.MAX_SAFE_INTEGER]) {
    await expect(
      importProjectBackup(jsonFile({ ...legacy, style: { id: source.style, version } }), scope),
    ).rejects.toThrow(/video style version/i);
    await expect(
      importProjectBackup(jsonFile({ ...current, styleVersion: version }), scope),
    ).rejects.toThrow(/video style version/i);
  }
  expect(await listDrafts(scope)).toEqual([]);
  expect((await importProjectBackup(jsonFile(unversioned), scope)).style).toBe(source.style);
});

it("shows the missing private Replica data before saving an ambiguous partial copy", async () => {
  const scope = randomUUID();
  const oldFullDraft = createDraft(randomUUID(), "replica");
  oldFullDraft.fields = { brief: "Sketch the flow", observation: "A public observation" };
  const oldFullExport = { ...draftExport(oldFullDraft, "draft"), kind: "design-brief" };
  expect(oldFullExport).toEqual(draftExport(oldFullDraft, "brief-with-observation"));

  const file = jsonFile(oldFullExport);
  await expect(importProjectBackup(file, scope)).rejects.toThrow(/partial copy/i);
  await using screen = await render(<StudioWorkspace workspaceId={scope} />, { router: false });
  const input = screen.getByLabelText("Select a private backup");
  const importButton = screen.getByRole("button", { name: "Import backup" });
  await expect.element(importButton).toBeEnabled();
  await userEvent.upload(input, file);
  const warning = screen.getByRole("alert");
  await expect.element(warning).toHaveTextContent(/source locations.*rights.*open questions/i);
  expect(await listDrafts(scope)).toEqual([]);

  await screen.getByRole("button", { name: "Cancel restore" }).click();
  await expect.element(warning).not.toBeInTheDocument();
  expect(await listDrafts(scope)).toEqual([]);

  await userEvent.upload(input, file);
  await screen.getByRole("button", { name: "Restore partial copy" }).click();
  await expect.element(screen.getByRole("textbox", { name: /Observed behavior/i })).toHaveValue(
    "A public observation",
  );
  expect((await listDrafts(scope)).map(({ fields }) => fields)).toEqual([oldFullDraft.fields]);
});

it("recovers a large Video backup with all cues after the user confirms the file size", async () => {
  const scope = randomUUID();
  const source = createDraft(randomUUID(), "video");
  const cues = Array.from({ length: 1_001 }, (_, index) => ({
    ...cue,
    id: `cue-${index + 1}`,
    narration: ("???\r\n").repeat(1_100) + index,
  }));
  source.videoCues = cues;
  await saveDraft(source, 0);
  const [persisted] = await listDrafts(source.workspaceId);
  const blob = projectBackupBlob(persisted!);
  expect(blob.size).toBeGreaterThan(8 * 1024 * 1024);
  const file = new File([blob], "large.json", { type: "application/json" });
  const read = vi.spyOn(file, "text");
  await expect(importProjectBackup(file, scope)).rejects.toThrow(/large backup/i);
  expect(read).not.toHaveBeenCalled();
  expect(await listDrafts(scope)).toEqual([]);

  await using screen = await render(<StudioWorkspace workspaceId={scope} />, { router: false });
  await expect.element(screen.getByRole("button", { name: "Import backup" })).toBeEnabled();
  await userEvent.upload(screen.getByLabelText("Select a private backup"), file);
  await expect.element(screen.getByRole("alert")).toHaveTextContent(/memory/i);
  expect(await listDrafts(scope)).toEqual([]);
  await screen.getByRole("button", { name: "Restore large backup" }).click();
  await expect.element(screen.getByRole("button", { name: "Projects" })).toBeVisible();
  const [restored] = await listDrafts(scope);
  expect(restored?.videoCues).toHaveLength(cues.length);
  expect(await projectBackupBlob(restored!).text()).toBe(await blob.text());
});

it("backs up and restores every entry of a long Affiliate candidate list", async () => {
  const source = createDraft(randomUUID(), "affiliate-storefront");
  source.affiliate!.candidates = Array.from({ length: 1_001 }, (_, index) => ({
    ...createAffiliateCandidate(`candidate-${index + 1}`),
    evidenceNotes: `Evidence for row ${index + 1}`,
  }));
  const blob = projectBackupBlob(source);
  const restored = await importProjectBackup(new File([blob], "store.json"), randomUUID());
  expect(restored.affiliate?.candidates).toEqual(source.affiliate!.candidates);
  expect(await projectBackupBlob(restored).text()).toBe(await blob.text());
});

it("gives simultaneous restores distinct visible copy numbers in their own workspace", async () => {
  const scope = randomUUID();
  const original = { ...createDraft(scope, "blank"), title: "Pocket notes" };
  await saveDraft(original, 0);
  const file = new File([projectBackupBlob(original)], "notes.json");
  const copies = await Promise.all([importProjectBackup(file, scope), importProjectBackup(file, scope)]);
  expect(copies.map((copy) => copy.restoredCopy).sort()).toEqual([1, 2]);
  expect((await importProjectBackup(file, randomUUID())).restoredCopy).toBe(1);
  await using screen = await render(<StudioWorkspace workspaceId={scope} />, { router: false });
  await expect.element(screen.getByRole("button", { name: /Pocket notes.*Restored copy 1/i })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /Pocket notes.*Restored copy 2/i })).toBeVisible();
});

it("never replaces a saved project when the new key collides", async () => {
  const scope = randomUUID();
  const original = { ...createDraft(scope, "blank"), title: "Existing project" };
  const persisted = await insertDraft(original);
  await expect(insertDraft({ ...original, title: "Incoming copy" })).rejects.toBeDefined();
  expect(await listDrafts(scope)).toEqual([persisted]);
});

it("copies only known data and clears injected review state in a private backup", async () => {
  const scope = randomUUID();
  const source = createDraft(randomUUID(), "affiliate-storefront");
  const current = JSON.parse(await projectBackupBlob(source).text());
  const incoming = {
    ...current,
    fields: JSON.parse('{"__proto__":{"polluted":true},"approved":"yes","shareObservation":"yes"}'),
    affiliate: {
      ...current.affiliate,
      reviewed: true,
      credential: "ignored",
      candidates: [
        {
          ...createAffiliateCandidate("c1"),
          grant: "ignored",
          listing: { name: "Item", description: "Copy", href: "", html: "ignored" },
        },
      ],
    },
  };
  const restored = await importProjectBackup(jsonFile(incoming), scope);
  expect(restored.fields).toEqual({});
  expect(restored.affiliate?.reviewed).toBe(false);
  expect(restored.affiliate).not.toHaveProperty("credential");
  expect(restored.affiliate?.candidates).toEqual([
    {
      ...createAffiliateCandidate("c1"),
      listing: { name: "Item", description: "Copy", href: "" },
    },
  ]);
});

it("rejects invalid JSON, unsupported schemas, invalid content and oversize files without writing", async () => {
  const scope = randomUUID();
  const empty = createDraft(scope, "video");
  const current = JSON.parse(await projectBackupBlob(empty).text());
  await expect(importProjectBackup(new File(["{"], "broken.json"), scope)).rejects.toThrow(/json/i);
  await expect(
    importProjectBackup(jsonFile({ ...current, schema: "studio-project-backup/2" }), scope),
  ).rejects.toThrow(/version/i);
  for (const patch of [
    { category: "__proto__" },
    { stage: "send" },
    { style: "unknown" },
    { fields: { notes: 42 } },
    { videoCues: [cue, cue] },
    { tools: "publish" },
  ]) {
    await expect(importProjectBackup(jsonFile({ ...current, ...patch }), scope)).rejects.toThrow(
      /invalid/i,
    );
  }
  const oversized = new File([new Uint8Array(PROJECT_BACKUP_MAX_BYTES + 1)], "large.json");
  const read = vi.spyOn(oversized, "text");
  await expect(importProjectBackup(oversized, scope)).rejects.toThrow(/too large/i);
  expect(read).not.toHaveBeenCalled();
  expect(await listDrafts(scope)).toEqual([]);
});

it("downloads from an open project and imports from Projects as a separate saved draft", async () => {
  const scope = randomUUID();
  await using screen = await render(<StudioWorkspace workspaceId={scope} />, { router: false });
  const button = (name: string | RegExp) => screen.getByRole("button", { name });
  await button(/^Blank/).click();
  await screen.getByRole("textbox", { name: "Project name" }).fill("Copy me");
  await screen.getByRole("textbox", { name: "Project notes" }).fill("Private contents");

  const createUrl = vi.spyOn(URL, "createObjectURL");
  function preventDownload(event: Event) {
    if (event.target instanceof HTMLAnchorElement && event.target.download) event.preventDefault();
  }
  document.addEventListener("click", preventDownload);
  try {
    await button("Download private backup").click();
    const blob = createUrl.mock.calls.at(-1)?.[0];
    expect(blob).toBeInstanceOf(Blob);
    await button("Projects").click();
    await expect.element(button("Import backup")).toBeEnabled();
    const input = screen.getByLabelText("Select a private backup");
    await userEvent.upload(input, new File(["{"], "bad.json", { type: "application/json" }));
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(
        "Choose a Studio backup in JSON format. The selected file could not be parsed.",
      );
    const backup = new File([blob as Blob], "copy.json", { type: "application/json" });
    const insert = vi.spyOn(IDBObjectStore.prototype, "add").mockImplementationOnce(() => {
      throw new DOMException("Fixture quota exhausted", "QuotaExceededError");
    });
    try {
      await userEvent.upload(input, backup);
      await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent("The project could not be saved locally. Try importing the backup again.");
    } finally {
      insert.mockRestore();
    }
    expect(await listDrafts(scope)).toHaveLength(1);
    await userEvent.upload(input, backup);
    await expect
      .element(screen.getByRole("textbox", { name: "Project notes" }))
      .toHaveValue("Private contents");
    const projects = await listDrafts(scope);
    expect(projects).toHaveLength(2);
    expect(projects.map(({ title, fields }) => ({ title, fields }))).toEqual([
      { title: "Copy me", fields: { notes: "Private contents" } },
      { title: "Copy me", fields: { notes: "Private contents" } },
    ]);
  } finally {
    createUrl.mockRestore();
    document.removeEventListener("click", preventDownload);
  }
});
