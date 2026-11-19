import type { AffiliateListing, AffiliatePage } from "./affiliateExport";

export type AffiliateTarget = "static-html" | "shopify" | "custom-stack";
export const affiliateStacks = {
  react: "React / Next.js",
  astro: "Astro",
  sveltekit: "SvelteKit",
  other: "Another stack",
} as const;
export type AffiliateStack = keyof typeof affiliateStacks;

export interface AffiliateCandidate {
  id: string;
  name: string;
  sourceUrl: string;
  buyerFit: string;
  evidenceDate: string;
  evidenceNotes: string;
  pinned: boolean;
  listing: AffiliateListing;
}

export interface AffiliateDraft {
  candidates: AffiliateCandidate[];
  title: string;
  intro: string;
  disclosure: string;
  style: AffiliatePage["style"];
  target: AffiliateTarget;
  stack?: AffiliateStack;
  reviewed: boolean;
}

export const affiliateTargets = {
  "static-html": "Static HTML",
  shopify: "Shopify handoff",
  "custom-stack": "Custom stack handoff",
} satisfies Record<AffiliateTarget, string>;

export const affiliateSheets = {
  discover: "Discover",
  compare: "Compare",
  links: "Links",
  design: "Design",
  review: "Review",
  export: "Export",
};

export type AffiliateStage = keyof typeof affiliateSheets;

export function isAffiliateStage(stage: string): stage is AffiliateStage {
  return Object.hasOwn(affiliateSheets, stage);
}

export function createAffiliateDraft(): AffiliateDraft {
  return {
    candidates: [],
    title: "",
    intro: "",
    disclosure: "",
    style: "editorial",
    target: "static-html",
    reviewed: false,
  };
}

export function createAffiliateCandidate(id: string): AffiliateCandidate {
  return {
    id,
    name: "",
    sourceUrl: "",
    buyerFit: "",
    evidenceDate: "",
    evidenceNotes: "",
    pinned: false,
    listing: { name: "", description: "", href: "" },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCandidate(value: unknown): value is AffiliateCandidate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    typeof value.sourceUrl === "string" &&
    typeof value.buyerFit === "string" &&
    typeof value.evidenceDate === "string" &&
    typeof value.evidenceNotes === "string" &&
    typeof value.pinned === "boolean" &&
    isRecord(value.listing) &&
    typeof value.listing.name === "string" &&
    typeof value.listing.description === "string" &&
    typeof value.listing.href === "string"
  );
}

export function isAffiliateDraft(value: unknown): value is AffiliateDraft {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.intro === "string" &&
    typeof value.disclosure === "string" &&
    typeof value.reviewed === "boolean" &&
    (value.style === "editorial" || value.style === "catalog") &&
    typeof value.target === "string" &&
    Object.hasOwn(affiliateTargets, value.target) &&
    (value.stack === undefined || (typeof value.stack === "string" && Object.hasOwn(affiliateStacks, value.stack))) &&
    Array.isArray(value.candidates) &&
    value.candidates.every(isCandidate) &&
    new Set(value.candidates.map(({ id }) => id)).size === value.candidates.length
  );
}

export function publicAffiliatePage(draft: AffiliateDraft): AffiliatePage {
  return {
    title: draft.title.trim(),
    intro: draft.intro.trim(),
    disclosure: draft.disclosure.trim(),
    style: draft.style,
    products: draft.candidates
      .filter(({ pinned }) => pinned)
      .map(({ listing }) => ({
        name: listing.name.trim(),
        description: listing.description.trim(),
        href: listing.href.trim(),
      })),
  };
}

export function updateAffiliateDraft(
  draft: AffiliateDraft,
  patch: Partial<AffiliateDraft>,
): AffiliateDraft {
  const next = { ...draft, ...patch };
  if (
    next.reviewed &&
    JSON.stringify(publicAffiliatePage(draft)) !== JSON.stringify(publicAffiliatePage(next))
  ) {
    next.reviewed = false;
  }
  return next;
}
