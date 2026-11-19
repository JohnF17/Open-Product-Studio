import { ArrowDownToLine, CirclePlus } from "lucide-react";
import { useId } from "react";

import { randomUUID } from "../../lib/randomUUID";
import {
  type AffiliateCandidate,
  type AffiliateDraft,
  type AffiliateStage,
  type AffiliateStack,
  type AffiliateTarget,
  affiliateStacks,
  affiliateTargets,
  createAffiliateCandidate,
  publicAffiliatePage,
  updateAffiliateDraft,
} from "./affiliateDraft";
import {
  affiliateLinkIsValid,
  type AffiliateListing,
  renderAffiliateHtml,
  renderAffiliateReactComponent,
  renderAffiliateShopifySection,
} from "./affiliateExport";
import type { DraftEditor } from "./drafts";
import { downloadStudioFile } from "./guide";
import "./affiliateStorefront.css";

const descriptions = {
  discover: [
    "Find candidate products",
    "Keep a private research list. Enter product details and evidence you gathered.",
  ],
  compare: [
    "Compare candidates",
    "Compare buyer fit and evidence, then pin products for the storefront.",
  ],
  links: [
    "Set public copy and affiliate links",
    "Write what visitors should see. Paste the destination for each pinned product.",
  ],
  design: [
    "Design the storefront",
    "Choose a layout and decide where the storefront will be delivered.",
  ],
  review: [
    "Review the public storefront",
    "Check the rendered page and approve the public version before export.",
  ],
  export: ["Export the storefront", "Download the approved version to use outside Studio."],
} as const satisfies Record<AffiliateStage, readonly [string, string]>;

const styles = {
  editorial: ["Editorial", "A reading layout for considered recommendations."],
  catalog: ["Catalog", "A grid for scanning several recommendations."],
} as const;

const handoffs = {
  shopify: {
    detail:
      "Give the JSON to the owner or theme editor of a Shopify shop you have permission to edit.",
    steps: [
      "Build a storefront page template in a draft theme using the supplied copy and layout.",
      "Display the affiliate disclosure before the first recommendation and use the supplied URLs as outbound buttons.",
      "Review the draft page on mobile before the shop owner publishes it.",
    ],
  },
  "custom-stack": {
    detail: "Give the JSON to the developer who controls the destination website.",
    steps: [
      "Map the supplied page fields and products into a static route or component.",
      "Render copy as text, validate each HTTPS destination, and place the disclosure before the product links.",
      "Check the page on mobile and test the merchant links before deploying on the site you administer.",
    ],
  },
} as const;

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "date" | "textarea";
  problem?: string | undefined;
};

function Field({ label, value, onChange, type = "text", problem }: FieldProps) {
  const problemId = useId();
  const props = {
    value,
    "aria-invalid": problem ? true : undefined,
    "aria-describedby": problem ? problemId : undefined,
  };
  return (
    <div>
      <label className="ops-field">
        <span>{label}</span>
        {type === "textarea" ? (
          <textarea {...props} rows={3} onChange={(event) => onChange(event.currentTarget.value)} />
        ) : (
          <input {...props} type={type} onChange={(event) => onChange(event.currentTarget.value)} />
        )}
      </label>
      {problem && (
        <p id={problemId} className="ops-affiliate-problem">
          {problem}
        </p>
      )}
    </div>
  );
}

function candidateName(candidate: AffiliateCandidate, index: number) {
  return candidate.name.trim() || `Candidate ${index + 1}`;
}

