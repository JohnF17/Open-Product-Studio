import catalogText from "../../../../../docs/roadmap/project-categories.json?raw";
import type { StudioDraft, VideoStyle } from "./drafts";
import { projectName } from "./drafts";

type StyleDefinition = {
  label: string;
  version: number;
  required: { need: string; chooseOne: string[] }[];
  optional: string[];
};

// These catalog entries describe a plan. Only a qualified backend adapter can execute a tool.
export const catalog = JSON.parse(catalogText) as {
  styles: Record<VideoStyle, StyleDefinition>;
  stackEntries: Record<string, { label: string; kind: string; cost: string }>;
};

export const styleNames: readonly VideoStyle[] = ["kinetic-type", "product-demo", "3d-showcase"];
export const styleDescriptions: Record<VideoStyle, string> = {
  "kinetic-type": "Let moving type, rhythm and a few precise words carry the story.",
  "product-demo": "Walk through a real product with screenshots and screen recordings.",
  "3d-showcase": "Build a visual study around a rendered model or an existing 3D shot.",
};

export const stepNames: Record<string, string> = {
  notes: "Workspace",
  format: "Format",
  style: "Style",
  prepare: "Tool plan",
  brief: "Brief",
  outline: "Outline",
  draft: "Manuscript",
  storyboard: "Storyboard",
  assets: "Materials",
  render: "Preview",
  review: "Review",
  export: "Export",
  publish: "Publication",
};

export interface Starter {
  title: string;
  reason: string;
  brief: string;
}
export function starterOptions(draft: StudioDraft): Starter[] {
  if (draft.category === "digital-product")
    return [
      {
        title: "A field guide",
        reason: "Useful when the reader needs a reference they can return to.",
        brief: "Help a beginner recognize a common problem and choose one practical next step.",
      },
      {
        title: "A guided exercise",
        reason: "Gives the reader a concrete result in one sitting.",
        brief:
          "Lead the reader through one short exercise, with a worked example and space to try it.",
      },
    ];
  if (draft.style === "3d-showcase")
    return [
      {
        title: "An object in detail",
        reason: "One model can support an establishing shot and close-ups.",
        brief: "Reveal three design details of a single object and explain the purpose of each.",
      },
      {
        title: "How it fits together",
        reason: "An exploded view makes a mechanism easier to understand.",
        brief: "Show the assembled object, separate its major parts and bring them back together.",
      },
    ];
  if (draft.style === "product-demo")
    return [
      {
        title: "One useful workflow",
        reason: "A short screen recording can demonstrate a complete result.",
        brief: "Show one recurring task from its starting screen through the finished result.",
      },
      {
        title: "Before and after",
        reason: "Two comparable views make the difference legible.",
        brief: "Compare the same task before and after one change, using real footage.",
      },
    ];
  return [
    {
      title: "Explain one idea",
      reason: "Short contrasting phrases work well as timed text.",
      brief:
        "Introduce a common misconception, show a simple example and finish with one takeaway.",
    },
    {
      title: "Three practical steps",
      reason: "A repeating visual rhythm makes a short sequence easy to follow.",
      brief: "Teach one useful process in three steps, each illustrated with a concrete example.",
    },
  ];
}

export function selectedTools(draft: StudioDraft): string[] {
  const style = catalog.styles[draft.style];
  return [
    ...style.required.map(
      (slot) => slot.chooseOne.find((id) => draft.tools.includes(id)) ?? slot.chooseOne[0]!,
    ),
    ...style.optional.filter((id) => draft.tools.includes(id)),
  ];
}

export function exportDraft(draft: StudioDraft) {
  const copy = {
    schema: "studio-working-draft/1",
    category: draft.category,
    title: projectName(draft),
    stage: draft.stage,
    fields: draft.fields,
    ...(draft.category === "video"
      ? {
          style: { id: draft.style, version: catalog.styles[draft.style].version },
          plannedTools: selectedTools(draft),
        }
      : {}),
  };
  const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    (projectName(draft)
      .replace(/[^\p{L}\p{N} _-]+/gu, " ")
      .trim()
      .slice(0, 80) || "Studio draft") + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
