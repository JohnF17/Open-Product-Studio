import * as Schema from "effect/Schema";

import { randomUUID } from "../../lib/randomUUID";
import { isVideoCueList, type VideoCue } from "./videoCues";
import { type AffiliateDraft, affiliateSheets, createAffiliateDraft, isAffiliateDraft } from "./affiliateDraft";

export type WorkingCategory = "clipper" | "replica" | "day-trader";
export type Category = "blank" | "digital-product" | "video" | "affiliate-storefront" | WorkingCategory;
export const styleNames = ["kinetic-type", "product-demo", "3d-showcase", "stick-figure-explainer"] as const;
export type VideoStyle = (typeof styleNames)[number];

export interface VideoSeriesBrief {
  readonly seriesId: string;
  readonly revision: number;
  readonly audience: string;
  readonly format: string;
  readonly style: VideoStyle;
}

export function isVideoSeriesBrief(value: unknown): value is VideoSeriesBrief {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const brief = value as Partial<VideoSeriesBrief>;
  return (
    Object.keys(brief).length === 5 &&
    typeof brief.seriesId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(brief.seriesId) &&
    typeof brief.revision === "number" &&
    Number.isSafeInteger(brief.revision) &&
    brief.revision >= 1 &&
    typeof brief.audience === "string" &&
    brief.audience.trim().length > 0 &&
    typeof brief.format === "string" &&
    brief.format.trim().length > 0 &&
    styleNames.some((style) => style === brief.style)
  );
}

export function isVideoSeriesHistory(value: unknown, current: VideoSeriesBrief): value is VideoSeriesBrief[] {
  if (!Array.isArray(value)) return false;
  let previousRevision = 0;
  for (const entry of value) {
    if (!isVideoSeriesBrief(entry) || entry.seriesId !== current.seriesId ||
      entry.revision <= previousRevision || entry.revision >= current.revision) return false;
    previousRevision = entry.revision;
  }
  return true;
}

export interface StudioDraft {
  schema: 1;
  id: string;
  workspaceId: string;
  revision: number;
  restoredCopy?: number;
  updatedAt: number;
  category: Category;
  stage: string;
  style: VideoStyle;
  title: string;
  fields: Record<string, string>;
  /** Inert text from private recovery. Only the backup serializer reads it. */
  archivedFields?: Record<string, string>;
  videoCues?: VideoCue[];
  seriesBrief?: VideoSeriesBrief;
  seriesBriefOwner?: true;
  seriesHistory?: VideoSeriesBrief[] | undefined;
  affiliate?: AffiliateDraft;
  tools: string[];
}

export const categories: ReadonlyArray<{ id: Category; label: string; description: string }> = [
  {
    id: "blank",
    label: "Blank",
    description: "Collect your notes and decide what to make as you go.",
  },
  {
    id: "digital-product",
    label: "Digital product",
    description: "Shape an idea into an ebook, workbook or practical guide.",
  },
  {
    id: "video",
    label: "Video",
    description: "Choose a style and plan a production, scene by scene.",
  },
  {
    id: "clipper",
    label: "Clipper",
    description: "Mark a moment from a recording and write an edit plan.",
  },
  {
    id: "replica",
    label: "Replica",
    description: "Turn a workflow you observed into an original design brief.",
  },
  {
    id: "day-trader",
    label: "Day Trader",
    description: "Plan an offline practice session and keep a decision journal.",
  },
  {
    id: "affiliate-storefront",
    label: "Affiliate Storefront",
    description: "Shortlist products and build a page with your affiliate links.",
  },
];

export const stages = {
  blank: ["notes"],
  "digital-product": ["format", "brief", "outline", "draft", "export"],
  video: [
    "style",
    "prepare",
    "brief",
    "storyboard",
    "assets",
    "render",
    "review",
    "export",
    "publish",
  ],
  clipper: ["source", "moments", "edit", "review", "export", "publish"],
  replica: ["reference", "brief", "design", "export", "prototype"],
  "day-trader": ["practice-data", "rules", "replay", "journal", "export"],
  "affiliate-storefront": Object.keys(affiliateSheets),
} as const satisfies Record<Category, readonly string[]>;

export function draftStages(category: Category): readonly string[] {
  return stages[category];
}

