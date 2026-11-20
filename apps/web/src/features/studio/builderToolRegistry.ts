import { msg } from "gt-react";
import type { affiliateSheets } from "./affiliateDraft";
import type { Category, stages } from "./drafts";

export const BUILDER_TOOL_SETTINGS_ID = "studio-builder-tools";

interface ExternalBuilderTool {
  name: string;
  status: "unqualified" | "disabled" | "connect";
  detail: string;
}

interface BuilderStepTools {
  name: string;
  detail: string;
  external?: ExternalBuilderTool;
}

const publishing: ExternalBuilderTool = {
  name: msg("Connected publishing"),
  status: "disabled",
  detail: msg("Prepare a local handoff for the destination you choose."),
};

const videoRenderer: ExternalBuilderTool = {
  name: msg("Video renderer"),
  status: "connect",
  detail: msg("Pair the local FFmpeg renderer in Preview to produce a narrated MP4 with timed subtitles and close-ups."),
};

const paperReplay: ExternalBuilderTool = {
  name: msg("Automated replay"),
  status: "unqualified",
  detail: msg("Advance through your own practice material manually and record checkpoints here."),
};

const categoryTools: Record<Category, BuilderStepTools> = {
  blank: { name: msg("Project notebook"), detail: msg("Save editable notes in this workspace.") },
  "digital-product": {
    name: msg("Manuscript editor and export"),
    detail: msg(
      "Outline, write and review a manuscript, then download approved text or print-friendly HTML.",
    ),
  },
  video: {
    name: msg("Storyboard and cue sheet"),
    detail: msg(
      "Audition production styles, lay out timed cues and export the editable project plan.",
    ),
    external: videoRenderer,
  },
  clipper: {
    name: msg("Local clip editor"),
    detail: msg("Mark cuts from your source, preview captions and download an edit plan."),
  },
  replica: {
    name: msg("Original design brief"),
    detail: msg(
      "Turn a permitted observation into behavior requirements and export them for review.",
    ),
  },
  "day-trader": {
    name: msg("Practice journal"),
    detail: msg(
      "Use your own practice notes to plan checkpoints, record decisions and export a journal.",
    ),
    external: {
      name: msg("Live feeds and broker connections"),
      status: "disabled",
      detail: msg("This practice workspace stays offline."),
    },
  },
  "affiliate-storefront": {
    name: msg("Storefront editor and export"),
    detail: msg(
      "Compare your candidates, preview a storefront with a disclosure and download an approved handoff.",
    ),
    external: publishing,
  },
};

type CategoryStage<C extends Category> = C extends "affiliate-storefront"
  ? keyof typeof affiliateSheets
  : (typeof stages)[C][number];

