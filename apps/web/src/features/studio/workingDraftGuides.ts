import { type Category, type WorkingCategory, type stages } from "./drafts";

interface DraftField {
  key: string;
  label: string;
  example: string;
  singleLine?: boolean;
}

interface WorkingSheet {
  label: string;
  title: string;
  detail: string;
  fields?: readonly DraftField[];
  advanced?: { label: string; fields: readonly DraftField[] };
  references?: readonly DraftField[];
  optional?: boolean;
}

interface WorkingGuide {
  kind: string;
  download: string;
  agentScope?: string;
  sheets: Readonly<Record<string, WorkingSheet | undefined>>;
}

const clipperSource = [
  {
    key: "sourceNote",
    label: "Reference recording",
    example: "Workshop walkthrough, take 2. The original is in my recordings folder.",
  },
  {
    key: "sourceRights",
    label: "Permission and use limits",
    example: "I filmed it. Ask the guest before sharing their voice or face.",
  },
];
const clipperMarks = [
  { key: "markIn", label: "Mark in", example: "00:12", singleLine: true },
  { key: "markOut", label: "Mark out", example: "00:29", singleLine: true },
] as const;
const clipperMoment = [
  ...clipperMarks,
  {
    key: "momentRationale",
    label: "Why this moment?",
    example: "The instructor shows the full knot in one continuous shot.",
  },
];
const clipperEdit = [
  {
    key: "cropNotes",
    label: "Crop and framing",
    example: "9:16 portrait. Keep both hands in frame during the close-up.",
  },
  {
    key: "captionNotes",
    label: "Caption notes",
    example: "At 00:16 add “Pull both ends evenly.” Leave the knot visible.",
  },
];
const clipperStyle = [
  {
    key: "styleNotes",
    label: "Style notes",
    example: "Use large white captions on a dark backing. Hold on the finished knot.",
  },
  {
    key: "audioNotes",
    label: "Audio notes",
    example: "Keep the spoken instruction. Lower the room noise during the pause.",
  },
];

const replicaReference = [
  {
    key: "referenceNote",
    label: "Reference and location",
    example: "My workshop signup notes, page 2, under “Finding a session.”",
  },
  {
    key: "observation",
    label: "Observed behavior",
    example: "Participants checked the level before opening session details.",
  },
  {
    key: "referenceRights",
    label: "Rights and use limits",
    example: "I can use my notes for planning. Use original copy and assets.",
  },
];
const replicaBrief = [
  {
    key: "brief",
    label: "Proposed behavior",
    example: "Let a learner filter upcoming workshops by skill level and clear the filter.",
  },
  {
    key: "acceptanceScenario",
    label: "Acceptance scenario",
    example: "When no beginner sessions are available, explain why and offer Clear filter.",
  },
];
const replicaDesign = [
  {
    key: "interfaceSketch",
    label: "Interface sketch",
    example: "Put a filter row above the list. Show an empty state in the list area.",
  },
  {
    key: "interactionSpec",
    label: "Interaction notes",
    example: "Keep focus on the selected filter and announce the updated result count.",
  },
];

const practiceData = [
  {
    key: "datasetReference",
    label: "Practice dataset reference",
    example: "Synthetic workshop series, revision B, saved with my study materials.",
  },
  {
    key: "datasetProvenance",
    label: "Data provenance and permitted use",
    example: "Created by the course author for offline exercises. Keep input rows private.",
  },
];
const practiceRules = [
  {
    key: "practiceRules",
    label: "Practice rules",
    example: "Reveal one saved bar at a time. Write down what changed before continuing.",
  },
  {
    key: "practiceLimits",
    label: "When to pause",
    example: "Pause if a timestamp is missing or if I already saw the next bar.",
  },
];
const practiceReplay = [
  {
    key: "replayCheckpoint",
    label: "Replay checkpoint and plan",
    example: "Start at bar 1. At bar 5, pause to compare the timestamps with my rule.",
  },
  {
    key: "practiceDecision",
    label: "Practice decision",
    example: "Pause at the first gap. Record the gap before looking ahead.",
  },
  {
    key: "decisionReason",
    label: "Reason for the decision",
    example: "The missing interval makes the sequence hard to interpret.",
  },
];

