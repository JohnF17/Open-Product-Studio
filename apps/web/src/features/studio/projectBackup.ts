import { isAffiliateDraft, type AffiliateDraft } from "./affiliateDraft";
import { digitalProductPublicTitle } from "./digitalProductExport";
import { createDraft, draftStages, insertDraft, projectName, stages, styleNames } from "./drafts";
import type { Category, StudioDraft, VideoStyle } from "./drafts";
import { catalog, downloadStudioFile } from "./guide";
import { isVideoCueList, type VideoCue } from "./videoCues";
import { workingGuide } from "./workingDraftGuides";

const backupSchema = "studio-project-backup/1";
const workingDraftSchema = "studio-working-draft/1";
export const PROJECT_BACKUP_MAX_BYTES = 8 * 1024 * 1024;
const maxRows = 1_000;

const authoredFields = {
  blank: ["notes"],
  "digital-product": [
    "format",
    "brief",
    "audience",
    "notes",
    "outline",
    "draft",
    digitalProductPublicTitle,
  ],
  video: [
    "brief",
    "audience",
    "notes",
    "motionDirection",
    "script",
    "shots",
    "assets",
    "audio",
    "review",
    "caption",
  ],
  clipper: ["captionLine", "captionLook"],
  replica: [],
  "day-trader": [],
  "affiliate-storefront": [],
} satisfies Record<Category, readonly string[]>;

const replicaHandoffKeys = new Set([
  "brief",
  "acceptanceScenario",
  "interfaceSketch",
  "interactionSpec",
  "observation",
]);

