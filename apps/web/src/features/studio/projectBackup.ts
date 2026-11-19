import { isAffiliateDraft, type AffiliateDraft } from "./affiliateDraft";
import { digitalProductPublicTitle } from "./digitalProductExport";
import { createDraft, draftStages, insertDraft, projectName, stages, styleNames } from "./drafts";
import type { Category, StudioDraft, VideoStyle } from "./drafts";
import { catalog, downloadStudioFile } from "./guide";
import { isVideoCueList, type VideoCue } from "./videoCues";
import { workingGuide } from "./workingDraftGuides";

const backupSchema = "studio-project-backup/1";
const workingDraftSchema = "studio-working-draft/1";
const mib = 1024 * 1024;
const largeBackupBytes = 8 * mib;
// A project is restored in one IndexedDB transaction. Bound JSON parsing and cloning
// before reading anything, while letting authors download their complete work.
const maxRestoreMib = 32;
export const PROJECT_BACKUP_MAX_BYTES = maxRestoreMib * mib;

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

export type ProjectBackupRestoreOptions = {
  allowLargeBackup?: boolean;
  allowPartialReplica?: boolean;
};

export class ProjectBackupConfirmation extends ProjectBackupError {
  constructor(readonly option: keyof ProjectBackupRestoreOptions, message: string) {
    super(message);
  }
}

// These exact names identify state that must never transfer authority. Unknown
// strings live only in the inert archive, including authored notes about security.
const reservedFields = new Set([
  "__proto__", "prototype", "constructor", "connection", "restoredcopy", "shareobservation",
  "reviewed", "approved", "approval", "approvals", "digitalproductapproval", "publishapproval",
  "publishapprovalstatus", "grant", "grants", "permissiongrant", "permissions", "permission",
  "auth", "authorization", "oauth", "credentials", "credential", "apikey", "providerapikey",
  "token", "accesstoken", "refreshtoken", "providerrefreshtoken", "providertoken", "oauthtoken",
  "secret", "clientsecret", "password", "passkey", "privatekey", "cookie", "sessioncookie",
]);

function canArchiveField(key: string): boolean {
  return key !== "__proto__" && !reservedFields.has(key.replace(/[-_ ]/g, "").toLowerCase());
}

function copyFields(value: unknown, category: Category, archived: unknown) {
  if (!record(value)) invalid();
  const fields: Record<string, string> = {};
  const archivedEntries = new Map<string, string>();
  const known = new Set(fieldKeys(category));
  if (record(archived)) {
    for (const [key, text] of Object.entries(archived)) {
      if (typeof text === "string" && canArchiveField(key)) archivedEntries.set(key, text);
    }
  }
  for (const [key, text] of Object.entries(value)) {
    if (known.has(key)) {
      if (typeof text !== "string") invalid();
      fields[key] = text;
    } else if (typeof text === "string" && canArchiveField(key)) {
      archivedEntries.set(key, text);
    }
  }
  return {
    fields,
    ...(archivedEntries.size ? { archivedFields: Object.fromEntries(archivedEntries) } : {}),
  };
}

function copyCues(value: unknown): VideoCue[] {
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
  options: ProjectBackupRestoreOptions,
) {
  const kind = input.kind;
  if (category === "replica" && kind === "design-brief") {
    // Early Replica exports included every field under this kind. Later collaborator briefs
    // reused the same kind but could only include the public subset, optionally with observation.
    if (input.content !== "authored-notes") invalid();
    if (
      !options.allowPartialReplica &&
      !Object.keys(fields).some((key) => !replicaHandoffKeys.has(key))
    ) {
      throw new ProjectBackupConfirmation(
        "allowPartialReplica",
        "Restore a partial copy? This Replica file may be a collaborator handoff. Private source locations, rights notes and open questions are missing. Only the content in this file can be recovered.",
      );
    }
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
  "category" | "stage" | "title" | "fields" | "archivedFields" | "style" | "tools" | "videoCues" | "affiliate"
>;

function readContent(input: unknown, options: ProjectBackupRestoreOptions = {}): BackupContent {
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
  const fieldContent = copyFields(input.fields, category, input.archivedFields);
  if (legacy) checkLegacyKind(input, category, fieldContent.fields, options);
  const content: BackupContent = {
    category,
    stage,
    title,
    ...fieldContent,
    style: "kinetic-type",
    tools: [],
  };
  if (category === "video") {
    const legacyStyle = legacy && record(input.style) ? input.style : undefined;
    const styleId = legacy ? legacyStyle?.id : input.style;
    const style = styleNames.find((id) => id === styleId);
    if (!style) invalid();
    // Original private backups omitted the version. Their style definitions were version 1.
    const version = legacy
      ? legacyStyle?.version
      : Object.hasOwn(input, "styleVersion") ? input.styleVersion : 1;
    if (version !== catalog.styles[style].version) {
      throw new ProjectBackupError("This backup uses an unsupported Video style version.");
    }
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
  const styleVersion = draft.category === "video" ? catalog.styles[draft.style].version : undefined;
  const content = readContent({ ...draft, schema: backupSchema, styleVersion });
  return new Blob([JSON.stringify({ schema: backupSchema, ...content, styleVersion })], {
    type: "application/json",
  });
}

export function downloadProjectBackup(draft: StudioDraft) {
  const blob = projectBackupBlob(draft);
  downloadStudioFile(blob, projectName(draft), " - private backup.json");
  return blob.size > PROJECT_BACKUP_MAX_BYTES
    ? `The complete file exceeds this version's ${maxRestoreMib} MiB restore limit. Keep the JSON as a private archive.`
    : "";
}

export function projectBackupErrorMessage(error: unknown, fallback: string) {
  return error instanceof ProjectBackupError ? error.message : fallback;
}

export async function importProjectBackup(
  file: File,
  workspaceId: string,
  options: ProjectBackupRestoreOptions = {},
): Promise<StudioDraft> {
  if (file.size > PROJECT_BACKUP_MAX_BYTES) {
    throw new ProjectBackupError(
      `This backup is too large to restore in Studio. The restore limit is ${maxRestoreMib} MiB.`,
    );
  }
  if (file.size > largeBackupBytes && !options.allowLargeBackup) {
    throw new ProjectBackupConfirmation(
      "allowLargeBackup",
      `Restore a large backup? This file is ${(file.size / mib).toFixed(1)} MiB. Studio will load it into memory before saving a new project.`,
    );
  }
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
  const content = readContent(input, options);
  return insertDraft({ ...createDraft(workspaceId, content.category), ...content });
}
