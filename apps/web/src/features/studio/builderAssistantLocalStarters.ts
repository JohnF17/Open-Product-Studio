import { msg } from "gt-react";
import type { AffiliateStage } from "./affiliateDraft";
import { digitalProductPublicTitle } from "./digitalProductExport";
import type { Category, StudioDraft, VideoStyle, stages } from "./drafts";

interface SuggestedField {
  readonly key: string;
  readonly label: string;
  readonly maxLength?: number;
  readonly singleLine?: boolean;
}

export interface StageRecipeDefinition {
  readonly actionLabel: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly fields: readonly SuggestedField[];
  readonly context: readonly SuggestedField[];
  readonly localInputs?: readonly string[];
  readonly starter?: ((draft: StudioDraft) => Record<string, string>) | undefined;
}

function recipe(
  actionLabel: string,
  explanation: string,
  nextStep: string,
  options: Partial<
    Pick<StageRecipeDefinition, "fields" | "context" | "localInputs" | "starter">
  > = {},
): StageRecipeDefinition {
  return { actionLabel, explanation, nextStep, fields: [], context: [], ...options };
}

const projectNotes = { key: "notes", label: msg("Project notes") };
const brief = { key: "brief", label: msg("Project brief") };
const audience = { key: "audience", label: msg("Audience") };
const format = { key: "format", label: msg("Format") };
const outline = { key: "outline", label: msg("Section outline") };
const manuscript = { key: "draft", label: msg("Manuscript") };
const motion = { key: "motionDirection", label: msg("Motion direction") };
const script = { key: "script", label: msg("Script") };
const shots = { key: "shots", label: msg("Shot list") };
const audio = { key: "audio", label: msg("Voice and sound cues") };
const clipGoal = { key: "clipGoal", label: msg("Clip goal") };
const cropNotes = { key: "cropNotes", label: msg("Crop and framing") };
const captionNotes = { key: "captionNotes", label: msg("Caption notes") };
const replicaBrief = { key: "brief", label: msg("Proposed behavior") };
const scenario = { key: "acceptanceScenario", label: msg("Acceptance scenario") };
const affiliateTitle = {
  key: "affiliate.title",
  label: msg("Public storefront title"),
  maxLength: 160,
  singleLine: true,
};
const affiliateIntro = { key: "affiliate.intro", label: msg("Public introduction") };

function excerpt(input?: string, maxLength = 260): string {
  return input?.trim().slice(0, maxLength).trimEnd() ?? "";
}

function titleSubject(draft: StudioDraft) {
  return excerpt(draft.title, 120).replace(/\s+/g, " ");
}