function fieldKeys(category: Category): string[] {
  const guide = workingGuide(category);
  return [
    ...authoredFields[category],
    ...Object.values(guide?.sheets ?? {}).flatMap((sheet) =>
      [...(sheet?.fields ?? []), ...(sheet?.advanced?.fields ?? [])].map(({ key }) => key),
    ),
  ];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class ProjectBackupError extends Error {}

function invalid(): never {
  throw new ProjectBackupError("This backup contains invalid project data.");
}

function tooLarge(): never {
  throw new ProjectBackupError(
    "This backup is too large. The limit is 8 MB and 1,000 cue or candidate rows.",
  );
}

function copyFields(value: unknown, category: Category) {
  if (!record(value)) invalid();
  const fields: Record<string, string> = {};
  for (const key of fieldKeys(category)) {
    if (!Object.hasOwn(value, key)) continue;
    const text = value[key];
    if (typeof text !== "string") invalid();
    fields[key] = text;
  }
  return fields;
}

function copyCues(value: unknown): VideoCue[] {
  if (Array.isArray(value) && value.length > maxRows) tooLarge();
  if (!isVideoCueList(value)) invalid();
  return value.map(({ id, timestamp, action, narration, caption, sound }) => ({
    id,
    timestamp,
    action,
    narration,
    caption,
    sound,
  }));
}

function copyAffiliate(value: unknown): AffiliateDraft {
  if (record(value) && Array.isArray(value.candidates) && value.candidates.length > maxRows)
    tooLarge();
  if (!isAffiliateDraft(value)) invalid();
  const { title, intro, disclosure, style, target, stack, candidates } = value;
  return {
    title,
    intro,
    disclosure,
    style,
    target,
    ...(stack === undefined ? {} : { stack }),
    reviewed: false,
    candidates: candidates.map(
      ({ id, name, sourceUrl, buyerFit, evidenceDate, evidenceNotes, pinned, listing }) => ({
        id,
        name,
        sourceUrl,
        buyerFit,
        evidenceDate,
        evidenceNotes,
        pinned,
        listing: { name: listing.name, description: listing.description, href: listing.href },
      }),
    ),
  };
}

function copyTools(value: unknown, style: VideoStyle): string[] {
  if (!Array.isArray(value) || !value.every((tool): tool is string => typeof tool === "string"))
    invalid();
  const { required, optional } = catalog.styles[style];
  const allowed = new Set([...required.flatMap(({ chooseOne }) => chooseOne), ...optional]);
  return [...new Set(value.filter((tool) => allowed.has(tool)))];
}

function handoff(): never {
  throw new ProjectBackupError(
    "This public handoff is missing private draft data. Choose a private project backup.",
  );
}

function checkLegacyKind(
  input: Record<string, unknown>,
  category: Category,
  fields: Record<string, string>,
) {
  const kind = input.kind;
  if (category === "replica" && kind === "design-brief") {
    // Early Replica exports included every field under this kind. Later collaborator briefs
    // reused the same kind but could only include the public subset, optionally with observation.
    if (!Object.keys(fields).some((key) => !replicaHandoffKeys.has(key))) handoff();
    if (input.content !== "authored-notes") invalid();
    return;
  }
  const expected =
    category === "replica" || category === "affiliate-storefront"
      ? "private-working-draft"
      : workingGuide(category)?.kind;
  if (kind !== expected || (expected !== undefined && input.content !== "authored-notes"))
    invalid();
}

type BackupContent = Pick<
  StudioDraft,
  "category" | "stage" | "title" | "fields" | "style" | "tools" | "videoCues" | "affiliate"
>;

function readContent(input: unknown): BackupContent {
  if (!record(input)) invalid();
  if (input.schema === "studio-affiliate-handoff/1") handoff();
  const legacy = input.schema === workingDraftSchema;
  if (!legacy && input.schema !== backupSchema) {
    throw new ProjectBackupError("This file is not a supported Studio project backup version.");
  }
  const { stage, title } = input;
  if (typeof input.category !== "string" || !Object.hasOwn(stages, input.category)) invalid();
  const category = input.category as Category;
  if (
    typeof stage !== "string" ||
    !draftStages(category).includes(stage) ||
    typeof title !== "string"
  )
    invalid();
  const fields = copyFields(input.fields, category);
  if (legacy) checkLegacyKind(input, category, fields);
  const content: BackupContent = {
    category,
    stage,
    title,
    fields,
    style: "kinetic-type",
    tools: [],
  };
  if (category === "video") {
    const styleId = legacy && record(input.style) ? input.style.id : input.style;
    const style = styleNames.find((id) => id === styleId);
    if (!style || (legacy && (!record(input.style) || !Number.isSafeInteger(input.style.version))))
      invalid();
    content.style = style;
    content.tools = copyTools(legacy ? input.plannedTools : input.tools, style);
    if (legacy && input.cueSheet !== undefined) {
      if (!record(input.cueSheet)) invalid();
      content.videoCues = copyCues(input.cueSheet.cues);
    } else if (!legacy && input.videoCues !== undefined) {
      content.videoCues = copyCues(input.videoCues);
    }
  }
  if (category === "affiliate-storefront") content.affiliate = copyAffiliate(input.affiliate);
  return content;
}

export function projectBackupBlob(draft: StudioDraft): Blob {
  const content = readContent({ ...draft, schema: backupSchema });
  const blob = new Blob([JSON.stringify({ schema: backupSchema, ...content })], {
    type: "application/json",
  });
  if (blob.size > PROJECT_BACKUP_MAX_BYTES) tooLarge();
  return blob;
}

export function downloadProjectBackup(draft: StudioDraft) {
  downloadStudioFile(projectBackupBlob(draft), projectName(draft), " - private backup.json");
}

export function projectBackupErrorMessage(error: unknown, fallback: string) {
  return error instanceof ProjectBackupError ? error.message : fallback;
}

export async function importProjectBackup(file: File, workspaceId: string): Promise<StudioDraft> {
  if (file.size > PROJECT_BACKUP_MAX_BYTES) tooLarge();
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ProjectBackupError("The selected backup could not be read. Choose the file again.");
  }
  if (/^\s*(?:<!doctype html|<html[\s>])/i.test(text)) handoff();
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new ProjectBackupError(
      "Choose a Studio backup in JSON format. The selected file could not be parsed.",
    );
  }
  const content = readContent(input);
  return insertDraft({ ...createDraft(workspaceId, content.category), ...content });
}