const guides: {
  [C in WorkingCategory]: WorkingGuide & {
    sheets: Record<(typeof stages)[C][number], WorkingSheet>;
  };
} = {
  clipper: {
    kind: "edit-plan",
    download: "Download edit plan",
    agentScope: "Help make the written clip plan clearer for an editor.",
    sheets: {
      source: {
        label: "Source",
        title: "Note your source recording",
        detail: "Describe a recording you can use. Studio saves the note locally. Media import is planned for M2.",
        fields: clipperSource,
      },
      moments: {
        label: "Moment",
        title: "Mark one moment",
        detail: "Use the recording’s own timecodes. Choose a range that makes sense on its own.",
        fields: clipperMoment,
        references: clipperSource,
      },
      edit: {
        label: "Edit notes",
        title: "Describe the cut",
        detail: "Write instructions for framing and captions so you can apply them during editing.",
        fields: clipperEdit,
        advanced: { label: "Style and audio", fields: clipperStyle },
        references: clipperMoment,
      },
      review: {
        label: "Review",
        title: "Review your edit plan",
        detail: "Check that the end follows the start and the excerpt preserves context. Review caption placement, audio and permission to share.",
        fields: [
          {
            key: "reviewNotes",
            label: "Review notes",
            example: "Check that the captions clear the hands. Confirm the guest’s permission before sharing.",
          },
        ],
        references: [...clipperSource, ...clipperMoment, ...clipperEdit, ...clipperStyle],
      },
      export: {
        label: "Edit-plan export",
        title: "Export your edit plan",
        detail: "Download your source note, timecodes and edit instructions as JSON. Video rendering and playable exports are planned for M4A.",
      },
      publish: {
        label: "Publishing prep",
        title: "Prepare a possible post",
        detail: "Draft a caption and record what needs approval. Return to Edit-plan export to include these notes in the download. Connected publishing is planned for M4C.",
        fields: [
          {
            key: "postCaption",
            label: "Post caption",
            example: "Here’s the knot that kept our workshop project together.",
          },
        ],
        advanced: {
          label: "Destination and approval",
          fields: [
            {
              key: "publicationNotes",
              label: "Destination and approval notes",
              example: "Workshop group recap. Confirm guest permission and credit the instructor.",
            },
          ],
        },
        optional: true,
      },
    },
  },
  replica: {
    kind: "design-brief",
    download: "Download design brief",
    agentScope: "Help clarify an original behavior brief or make its requirements easier to test.",
    sheets: {
      reference: {
        label: "Observation and rights",
        title: "Record a permitted observation",
        detail: "Start from material you have permission to use. Describe the behavior you saw and where you recorded it.",
        fields: replicaReference,
        advanced: {
          label: "Open questions",
          fields: [
            {
              key: "observationGaps",
              label: "What remains unclear?",
              example: "I haven’t observed how the flow behaves when a session fills up.",
            },
          ],
        },
      },
      brief: {
        label: "Behavior brief",
        title: "Write an original behavior brief",
        detail: "Describe the task your own design should support and give one way to check that it works.",
        fields: replicaBrief,
        references: replicaReference,
      },
      design: {
        label: "Interface sketch",
        title: "Sketch the interface in words",
        detail: "Describe your own layout, text and controls. Include what the user sees when the list is empty or an action fails.",
        fields: replicaDesign,
        references: replicaBrief,
      },
      export: {
        label: "Brief export",
        title: "Export your design brief",
        detail: "Share the proposed behavior, acceptance scenario and original sketch. The source location and private permissions stay in your working draft.",
      },
      prototype: {
        label: "Prototype",
        title: "Build an isolated prototype",
        detail: "Planned for M6B (WP41). This later step uses approved local fixtures in an isolated workspace. Your brief is available to edit and export now.",
        optional: true,
      },
    },
  },
  "day-trader": {
    kind: "practice-journal",
    download: "Download practice journal",
    sheets: {
      "practice-data": {
        label: "Practice data",
        title: "Describe your offline practice data",
        detail: "Record the saved practice material you plan to use and where it came from. Dataset import and offline replay are planned for M6B.",
        fields: practiceData,
        advanced: {
          label: "Dataset details",
          fields: [
            {
              key: "datasetDetails",
              label: "Revision and time range",
              example: "Revision B, 20 synthetic bars at five-minute intervals, timestamps in UTC.",
            },
          ],
        },
      },
      rules: {
        label: "Practice rules",
        title: "Set rules for the study",
        detail: "Write the rules you’ll follow when reviewing the saved observations by hand.",
        fields: practiceRules,
        references: practiceData,
      },
      replay: {
        label: "Manual replay plan",
        title: "Plan a manual replay",
        detail: "Use your saved practice material outside this sheet. Entries are decisions you write by hand. Simulated orders and engine-generated fills are part of the later M6B replay engine.",
        fields: practiceReplay,
        references: practiceRules,
      },
      journal: {
        label: "Journal",
        title: "Journal your practice",
        detail: "Compare the decision you wrote with the rules you set. Record what you learned and what to practice again.",
        fields: [
          {
            key: "journalNotes",
            label: "Journal notes",
            example: "I spotted the timestamp gap before seeing the next bar. I nearly skipped the pause.",
          },
          {
            key: "nextPractice",
            label: "Next practice exercise",
            example: "Repeat with another synthetic series and check every timestamp.",
          },
        ],
        references: [...practiceData, ...practiceRules, ...practiceReplay],
      },
      export: {
        label: "Journal export",
        title: "Export your practice journal",
        detail: "Download the study plan, data provenance, rules and decisions you entered as JSON. Engine-generated orders and fills belong to the later replay results.",
      },
    },
  },
};

export function workingGuide(category: Category): WorkingGuide | undefined {
  if (category === "clipper" || category === "replica" || category === "day-trader") {
    return guides[category];
  }
}