export function createDraft(workspaceId: string, category: Category): StudioDraft {
  return {
    schema: 1,
    id: randomUUID(),
    workspaceId,
    revision: 0,
    updatedAt: Date.now(),
    category,
    stage: stages[category][0]!,
    style: "kinetic-type",
    title: "",
    fields: category === "digital-product" ? { format: "Ebook" } : {},
    ...(category === "affiliate-storefront" ? { affiliate: createAffiliateDraft() } : {}),
    tools: [],
  };
}

export function projectName(draft: StudioDraft): string {
  return (
    draft.title.trim() ||
    {
      blank: "Untitled project",
      video: "Untitled video",
      "digital-product": "Untitled digital product",
      clipper: "Untitled clip",
      replica: "Untitled design",
      "day-trader": "Untitled practice study",
      "affiliate-storefront": "Untitled storefront",
    }[draft.category]
  );
}

export function isStudioDraft(value: unknown, workspaceId: string): value is StudioDraft {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Partial<StudioDraft>;
  return (
    d.schema === 1 &&
    d.workspaceId === workspaceId &&
    typeof d.id === "string" &&
    typeof d.category === "string" &&
    Object.hasOwn(stages, d.category) &&
    typeof d.stage === "string" &&
    draftStages(d.category).includes(d.stage) &&
    styleNames.some((style) => style === d.style) &&
    typeof d.title === "string" &&
    typeof d.revision === "number" &&
    Number.isSafeInteger(d.revision) &&
    d.revision >= 0 &&
    (d.restoredCopy === undefined || (Number.isSafeInteger(d.restoredCopy) && d.restoredCopy > 0)) &&
    typeof d.updatedAt === "number" &&
    Number.isFinite(d.updatedAt) &&
    !!d.fields &&
    typeof d.fields === "object" &&
    !Array.isArray(d.fields) &&
    Object.values(d.fields).every((v) => typeof v === "string") &&
    (d.archivedFields === undefined ||
      (d.archivedFields !== null &&
        typeof d.archivedFields === "object" &&
        !Array.isArray(d.archivedFields) &&
        Object.values(d.archivedFields).every((v) => typeof v === "string"))) &&
    (d.videoCues === undefined || (d.category === "video" && isVideoCueList(d.videoCues))) &&
    (d.seriesBrief === undefined || (d.category === "video" && isVideoSeriesBrief(d.seriesBrief))) &&
    (d.seriesBriefOwner === undefined || (d.seriesBriefOwner === true && d.seriesBrief !== undefined)) &&
    (d.seriesHistory === undefined || (d.seriesBrief !== undefined &&
      isVideoSeriesHistory(d.seriesHistory, d.seriesBrief))) &&
    (d.category === "affiliate-storefront" ? isAffiliateDraft(d.affiliate) : d.affiliate === undefined) &&
    Array.isArray(d.tools) &&
    d.tools.every((t) => typeof t === "string")
  );
}

let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("open-product-studio-drafts", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) {
        const store = db.createObjectStore("projects", { keyPath: ["workspaceId", "id"] });
        store.createIndex("workspace", "workspaceId");
      }
      if (!db.objectStoreNames.contains("restoreCounters")) db.createObjectStore("restoreCounters");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

export async function listDrafts(workspaceId: string): Promise<StudioDraft[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("projects")
      .objectStore("projects")
      .index("workspace")
      .getAll(workspaceId);
    request.onsuccess = () =>
      resolve(
        (request.result as unknown[])
          .filter((row) => isStudioDraft(row, workspaceId))
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    request.onerror = () => reject(request.error);
  });
}

/** An episode only needs one pinned snapshot, even in a workspace with large media drafts. */
export async function readLocalSeriesBrief(workspaceId: string, seriesId: string): Promise<VideoSeriesBrief | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const query = db.transaction("projects").objectStore("projects").index("workspace").openCursor(workspaceId);
    query.onsuccess = () => {
      const cursor = query.result;
      if (!cursor) {
        resolve(undefined);
        return;
      }
      const row = cursor.value as Partial<StudioDraft> | null;
      if (row?.category === "video" && row.seriesBriefOwner === true &&
          row.seriesBrief?.seriesId === seriesId && isVideoSeriesBrief(row.seriesBrief)) {
        resolve(row.seriesBrief);
        return;
      }
      cursor.continue();
    };
    query.onerror = () => reject(query.error);
  });
}