export function AffiliateStorefrontSheet({
  stage,
  affiliate,
  editor,
}: {
  stage: AffiliateStage;
  affiliate: AffiliateDraft;
  editor: DraftEditor;
}) {
  function patch(patch: Partial<AffiliateDraft>) {
    const current = editor.snapshot().draft.affiliate;
    if (current) editor.update({ affiliate: updateAffiliateDraft(current, patch) });
  }
  function changeCandidate(id: string, changes: Partial<AffiliateCandidate>) {
    const current = editor.snapshot().draft.affiliate;
    if (current)
      patch({
        candidates: current.candidates.map((candidate) =>
          candidate.id === id ? { ...candidate, ...changes } : candidate,
        ),
      });
  }
  function changeListing(id: string, key: keyof AffiliateListing, value: string) {
    const candidate = editor
      .snapshot()
      .draft.affiliate?.candidates.find((entry) => entry.id === id);
    if (candidate) changeCandidate(id, { listing: { ...candidate.listing, [key]: value } });
  }
  const [heading, detail] = descriptions[stage];
  const pinned = affiliate.candidates.filter((candidate) => candidate.pinned);
  return (
    <>
      <div className="ops-step-head">
        <h2 tabIndex={-1}>{heading}</h2>
        <p>{detail}</p>
      </div>
      <div className="ops-affiliate">
        {stage === "discover" && (
          <>
            {affiliate.candidates.length === 0 && (
              <p className="ops-note">Add the first product you want to evaluate.</p>
            )}
            {affiliate.candidates.map((candidate, index) => (
              <fieldset key={candidate.id} className="ops-affiliate-entry">
                <legend>{candidateName(candidate, index)}</legend>
                <div className="ops-affiliate-fields">
                  <Field
                    label={`Candidate name ${index + 1}`}
                    value={candidate.name}
                    onChange={(name) => changeCandidate(candidate.id, { name })}
                  />
                  <Field
                    label={`Source URL ${index + 1}`}
                    value={candidate.sourceUrl}
                    type="url"
                    onChange={(sourceUrl) => changeCandidate(candidate.id, { sourceUrl })}
                  />
                  <Field
                    label={`Buyer fit ${index + 1}`}
                    value={candidate.buyerFit}
                    type="textarea"
                    onChange={(buyerFit) => changeCandidate(candidate.id, { buyerFit })}
                  />
                </div>
                <details className="ops-affiliate-details">
                  <summary>{`Evidence for candidate ${index + 1}`}</summary>
                  <div className="ops-affiliate-fields">
                    <Field
                      label={`Evidence date ${index + 1}`}
                      value={candidate.evidenceDate}
                      type="date"
                      onChange={(evidenceDate) => changeCandidate(candidate.id, { evidenceDate })}
                    />
                    <Field
                      label={`Evidence notes ${index + 1}`}
                      value={candidate.evidenceNotes}
                      type="textarea"
                      onChange={(evidenceNotes) => changeCandidate(candidate.id, { evidenceNotes })}
                    />
                  </div>
                  <button
                    type="button"
                    className="ops-link"
                    aria-label={`Remove candidate ${index + 1}`}
                    onClick={() =>
                      patch({
                        candidates: affiliate.candidates.filter(({ id }) => id !== candidate.id),
                      })
                    }
                  >
                    Remove candidate
                  </button>
                </details>
              </fieldset>
            ))}
            <div>
              <button
                type="button"
                className="ops-button"
                onClick={() =>
                  patch({
                    candidates: [...affiliate.candidates, createAffiliateCandidate(randomUUID())],
                  })
                }
              >
                <CirclePlus size={16} /> Add candidate
              </button>
            </div>
          </>
        )}
        {stage === "compare" && (
          <>
            <p className="ops-affiliate-muted" role="status">
              {pinned.length} of {affiliate.candidates.length} pinned
            </p>
            {affiliate.candidates.length === 0 && (
              <p className="ops-note">Go to Discover to add candidates.</p>
            )}
            {affiliate.candidates.map((candidate, index) => (
              <article key={candidate.id} className="ops-affiliate-compare">
                <div className="ops-affiliate-row">
                  <h3>{candidateName(candidate, index)}</h3>
                  <label className="ops-affiliate-check">
                    <input
                      type="checkbox"
                      aria-label={`Pin ${candidateName(candidate, index)}`}
                      checked={candidate.pinned}
                      onChange={(event) =>
                        changeCandidate(candidate.id, { pinned: event.currentTarget.checked })
                      }
                    />
                    Pin
                  </label>
                </div>
                <p>{candidate.buyerFit.trim() || "Buyer fit still to be recorded."}</p>
                {candidate.evidenceDate && (
                  <p className="ops-affiliate-muted">Evidence dated {candidate.evidenceDate}</p>
                )}
                {candidate.evidenceNotes && (
                  <p className="ops-affiliate-notes">{candidate.evidenceNotes}</p>
                )}
                {candidate.sourceUrl && (
                  <details className="ops-affiliate-details">
                    <summary>Source URL</summary>
                    <p className="ops-affiliate-muted">{candidate.sourceUrl}</p>
                  </details>
                )}
              </article>
            ))}
          </>
        )}
        {stage === "links" && (
          <>
            {pinned.length === 0 ? (
              <p className="ops-note">
                Pin at least one candidate on Compare to add its public listing.
              </p>
            ) : (
              <>
                <p className="ops-affiliate-muted">
                  Use the affiliate URLs issued to you by a merchant or affiliate network. Program
                  enrollment and website access are separate.
                </p>
                {pinned.map((candidate, index) => (
                  <fieldset key={candidate.id} className="ops-affiliate-entry">
                    <legend>{candidate.name.trim() || `Pinned product ${index + 1}`}</legend>
                    <div className="ops-affiliate-fields">
                      <Field
                        label="Public product name"
                        value={candidate.listing.name}
                        onChange={(value) => changeListing(candidate.id, "name", value)}
                      />
                      <Field
                        label="Public recommendation (optional)"
                        value={candidate.listing.description}
                        type="textarea"
                        onChange={(value) => changeListing(candidate.id, "description", value)}
                      />
                      <Field
                        label="Affiliate destination URL"
                        value={candidate.listing.href}
                        type="url"
                        problem={
                          candidate.listing.href.trim() &&
                          !affiliateLinkIsValid(candidate.listing.href.trim())
                            ? "Enter a valid HTTPS affiliate URL."
                            : undefined
                        }
                        onChange={(value) => changeListing(candidate.id, "href", value)}
                      />
                    </div>
                  </fieldset>
                ))}
              </>
            )}
            <Field
              label="Public affiliate disclosure"
              value={affiliate.disclosure}
              type="textarea"
              onChange={(disclosure) => patch({ disclosure })}
            />
          </>
        )}
        {stage === "design" && (
          <>
            <Field
              label="Public storefront title"
              value={affiliate.title}
              onChange={(title) => patch({ title })}
            />
            <Field
              label="Public introduction (optional)"
              value={affiliate.intro}
              type="textarea"
              onChange={(intro) => patch({ intro })}
            />
            <fieldset className="ops-affiliate-style">
              <legend>Visual style</legend>
              <div className="ops-affiliate-style-options">
                {(["editorial", "catalog"] as const).map((style) => (
                  <button
                    type="button"
                    key={style}
                    className="ops-style"
                    aria-pressed={style === affiliate.style}
                    onClick={() => patch({ style })}
                  >
                    <span className="ops-affiliate-swatch" data-style={style} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      <strong>{styles[style][0]}</strong>
                      <small>{styles[style][1]}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="ops-field">
              <span>Delivery target</span>
              <select
                value={affiliate.target}
                onChange={(event) =>
                  patch({ target: event.currentTarget.value as AffiliateTarget })
                }
              >
                {Object.entries(affiliateTargets).map(([target, label]) => (
                  <option key={target} value={target}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {affiliate.target === "custom-stack" && (
              <label className="ops-field">
                <span>Site stack</span>
                <select value={affiliate.stack ?? "react"}
                  onChange={(event) => patch({ stack: event.currentTarget.value as AffiliateStack })}>
                  {Object.entries(affiliateStacks).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
              </label>
            )}
          </>
        )}
        {(stage === "review" || stage === "export") && (
          <PublicStorefront
            stage={stage}
            affiliate={affiliate}
            onReview={(reviewed) => patch({ reviewed })}
          />
        )}
      </div>
    </>
  );
}

function PublicStorefront({
  stage,
  affiliate,
  onReview,
}: {
  stage: "review" | "export";
  affiliate: AffiliateDraft;
  onReview: (reviewed: boolean) => void;
}) {
  const page = publicAffiliatePage(affiliate);
  const missing = [
    !page.title && "Enter a public storefront title on Design.",
    !page.disclosure && "Enter a public affiliate disclosure on Links.",
    !page.products.length && "Pin at least one candidate on Compare.",
    page.products.some(({ name }) => !name) && "Complete public product names on Links.",
    page.products.some(({ href }) => !affiliateLinkIsValid(href)) &&
      "Enter a valid HTTPS destination for every pinned product on Links.",
  ].filter(Boolean);
  let html: string | undefined;
  if (missing.length === 0) {
    try {
      html = renderAffiliateHtml(page);
    } catch {
      missing.push("Check the public fields on Links and Design. The page could not be rendered.");
    }
  }
  if (stage === "review") {
    return html ? (
      <>
        <iframe
          className="ops-affiliate-preview"
          title="Public storefront preview"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={html}
        />
        <label className="ops-affiliate-check">
          <input
            type="checkbox"
            checked={affiliate.reviewed}
            onChange={(event) => onReview(event.currentTarget.checked)}
          />
          Approve this public version
        </label>
      </>
    ) : (
      <div className="ops-affiliate-compare">
        <h3>Complete these items to preview the storefront</h3>
        <ul className="ops-affiliate-list">
          {missing.map((item) => (
            <li key={String(item)}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  const target = affiliate.target;
  const handoff = target === "static-html" ? undefined : handoffs[target];
  const ready = !!html && affiliate.reviewed;
  function download() {
    if (!html || !affiliate.reviewed) return;
    if (!handoff) {
      downloadStudioFile(
        new Blob([html], { type: "text/html;charset=utf-8" }),
        page.title,
        ".html",
      );
      return;
    }
    const data = {
      schema: "studio-affiliate-handoff/1",
      target,
      ...(target === "custom-stack" ? { stack: affiliateStacks[affiliate.stack ?? "react"] } : {}),
      page,
      linkRel: "sponsored nofollow noopener",
      prerequisites:
        "Verify program enrollment and use the URLs issued to you. Obtain separate permission to edit the destination site.",
      instructions: handoff.steps,
    };
    downloadStudioFile(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      page.title,
      ` - ${target} handoff.json`,
    );
  }
  const downloadLabel = handoff ? `Download ${affiliateTargets[target]}` : "Download HTML";
  const shopify = target === "shopify";
  const react = target === "custom-stack" && (affiliate.stack ?? "react") === "react";
  function downloadSource() {
    if (!ready || (!shopify && !react)) return;
    const source = shopify ? renderAffiliateShopifySection(page) : renderAffiliateReactComponent(page);
    downloadStudioFile(
      new Blob([source], { type: "text/plain;charset=utf-8" }),
      shopify ? "affiliate-collection" : "AffiliateStorefront",
      shopify ? ".liquid" : ".tsx",
    );
  }
  return (
    <>
      <div className="ops-affiliate-compare">
        <h3>{affiliateTargets[target]}</h3>
        <p>
          {handoff?.detail ?? "Save the self-contained page for hosting on a site you control."}
        </p>
        {shopify && <p>In a duplicate Shopify theme, add the downloaded file under <code>sections/affiliate-collection.liquid</code>. In the theme editor, add the Affiliate collection section to a page and preview it before publishing.</p>}
        {react && <p>Import the downloaded component into a page in your React or Next.js project. It includes the reviewed copy, links and styles.</p>}
        {target === "custom-stack" && !react && <p>The handoff includes the reviewed copy, links and layout for the stack you selected. Choose Static HTML on Design for a ready-to-host page.</p>}
        {handoff && (
          <details className="ops-affiliate-details">
            <summary>Handoff instructions</summary>
            <ol className="ops-affiliate-list">
              {handoff.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </details>
        )}
        <p className="ops-affiliate-muted">
          Verify your affiliate-program enrollment and merchant-issued links separately from your
          permission to publish on the destination site.
        </p>
      </div>
      {!ready && (
        <p className="ops-note">
          Complete and approve the public version on Review to enable download.
        </p>
      )}
      <div>
        {(shopify || react) && <button type="button" className="ops-button ops-primary"
          disabled={!ready} onClick={downloadSource}>
          <ArrowDownToLine size={16} /> {shopify ? "Download Shopify section" : "Download React component"}
        </button>}
        <button
          type="button"
          className={shopify || react ? "ops-button" : "ops-button ops-primary"}
          disabled={!ready}
          onClick={download}
        >
          <ArrowDownToLine size={16} /> {downloadLabel}
        </button>
      </div>
    </>
  );
}