function labelsFromOutline(draft: StudioDraft): string[] {
  return excerpt(draft.fields.outline, 900)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*#]+|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

const formatStructures: Readonly<Record<string, string>> = {
  Ebook:
    "Introduce the problem\nWalk through the method with a worked example\nClose with a reusable checklist",
  Workbook:
    "Define the starting point\nWork through a guided exercise\nTry an independent exercise and check the result",
  "Template kit":
    "Show a completed example\nExplain each editable part\nGive the reader a blank template and a final check",
  Curriculum:
    "Describe the learning outcome\nIntroduce a worked lesson and a practice task\nPlan a check for understanding",
  "Action plan":
    "Choose a first milestone\nPut the actions in order and name dependencies\nAdd a checkpoint and a recovery option",
};

const storyboardShots: Record<VideoStyle, string> = {
  "kinetic-type":
    "Show the key question in large type.\nBring in one phrase at a time over the example.\nHold on the final takeaway long enough to read it.",
  "product-demo":
    "Show the actual starting screen without personal details.\nRecord the key action and pause after the result appears.\nEnd on the result with one short callout.",
  "3d-showcase":
    "Establish the object and its scale.\nMove to a close-up of one feature, then hold the shot.\nReturn to an angle that shows where the feature sits.",
  "stick-figure-explainer":
    "Introduce one figure with a clear pose and one prop.\nMove the figure or prop to show the key action.\nHold on the changed pose so the result is easy to see.",
};

type RecipeTable = {
  [C in Category]: Record<
    C extends "affiliate-storefront" ? AffiliateStage : (typeof stages)[C][number],
    StageRecipeDefinition
  >;
};

const recipes: RecipeTable = {
  blank: {
    notes: recipe(
      msg("Turn an idea into a next step"),
      msg("Capture one possible project, who it might help, and the smallest thing you can try."),
      msg("Choose a first deliverable you could make from these notes."),
      {
        fields: [projectNotes],
        context: [projectNotes],
        starter: (draft) => {
          const notes = draft.fields.notes?.trim();
          const prompts =
            "\n\nWho could use this?\nWhat would they be able to do?\nNext small step: ";
          if (notes?.includes(prompts.trimEnd()) || (notes?.length ?? 0) > 2800) return {};
          const idea =
            notes ||
            (titleSubject(draft)
              ? "Project idea: " + titleSubject(draft)
              : "Project idea: [one thing I could make]");
          return { notes: idea + prompts + "[something I can try or show]" };
        },
      },
    ),
  },
  "digital-product": {
    format: recipe(
      msg("Compare product formats"),
      msg("An ebook explains a method, a workbook lets readers practice, and a template kit gives them a reusable starting point. Use a curriculum for sequenced learning or an action plan for work with milestones."),
      msg("Pick the format that fits what your reader needs to do first."),
      { context: [brief, audience] },
    ),
    brief: recipe(
      msg("Draft a reader outcome"),
      msg("Name a reader at a specific starting point and give them one observable result."),
      msg("Replace the draft prompts with a concrete reader, problem, and result."),
      {
        fields: [brief, audience],
        context: [format, brief, audience],
        starter: (draft) => ({
          brief: [
            "Create a " +
              (excerpt(draft.fields.format, 32) || "guide").toLowerCase() +
              (titleSubject(draft) ? " about " + titleSubject(draft) : " for one small task") +
              ".",
            "Help " +
              (excerpt(draft.fields.audience, 120) || "[one reader group]") +
              " move from [starting problem] to [a result they can check].",
            "Include one worked example and a way to try the method.",
          ].join("\n"),
          audience:
            "People who are new to [the task] and need to finish [one result] with [the tools or time they have].",
        }),
      },
    ),
    outline: recipe(
      msg("Build a section outline"),
      msg("Give each section a distinct job that moves the reader from understanding to doing."),
      msg("Replace the broad section labels with what the reader will learn or do in each section."),
      {
        fields: [outline],
        context: [format, brief, audience],
        starter: (draft) => {
          const selected = draft.fields.format ?? "";
          const structure = Object.hasOwn(formatStructures, selected)
            ? formatStructures[selected]
            : formatStructures.Ebook;
          const reader = excerpt(draft.fields.audience, 120);
          const topic = excerpt(draft.fields.brief) || titleSubject(draft);
          return {
            outline: [
              topic && "Scope: " + topic,
              reader && "Start where " + reader + " are today",
              structure,
            ]
              .filter(Boolean)
              .join("\n"),
          };
        },
      },
    ),
    draft: recipe(
      msg("Start the manuscript"),
      msg("Write a small usable section with an explanation, a worked example, and a way to check the result."),
      msg("Write the worked example in the first section using a scenario you can verify."),
      {
        fields: [manuscript],
        context: [format, audience, brief, outline, manuscript],
        starter: (draft) => {
          const sections = labelsFromOutline(draft);
          const title = titleSubject(draft);
          const promise = excerpt(draft.fields.brief);
          return {
            draft: [
              title,
              promise && "What this will help you do\n" + promise,
              ...(sections.length ? sections : ["Start with one problem", "Try the method"]).map(
                (section, index) =>
                  section +
                  (index === 0
                    ? "\nDescribe when the reader needs this and what they should have before starting."
                    : "\nShow the next action, a worked example, and how to check the result."),
              ),
            ]
              .filter(Boolean)
              .join("\n\n"),
          };
        },
      },
    ),
    export: recipe(
      msg("Prepare the manuscript for export"),
      msg("The reader receives the public title, format, and manuscript. Read the preview to check the title, headings, examples, and references."),
      msg("Approve the exact manuscript in the preview when it is ready, then choose text or print-friendly HTML."),
      {
        fields: [
          {
            key: digitalProductPublicTitle,
            label: msg("Public title"),
            maxLength: 160,
            singleLine: true,
          },
        ],
        context: [format, outline],
        starter: (draft) => ({ [digitalProductPublicTitle]: titleSubject(draft) }),
      },
    ),
  },
  video: {
    style: recipe(
      msg("Compare visual treatments"),
      msg("Use moving type for a short idea, screen footage for a real interaction, 3D for an object, or simple figures for a physical action or sequence."),
      msg("Run the style audition on one scene and check whether the viewer can follow the main action."),
      { context: [brief, motion] },
    ),
    prepare: recipe(
      msg("Plan the tools you need"),
      msg("Match each required tool to the scene you need to make. Select optional tools once you know what the required set leaves out."),
      msg("Choose one available tool for each required job and note any material you still need."),
      { context: [brief, motion] },
    ),
    brief: recipe(
      msg("Draft a video brief"),
      msg("Give the viewer one takeaway and choose a visible action or example that makes it clear."),
      msg("Check that the takeaway can be shown in one scene before building the storyboard."),
      {
        fields: [brief, audience, motion],
        context: [brief, audience, motion],
        starter: (draft) => ({
          brief:
            "Show " +
            (titleSubject(draft) || "[one action or idea]") +
            " for " +
            (excerpt(draft.seriesBrief?.audience ?? draft.fields.audience, 120) ||
              "[one viewer group]") +
            ". Open with their question, demonstrate one example, and close on a result they can recognize.",
          audience:
            "Viewers who know [the starting point] and want to learn [one specific takeaway].",
          motionDirection: storyboardShots[draft.style],
        }),
      },
    ),
    storyboard: recipe(
      msg("Draft narration and shots"),
      msg("Pair each line of the script with a shot that shows what the viewer needs to understand."),
      msg("Read the script aloud while checking that each shot supports the line it accompanies."),
      {
        fields: [script, shots],
        context: [brief, audience, motion, script, shots],
        starter: (draft) => ({
          script: [
            "Opening: " +
              (excerpt(draft.fields.brief) ||
                titleSubject(draft) ||
                "Name one problem the viewer recognizes."),
            "Demonstration: Introduce the example, show the key action, and describe what changes.",
            "Closing: Point out what the viewer should remember or try.",
          ].join("\n\n"),
          shots: storyboardShots[draft.style],
        }),
      },
    ),
    assets: recipe(
      msg("Plan the sound and materials"),
      msg("List the visual and sound material for each shot. Record actual owners, sources, and usage terms as you confirm them."),
      msg("Find the sources for the first shot and record their real use terms before production."),
      {
        fields: [audio],
        context: [brief, script, shots, audio],
        starter: (draft) => ({
          audio: excerpt(draft.fields.script)
            ? "Record a scratch read of the saved script. Leave a short pause between beats, then check whether narration and any background sound compete."
            : "Try a dry narration read at conversational speed. Add sound only when it carries information or supports a transition.",
        }),
      },
    ),
    render: recipe(
      msg("Review the storyboard preview"),
      msg("Use the storyboard preview to check scene order, transitions, and cue timing before production."),
      msg("Play through the cues and return to Storyboard to adjust any unclear beat."),
      { context: [script, shots, motion] },
    ),
    review: recipe(
      msg("Draft a video review checklist"),
      msg("Check whether the viewer can see, hear, and understand the result at normal playback speed. Keep unresolved permissions visible."),
      msg("Watch once without sound and once without looking to find missing information."),
      {
        fields: [{ key: "review", label: msg("Review notes") }],
        context: [brief, script, shots],
        starter: () => ({
          review:
            "Check that the first shot establishes the topic.\nCheck that text can be read at playback speed.\nListen for distracting sound changes.\nRecord any materials or approvals still needed.",
        }),
      },
    ),
    export: recipe(
      msg("Check the video handoff"),
      msg("The draft download contains editable planning choices. Include the materials and their usage terms separately when the recipient needs them."),
      msg("Name the draft clearly and confirm the intended recipient can use the included notes before downloading."),
      { context: [brief, shots] },
    ),
    publish: recipe(
      msg("Draft a post caption"),
      msg("Give readers one reason to watch and describe what is actually in the video."),
      msg("Check the copy against the video and verify credits before using it in a post."),
      {
        fields: [{ key: "caption", label: msg("Post caption") }],
        context: [brief, script],
        starter: (draft) => ({
          caption: titleSubject(draft)
            ? titleSubject(draft) +
              "\n\nWatch for one example you can try yourself. [Add the specific takeaway or next step.]"
            : msg("A short walkthrough of [the topic]. Watch for [the result the video shows], then try [one next step]."),
        }),
      },
    ),
  },
  clipper: {
    source: recipe(
      msg("Plan what to look for"),
      msg("Choose footage you can use and describe the result you want from the clip. Note permissions based on the actual recording and people involved."),
      msg("Open the recording and write a one-sentence goal before preparing source evidence."),
      { context: [clipGoal] },
    ),
    moments: recipe(
      msg("Choose a moment to review"),
      msg("A strong excerpt has a clear beginning and ends after the result. Play the surrounding seconds to check what context the cut would remove."),
      msg("Use the recording to mark in before the action and mark out after the result."),
      { context: [clipGoal] },
    ),
    edit: recipe(
      msg("Draft edit notes"),
      msg("Describe what the editor should keep visible and how captions should fit around the action."),
      msg("Play the selected range with the proposed framing and check the edges at the busiest moment."),
      {
        fields: [cropNotes, captionNotes],
        context: [clipGoal, cropNotes, captionNotes],
        starter: (draft) => ({
          cropNotes: [
            excerpt(draft.fields.clipGoal) &&
              "Use this edit goal when choosing the frame: " + excerpt(draft.fields.clipGoal),
            "Keep the main action and its result in view. Check the frame at the start, middle, and end of the cut.",
          ]
            .filter(Boolean)
            .join("\n"),
          captionNotes:
            "Use brief lines for words verified against the source. Leave space around the main action, and time each line to a natural phrase break.",
        }),
      },
    ),
    review: recipe(
      msg("Draft a clip review checklist"),
      msg("Check that the selected excerpt makes sense in isolation, and review framing, readable captions, audio, and permission."),
      msg("Play the excerpt from the first marked frame and check the ending in context."),
      {
        fields: [{ key: "reviewNotes", label: msg("Review notes") }],
        context: [clipGoal, cropNotes, captionNotes],
        starter: () => ({
          reviewNotes:
            "Watch the first and last frames for abrupt cuts.\nCheck that captions match the recording and leave the action visible.\nListen for sudden audio changes.\nConfirm credits and permission to share.",
        }),
      },
    ),
    export: recipe(
      msg("Choose a clip export"),
      msg("Use a footage export for playback, timed captions as a separate track, or the edit plan for a handoff that preserves decisions."),
      msg("Play the downloaded clip from start to finish in a separate player after rendering."),
      { context: [clipGoal, cropNotes, captionNotes] },
    ),
    publish: recipe(
      msg("Draft a clip caption"),
      msg("Describe the moment shown without implying anything the source cannot establish."),
      msg("Replace the placeholders with details from the selected footage and check publication permission."),
      {
        fields: [{ key: "postCaption", label: msg("Post caption") }],
        context: [clipGoal],
        starter: () => ({
          postCaption:
            "See [what happens in this excerpt] and watch for [one detail viewers can spot]. [Add credit where required.]",
        }),
      },
    ),
  },
  replica: {
    reference: recipe(
      msg("Document a useful observation"),
      msg("Describe an action you actually observed, the conditions around it, and the result. Keep reference location and usage terms in their dedicated fields."),
      msg("Write what happened in your own words and identify one part of the behavior you still need to observe."),
    ),
    brief: recipe(
      msg("Draft a testable behavior"),
      msg("Use a permitted observation to identify a user task. Define a new behavior and one visible outcome someone can check."),
      msg("Replace the scenario prompts with an actual starting state, user action, and expected result."),
      {
        fields: [replicaBrief, scenario],
        context: [replicaBrief, scenario],
        localInputs: ["observation"],
        starter: (draft) => ({
          brief: [
            excerpt(draft.fields.observation) &&
              "Design input from my notes: " + excerpt(draft.fields.observation),
            "Help [audience] complete [one task]. Give them a clear starting point, an understandable action, and a visible result.",
          ]
            .filter(Boolean)
            .join("\n"),
          acceptanceScenario:
            "Given [a specific starting state]\nWhen the user [takes one action]\nThen [one visible result] appears and the user can continue.",
        }),
      },
    ),
    design: recipe(
      msg("Sketch an original interaction"),
      msg("Describe your own controls, layout, copy, and response to a successful or unsuccessful action."),
      msg("Walk through your acceptance scenario using only the controls described in the sketch."),
      {
        fields: [
          { key: "interfaceSketch", label: msg("Interface sketch") },
          { key: "interactionSpec", label: msg("Interaction notes") },
        ],
        context: [replicaBrief, scenario],
        starter: (draft) => ({
          interfaceSketch: [
            excerpt(draft.fields.brief) && "Behavior to support: " + excerpt(draft.fields.brief),
            "Put one clearly labeled action near the information it acts on. Put the feedback in the same area so users can see what changed.",
          ]
            .filter(Boolean)
            .join("\n"),
          interactionSpec:
            "Describe the first focus target, the keyboard path, and the result after activation. Include a retry or recovery action for an empty or failed state.",
        }),
      },
    ),
    export: recipe(
      msg("Check the brief handoff"),
      msg("A collaborator should be able to implement the behavior and check the scenario from the shared brief. Keep private locations and rights notes in the working draft."),
      msg("Inspect the export and include an observation only if you have permission to share it."),
      { context: [replicaBrief, scenario] },
    ),
    prototype: recipe(
      msg("Prepare a prototype test"),
      msg("Write a small acceptance test from your original brief while isolated prototype execution is being developed."),
      msg("Record the minimal starting fixture, one user action, and the visible outcome to check."),
      { context: [replicaBrief, scenario] },
    ),
  },
  "day-trader": {
    "practice-data": recipe(
      msg("Describe the offline dataset"),
      msg("Identify saved or synthetic observations, their provenance, and any gaps. Keep private rows in your local practice material."),
      msg("Record the dataset name, revision, interval, and time zone from your actual source."),
    ),
    rules: recipe(
      msg("Draft offline study rules"),
      msg("Define what the learner observes, what they write down, and when they pause during a manual exercise."),
      msg("Write one observable condition for pausing and check it before revealing each new observation."),
      {
        fields: [
          { key: "practiceRules", label: msg("Practice rules") },
          { key: "practiceLimits", label: msg("When to pause") },
        ],
        starter: () => ({
          practiceRules:
            "Reveal one saved observation at a time. Write down what changed and which part of the study rule you checked before revealing the next one.",
          practiceLimits:
            "Pause if an interval is missing, the order is unclear, or you have already seen the next observation. Record why the exercise paused.",
        }),
      },
    ),
    replay: recipe(
      msg("Set a manual replay checkpoint"),
      msg("Use saved practice material and commit a written observation before you reveal the next row."),
      msg("Choose a real starting row and a checkpoint from your local exercise."),
      {
        fields: [{ key: "replayCheckpoint", label: msg("Replay checkpoint and plan") }],
        localInputs: ["practiceRules"],
        starter: (draft) => ({
          replayCheckpoint: [
            excerpt(draft.fields.practiceRules) &&
              "Study rule to check: " + excerpt(draft.fields.practiceRules),
            "Start at [row or timestamp]. Pause at [checkpoint] and record what you can see before revealing the next row.",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      },
    ),
    journal: recipe(
      msg("Structure a practice reflection"),
      msg("Record what you wrote at the time, compare it with the study rule, and choose one part to practice again."),
      msg("Add one detail from your actual session before choosing a follow-up exercise."),
      {
        fields: [{ key: "nextPractice", label: msg("Next practice exercise") }],
        starter: () => ({
          nextPractice:
            "Repeat the same offline observation exercise with another permitted synthetic sequence. Compare whether you followed the written pause rule before opening the next row.",
        }),
      },
    ),
    export: recipe(
      msg("Review the journal export"),
      msg("The journal contains the study plan and entries you wrote. Check that you can share the notes and dataset reference before handing it off."),
      msg("Inspect the exported JSON and remove any private details before sharing it."),
    ),
  },
  "affiliate-storefront": {
    discover: recipe(
      msg("Plan candidate research"),
      msg("Define one buyer need. For each candidate you find, record a source you opened, the date, and the fact it supports."),
      msg("Add one product you can verify from a source you can revisit."),
    ),
    compare: recipe(
      msg("Set comparison criteria"),
      msg("Compare candidates on one buyer task, one practical constraint, and the quality of the first-hand evidence you can inspect."),
      msg("Check each product against the same criteria before pinning it."),
    ),
    links: recipe(
      msg("Review recommendation copy and links"),
      msg("Describe what each verified product helps a visitor do. Keep the disclosure visible and verify each real destination in the listing."),
      msg("Open each entered destination and confirm it leads to the product named in its card."),
      { context: [affiliateTitle, affiliateIntro] },
    ),
    design: recipe(
      msg("Draft a storefront introduction"),
      msg("Give the storefront a clear title and tell visitors what kind of choice it will help them make."),
      msg("Preview the introduction with the pinned products and remove any claim you cannot support."),
      {
        fields: [affiliateTitle, affiliateIntro],
        context: [affiliateTitle, affiliateIntro],
        starter: (draft) => ({
          "affiliate.title": titleSubject(draft) || "My product shortlist",
          "affiliate.intro":
            draft.affiliate?.style === "catalog"
              ? "Browse the shortlist by product, then check each card for who it suits and what to compare before choosing."
              : "Start with what you need the product to do, then compare the notes for each option to see which fits your situation.",
        }),
      },
    ),
    review: recipe(
      msg("Check the public storefront"),
      msg("Review the exact public title, disclosure, product copy, links, and layout together. Use the private evidence notes to check any factual claim."),
      msg("Check the preview as a visitor before marking the public version approved."),
      { context: [affiliateTitle, affiliateIntro] },
    ),
    export: recipe(
      msg("Choose a storefront handoff"),
      msg("Static HTML is portable. Use Shopify or a custom-stack handoff when someone will integrate the storefront in that destination."),
      msg("Download the approved version for your chosen target and inspect it in that environment before using it."),
      { context: [affiliateTitle, affiliateIntro] },
    ),
  },
};

export function definitionForBuilderStage(draft: StudioDraft): StageRecipeDefinition | undefined {
  const steps: Readonly<Record<string, StageRecipeDefinition>> = recipes[draft.category];
  return Object.hasOwn(steps, draft.stage) ? steps[draft.stage] : undefined;
}