export class DraftConflict extends Schema.TaggedError<
  DraftConflict,
  { readonly brand: unique symbol }
>()("DraftConflict", { message: Schema.String }) {}

const isDraftConflict = Schema.is(DraftConflict);

export async function saveDraft(draft: StudioDraft, expectedRevision: number): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    const store = tx.objectStore("projects");
    const read = store.get([draft.workspaceId, draft.id]);
    let conflict = false;
    read.onsuccess = () => {
      const existing: unknown = read.result;
      if (
        existing === undefined
          ? expectedRevision !== 0
          : !isStudioDraft(existing, draft.workspaceId) || existing.revision !== expectedRevision
      ) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put({ ...draft, revision: expectedRevision + 1 });
    };
    tx.onabort = () =>
      reject(
        conflict
          ? new DraftConflict({ message: "This project changed in another window." })
          : tx.error,
      );
    tx.oncomplete = () => resolve(expectedRevision + 1);
  });
}

/** Insert a restored draft without ever replacing a row with the same key. */
export async function insertDraft(draft: StudioDraft): Promise<StudioDraft> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["projects", "restoreCounters"], "readwrite");
    const counters = tx.objectStore("restoreCounters");
    const last = counters.get(draft.workspaceId);
    let saved: StudioDraft;
    last.onsuccess = () => {
      if (last.result !== undefined && (!Number.isSafeInteger(last.result) || last.result < 0 || last.result >= Number.MAX_SAFE_INTEGER)) {
        tx.abort();
        return;
      }
      const restoredCopy = (last.result ?? 0) + 1;
      saved = { ...draft, revision: 1, restoredCopy };
      try {
        counters.put(restoredCopy, draft.workspaceId);
        tx.objectStore("projects").add(saved);
      } catch (cause) {
        tx.abort();
        reject(cause);
      }
    };
    tx.onabort = () => reject(tx.error ?? new Error("Project restore did not commit."));
    tx.oncomplete = () => resolve(saved);
  });
}

type Editable = Pick<StudioDraft, "title" | "fields" | "videoCues" | "seriesBrief" | "seriesBriefOwner" | "seriesHistory" | "affiliate" | "style" | "tools" | "stage" | "category">;
type SaveState = "saved" | "saving" | "error" | "conflict";

/** One writer per open project. Coalesce keystrokes while the previous transaction commits. */
export class DraftEditor {
  private listeners = new Set<() => void>();
  private revision: number;
  private pending: Promise<void> | undefined;
  private writer: typeof saveDraft;
  private view: { draft: StudioDraft; status: SaveState };

  constructor(draft: StudioDraft, writer = saveDraft) {
    this.revision = draft.revision;
    this.writer = writer;
    this.view = { draft, status: "saved" };
  }

  snapshot = () => this.view;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private set(draft: StudioDraft, status: SaveState) {
    this.view = { draft, status };
    for (const fn of this.listeners) fn();
  }

  update(patch: Partial<Editable>) {
    this.set(
      { ...this.view.draft, ...patch, updatedAt: Date.now() },
      this.view.status === "conflict" ? "conflict" : "saving",
    );
    if (this.view.status !== "conflict") void this.flush();
  }

  flush(): Promise<void> {
    if (this.pending) return this.pending;
    if (this.view.status === "conflict" || (this.revision > 0 && this.view.status === "saved"))
      return Promise.resolve();
    const write = async () => {
      this.set(this.view.draft, "saving");
      try {
        for (;;) {
          const drafted = this.view.draft;
          this.revision = await this.writer(drafted, this.revision);
          if (this.view.draft === drafted) {
            this.set({ ...drafted, revision: this.revision }, "saved");
            return;
          }
        }
      } catch (error) {
        this.set(this.view.draft, isDraftConflict(error) ? "conflict" : "error");
      }
    };
    this.pending = write().then(() => {
      this.pending = undefined;
      if (this.view.status === "saving") return this.flush();
    });
    return this.pending;
  }
}
