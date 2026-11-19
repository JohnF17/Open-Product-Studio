export interface AffiliateListing {
  name: string;
  description: string;
  href: string;
}

export interface AffiliatePage {
  title: string;
  intro: string;
  disclosure: string;
  style: "editorial" | "catalog";
  products: AffiliateListing[];
}

/** Check the written destination locally. Program membership and link ownership are separate. */
export function affiliateLinkIsValid(value: string): boolean {
  if (typeof value !== "string" || !/^https:\/\/[^/?#]/i.test(value) || /[\s\\]/u.test(value)) return false;
  if (Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/\.$/, "");
    const labels = host.split(".");
    if (labels.length < 2 || host.length > 253 || labels.some((label) =>
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return false;
    return !url.username && !url.password && !value.slice(8).split(/[/?#]/, 1)[0]?.includes("@")
      && !/^\d+(\.\d+){3}$/.test(host) && !/(?:^|\.)(localhost|local|internal|home\.arpa)$/i.test(host);
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("{", "&#123;").replaceAll("}", "&#125;");
}

// Keep the file portable. Both layouts use local fonts and require no network resources.
const storefrontCss = `
.studio-affiliate {
box-sizing:border-box; color-scheme:light; color:var(--ink); background:var(--paper); font:1rem/1.55 system-ui,sans-serif; overflow-wrap:anywhere;
& * { box-sizing: border-box; }
&.editorial { --paper:#faf7ef; --ink:#30281f; --muted:#635749; --accent:#813a28; --rule:#bcb09e; --display:Georgia,serif; }
&.catalog { --paper:#f3f6fb; --ink:#182641; --muted:#475773; --accent:#204aa5; --rule:#adbcd2; --display:system-ui,sans-serif; }
.collection { width:min(100% - 2.5rem,68rem); margin:0 auto; padding:clamp(2rem,7vw,6rem) 0; }
header { border-block:5px solid var(--ink); padding:clamp(1.5rem,4vw,3.5rem) 0; }
h1,h2,p { margin:0; }
h1 { font:normal clamp(2.6rem,8vw,6rem)/1 var(--display); letter-spacing:-.045em; }
header p { margin-top:1rem; max-width:56ch; font-size:clamp(1.05rem,2vw,1.4rem); color:var(--muted); }
section { margin-top:clamp(1rem,3vw,2rem); }
article { min-width:0; }
h2 { font:normal clamp(1.65rem,4vw,2.8rem)/1.12 var(--display); }
.copy { max-width:56ch; margin-top:.7rem; white-space:pre-line; }
&.editorial article { padding:2rem 0; border-bottom:1px solid var(--rule); display:grid; grid-template-columns:minmax(0,3fr) minmax(13rem,1.1fr); gap:2rem; }
&.catalog header { border:0; border-left:.45rem solid var(--accent); padding-left:clamp(1rem,4vw,2.25rem); }
&.catalog h1,&.catalog h2 { font-weight:700; }
&.catalog section { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr)); gap:1rem; }
&.catalog article { padding:clamp(1.25rem,3vw,2rem); background:#fff; border:1px solid var(--rule); border-radius:1rem; display:flex; flex-direction:column; gap:1.5rem; justify-content:space-between; }
.buy { display:flex; flex-direction:column; justify-content:flex-end; align-items:flex-start; gap:.65rem; }
.disclosure { font-size:.875rem; line-height:1.45; color:var(--muted); white-space:pre-line; }
a { display:inline-flex; align-items:center; justify-content:space-between; gap:1rem; max-width:100%; min-height:44px; padding:.65rem 1rem; background:var(--accent); color:white; text-decoration:none; font-weight:600; }
&.catalog a { border-radius:.5rem; }
a:hover { text-decoration:underline; } a:focus-visible { outline:3px solid var(--ink); outline-offset:4px; }
@media (max-width:42rem) { &.editorial article { grid-template-columns:1fr; gap:1rem; } }
@media print { .collection { width:auto; padding:0; } article { break-inside:avoid; } a { background:transparent; color:black; } }
}
`;

function validateAffiliatePage(page: AffiliatePage): void {
  if (!page.title.trim() || !page.disclosure.trim() || !page.products.length) {
    throw new Error("Add a storefront title, affiliate disclosure and at least one product.");
  }
  if (page.products.some(({ name, href }) => !name.trim() || !affiliateLinkIsValid(href))) {
    throw new Error("Each product needs a name and a public HTTPS affiliate destination.");
  }
}

function storefrontMarkup(page: AffiliatePage): string {
  validateAffiliatePage(page);
  const disclosure = escapeHtml(page.disclosure.trim());
  const cards = page.products.map(({ name, description, href }) => {
    const label = escapeHtml(name.trim());
    const merchant = escapeHtml(new URL(href).hostname);
    return `<article>
  <div><h2>${label}</h2>${description.trim() ? `<p class="copy">${escapeHtml(description.trim())}</p>` : ""}</div>
  <div class="buy"><p class="disclosure">${disclosure}</p>
    <a href="${escapeHtml(href)}" target="_blank" rel="sponsored nofollow noopener" aria-label="View ${label} at ${merchant}">View at ${merchant} <span aria-hidden="true">↗</span></a>
  </div></article>`;
  });
  const theme = page.style === "catalog" ? "catalog" : "editorial";
  return `<div class="studio-affiliate ${theme}"><div class="collection"><header><h1>${escapeHtml(page.title.trim())}</h1>
${page.intro.trim() ? `<p>${escapeHtml(page.intro.trim())}</p>` : ""}</header>
<section aria-label="Selected products">${cards.join("\n")}</section></div></div>`;
}

export function renderAffiliateHtml(page: AffiliatePage): string {
  const markup = storefrontMarkup(page);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(page.title.trim())}</title><style>body { margin:0; } main > .studio-affiliate { min-height:100vh; }${storefrontCss}</style></head>
<body><main>${markup}</main></body></html>`;
}

/** A section for an authorized theme editor to add to an unpublished theme and preview. */
export function renderAffiliateShopifySection(page: AffiliatePage): string {
  return `<style>${storefrontCss}</style>
${storefrontMarkup(page)}
{% schema %}
{"name":"Affiliate collection","settings":[],"presets":[{"name":"Affiliate collection"}]}
{% endschema %}\n`;
}

/** A dependency-free component for an existing React project using the automatic JSX transform. */
export function renderAffiliateReactComponent(page: AffiliatePage): string {
  validateAffiliatePage(page);
  const content = {
    title: page.title.trim(),
    intro: page.intro.trim(),
    style: page.style === "catalog" ? "catalog" : "editorial",
    disclosure: page.disclosure.trim(),
    products: page.products.map(({ name, description, href }) => ({
      name: name.trim(), description: description.trim(), href, merchant: new URL(href).hostname,
    })),
  };
  const literal = JSON.stringify(content, null, 2).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
  return `const page = ${literal};
const css = ${JSON.stringify(storefrontCss)};

export default function AffiliateStorefront() {
  return (
    <div className={"studio-affiliate " + page.style}>
      <style>{css}</style>
      <div className="collection">
        <header><h1>{page.title}</h1>{page.intro && <p>{page.intro}</p>}</header>
        <section aria-label="Selected products">
          {page.products.map((item, index) => (
            <article key={index}>
              <div><h2>{item.name}</h2>{item.description && <p className="copy">{item.description}</p>}</div>
              <div className="buy">
                <p className="disclosure">{page.disclosure}</p>
                <a href={item.href} target="_blank" rel="sponsored nofollow noopener" aria-label={"View " + item.name + " at " + item.merchant}>
                  View at {item.merchant} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}\n`;
}
