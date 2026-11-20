export const tutorialSchema = "studio-tutorial/1";
export const tutorialPlanField = "tutorialProduction";
export const tutorialProposalField = "tutorialProductionProposal";
export const tutorialMaxScenes = 120;
export const tutorialMaxJsonLength = 512 * 1024;
export const tutorialFps = 30;

export interface TutorialFocus {
  x: number;
  y: number;
  zoom: number;
}

export interface TutorialScene {
  id: string;
  source: string;
  start: number;
  end: number;
  narration: string;
  caption: string;
  focus?: TutorialFocus | undefined;
  hold?: number | undefined;
}

export interface TutorialPlan {
  schema: typeof tutorialSchema;
  title: string;
  scenes: TutorialScene[];
}

const schemaKeys = ["schema", "title", "scenes"];
const sceneKeys = ["id", "source", "start", "end", "narration", "caption", "focus", "hold"];
const focusKeys = ["x", "y", "zoom"];
const unsafeText = /[\p{Cc}\\{}\u2028\u2029]/u;

export function isTutorialSourceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) &&
    !["constructor", "prototype", "__proto__"].includes(value)
  );
}

function hasAllowedKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function withinLength(value: unknown, limit: number): value is string {
  return typeof value === "string" && Array.from(value).length <= limit;
}

function productionText(value: string) {
  return value.trim().length > 0 && !unsafeText.test(value);
}

function isFocus(value: unknown): value is TutorialFocus {
  return (
    hasAllowedKeys(value, focusKeys) &&
    inRange(value.x, 0, 1) &&
    inRange(value.y, 0, 1) &&
    inRange(value.zoom, 1, 3)
  );
}

function isDraftScene(value: unknown): value is TutorialScene {
  return (
    hasAllowedKeys(value, sceneKeys) &&
    isTutorialSourceId(value.id) &&
    isTutorialSourceId(value.source) &&
    inRange(value.start, 0, 86400) &&
    inRange(value.end, 0, 86400) &&
    withinLength(value.narration, 900) &&
    withinLength(value.caption, 80) &&
    (value.focus === undefined || isFocus(value.focus)) &&
    (value.hold === undefined || inRange(value.hold, 0, 60))
  );
}

export function tutorialFrames(seconds: number) {
  return Math.round(seconds * tutorialFps);
}

export function tutorialSceneFrames(scene: TutorialScene) {
  return tutorialFrames(scene.end) - tutorialFrames(scene.start) + tutorialFrames(scene.hold ?? 0);
}

export function tutorialPlanDuration(plan: TutorialPlan) {
  return (
    plan.scenes.reduce((frames, scene) => frames + Math.max(0, tutorialSceneFrames(scene)), 0) /
    tutorialFps
  );
}

export function tutorialSceneIssue(scene: TutorialScene) {
  const frames = tutorialFrames(scene.end) - tutorialFrames(scene.start);
  if (frames < 1 || frames > 180 * tutorialFps) return "timing" as const;
  if (!productionText(scene.narration)) return "narration" as const;
  if (!productionText(scene.caption)) return "caption" as const;
  return null;
}

export function tutorialPlanIssue(plan: TutorialPlan) {
  if (!productionText(plan.title)) return "title" as const;
  if (!plan.scenes.length) return "empty" as const;
  if (plan.scenes.some((scene) => tutorialSceneIssue(scene))) return "shots" as const;
  if (tutorialPlanDuration(plan) > 1200) return "duration" as const;
  return null;
}

export function readTutorialDraft(raw: string | undefined): TutorialPlan | null {
  if (!raw || raw.length > tutorialMaxJsonLength) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !hasAllowedKeys(data, schemaKeys) ||
    data.schema !== tutorialSchema ||
    !withinLength(data.title, 120) ||
    !Array.isArray(data.scenes) ||
    data.scenes.length > tutorialMaxScenes ||
    !data.scenes.every(isDraftScene) ||
    new Set(data.scenes.map((scene) => scene.id)).size !== data.scenes.length
  )
    return null;
  return { schema: tutorialSchema, title: data.title, scenes: data.scenes };
}

export function readTutorialProposal(raw: string | undefined): TutorialPlan | null {
  const plan = readTutorialDraft(raw);
  return plan && !tutorialPlanIssue(plan) ? plan : null;
}

export function tutorialCrop(focus: TutorialFocus | undefined, frame: number, frameCount: number) {
  if (!focus) return { x: 0, y: 0, zoom: 1 };
  const rampFrames = Math.max(1, Math.min(23, Math.round((frameCount - 1) * 0.4)));
  const progress = Math.min(1, Math.max(0, frame) / rampFrames);
  const zoom = 1 + (focus.zoom - 1) * (3 * progress ** 2 - 2 * progress ** 3);
  const halfCrop = 0.5 / zoom;
  const offset = (center: number) =>
    (0.5 - Math.min(1 - halfCrop, Math.max(halfCrop, center))) * zoom * 100;
  return { x: offset(focus.x), y: offset(focus.y), zoom };
}