const stepTools = {
  blank: { notes: categoryTools.blank },
  "digital-product": {
    format: {
      name: msg("Format picker"),
      detail: msg("Choose an ebook, workbook or practical guide for your working draft."),
    },
    brief: {
      name: msg("Brief editor"),
      detail: msg("Describe the audience, outcome and constraints in an editable brief."),
    },
    outline: {
      name: msg("Outline editor"),
      detail: msg("Arrange the sections before writing the manuscript."),
    },
    draft: {
      name: msg("Manuscript editor"),
      detail: msg("Write and edit the text that will appear in the export."),
    },
    export: {
      name: msg("Manuscript preview and export"),
      detail: msg(
        "Review the public preview, approve it and download text or print-friendly HTML.",
      ),
    },
  },
  video: {
    style: {
      name: msg("Style audition"),
      detail: msg(
        "Compare and preview the built-in treatments, then apply the style to your draft.",
      ),
    },
    prepare: {
      name: msg("Style tool plan"),
      detail: msg("Choose resources for this style and save the list with the working draft."),
      external: videoRenderer,
    },
    brief: {
      name: msg("Brief and series editor"),
      detail: msg("Set an audience and outcome, or reuse a saved series brief."),
    },
    storyboard: {
      name: msg("Cue sheet editor"),
      detail: msg(
        "Write the script and shot list, then add timed narration, text and motion cues.",
      ),
    },
    assets: {
      name: msg("Materials checklist"),
      detail: msg("Record the planned visuals, sound and source permissions."),
    },
    render: {
      name: msg("Storyboard preview"),
      detail: msg("Read the saved shot list and cue sheet on this device."),
      external: videoRenderer,
    },
    review: {
      name: msg("Production review notes"),
      detail: msg("Record changes to framing, captions, audio or rights."),
    },
    export: {
      name: msg("Draft and caption downloads"),
      detail: msg("Download editable JSON or package reviewed Storyboard captions as WebVTT."),
    },
    publish: {
      name: msg("Post caption editor"),
      detail: msg("Write the copy and download it with your draft or as a series caption."),
      external: publishing,
    },
  },
  clipper: {
    source: {
      name: msg("Local video and captions"),
      detail: msg("Open a supported local video and optionally import a timed caption file."),
      external: {
        name: msg("Automatic transcription"),
        status: "unqualified",
        detail: msg("Import a caption file or write captions for the cuts you select."),
      },
    },
    moments: {
      name: msg("Manual clip marks"),
      detail: msg("Play the recording and use Mark in and Mark out to choose a cut."),
    },
    edit: {
      name: msg("Clip and caption settings"),
      detail: msg("Set the aspect, framing and caption placement, then preview the cut."),
    },
    review: {
      name: msg("Local cut review"),
      detail: msg("Check mark timing and caption placement against the source."),
    },
    export: {
      name: msg("Captions and edit plan"),
      detail: msg(
        "Download timed captions or the edit plan. Footage export requires selected cuts and the local source.",
      ),
    },
    publish: {
      name: msg("Publishing notes"),
      detail: msg("Draft a caption and record approvals for a manual handoff."),
      external: publishing,
    },
  },
  replica: {
    reference: {
      name: msg("Observation notes"),
      detail: msg("Record the source, permitted uses and the behavior you observed."),
    },
    brief: {
      name: msg("Behavior brief"),
      detail: msg("Write an original behavior and a scenario that can be checked."),
    },
    design: {
      name: msg("Interaction notes"),
      detail: msg("Sketch the flow and describe what happens at each step."),
    },
    export: {
      name: msg("Design brief preview"),
      detail: msg("Review and download the collaboration brief or a private working copy."),
    },
    prototype: {
      name: msg("Prototype preparation"),
      detail: msg("Prepare the behavior brief and acceptance scenario for a manual handoff."),
      external: {
        name: msg("Isolated prototype execution"),
        status: "unqualified",
        detail: msg("The builder exports specifications for review."),
      },
    },
  },
  "day-trader": {
    "practice-data": {
      name: msg("Practice data notes"),
      detail: msg("Describe your own historical or synthetic material and record the source."),
    },
    rules: {
      name: msg("Practice rules worksheet"),
      detail: msg("Write down the exercise rules and when to pause."),
    },
    replay: {
      name: msg("Manual checkpoints"),
      detail: msg(
        "Write each hypothetical decision before advancing through your practice material.",
      ),
      external: paperReplay,
    },
    journal: categoryTools["day-trader"],
    export: {
      name: msg("Practice journal download"),
      detail: msg("Save your checkpoints and journal notes as editable JSON."),
    },
  },
  "affiliate-storefront": {
    discover: {
      name: msg("Candidate notebook"),
      detail: msg("Add products you have researched and record their source and fit."),
      external: {
        name: msg("Connected product discovery"),
        status: "unqualified",
        detail: msg("Bring your own product references to the notebook."),
      },
    },
    compare: {
      name: msg("Candidate comparison"),
      detail: msg("Compare the evidence and pin candidates for the storefront."),
    },
    links: {
      name: msg("Affiliate link validation"),
      detail: msg("Check supplied links and match them to the selected candidates."),
    },
    design: {
      name: msg("Storefront design editor"),
      detail: msg("Choose a visual treatment and write the public copy and disclosure."),
    },
    review: {
      name: msg("Local storefront preview"),
      detail: msg("Review the disclosure and links, then approve the exact export."),
    },
    export: {
      name: msg("Storefront download"),
      detail: msg("Download approved HTML or the available handoff for your selected destination."),
      external: publishing,
    },
  },
} satisfies { [C in Category]: Record<CategoryStage<C>, BuilderStepTools> };

export function getBuilderStepTools(category: Category, stage?: string): BuilderStepTools {
  const steps: Readonly<Record<string, BuilderStepTools | undefined>> = stepTools[category];
  return stage && Object.hasOwn(steps, stage)
    ? (steps[stage] ?? categoryTools[category])
    : categoryTools[category];
}
