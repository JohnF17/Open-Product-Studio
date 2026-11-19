export type WorkingCategory = "clipper" | "replica" | "day-trader";
export type Category = "blank" | "digital-product" | "video" | WorkingCategory;
export type VideoStyle = "kinetic-type" | "product-demo" | "3d-showcase";

export interface StudioDraft {
  schema: 1;
  id: string;
  workspaceId: string;
  revision: number;
  updatedAt: number;
  category: Category;
  stage: string;
  style: VideoStyle;
  title: string;
  fields: Record<string, string>;
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
} as const satisfies Record<Category, readonly string[]>;

export function draftStages(category: Category): readonly string[] {
  return stages[category];
}

export function createDraft(workspaceId: string, category: Category): StudioDraft {
  return {
    schema: 1,
    id: crypto.randomUUID(),
    workspaceId,
    revision: 0,
    updatedAt: Date.now(),
    category,
    stage: stages[category][0]!,
    style: "kinetic-type",
    title: "",
    fields: category === "digital-product" ? { format: "Ebook" } : {},
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
    ["kinetic-type", "product-demo", "3d-showcase"].includes(String(d.style)) &&
    typeof d.title === "string" &&
    typeof d.revision === "number" &&
    Number.isSafeInteger(d.revision) &&
    d.revision >= 0 &&
    typeof d.updatedAt === "number" &&
    Number.isFinite(d.updatedAt) &&
    !!d.fields &&
    typeof d.fields === "object" &&
    !Array.isArray(d.fields) &&
    Object.values(d.fields).every((v) => typeof v === "string") &&
    Array.isArray(d.tools) &&
    d.tools.every((t) => typeof t === "string")
  );
}

let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("open-product-studio-drafts", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("projects", {
        keyPath: ["workspaceId", "id"],
      });
      store.createIndex("workspace", "workspaceId");
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

export class DraftConflict extends Error {}

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
      reject(conflict ? new DraftConflict("This project changed in another window.") : tx.error);
    tx.oncomplete = () => resolve(expectedRevision + 1);
  });
}

type Editable = Pick<StudioDraft, "title" | "fields" | "style" | "tools" | "stage" | "category">;
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
        this.set(this.view.draft, error instanceof DraftConflict ? "conflict" : "error");
      }
    };
    this.pending = write().then(() => {
      this.pending = undefined;
      if (this.view.status === "saving") return this.flush();
    });
    return this.pending;
  }
}
