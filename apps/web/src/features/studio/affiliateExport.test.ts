import { expect, it } from "vite-plus/test";
import {
  affiliateLinkIsValid, renderAffiliateHtml, renderAffiliateReactComponent, renderAffiliateShopifySection, type AffiliatePage,
} from "./affiliateExport";

const page: AffiliatePage = {
  title: "The field desk",
  intro: "Tools for field notes.",
  disclosure: "I may earn a commission when you buy through these links.",
  style: "editorial",
  products: [{ name: "Pocket notebook", description: "A sewn binding.", href: "https://shop.example/item?tag=a%2Fb&ref=two" }],
};

it("exports the selected public copy, disclosures and exact affiliate destination", () => {
  const html = renderAffiliateHtml(page);
  expect(html).toContain('lang="en"');
  expect(html).toContain("Pocket notebook");
  expect(html).toContain(page.disclosure);
  expect(html).toContain('href="https://shop.example/item?tag=a%2Fb&amp;ref=two"');
  expect(html).toContain('rel="sponsored nofollow noopener"');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("src=");
  expect(renderAffiliateHtml({ ...page, style: "catalog" })).toContain('class="studio-affiliate catalog"');
});

it("keeps authored template text inert and produces a named Shopify section preset", () => {
  const section = renderAffiliateShopifySection({ ...page, title: "Notes {{ collection.title }} {% endschema %}" });
  expect(section).not.toContain("{{ collection.title }}");
  expect(section.split("{% endschema %}")).toHaveLength(2);
  const schema = section.match(/{% schema %}([\s\S]*?){% endschema %}/)![1]!;
  expect(JSON.parse(schema).presets).toEqual([{ name: "Affiliate collection" }]);
  expect(section).toContain("&amp;ref=two");
});

it("exports ordinary React JSX using only the approved storefront fields", () => {
  const candidate = { ...page.products[0]!, name: "</script> notebook", evidenceNotes: "Private supplier note" };
  const component = renderAffiliateReactComponent({ ...page, products: [candidate] });
  expect(component).toContain("export default function AffiliateStorefront()");
  expect(component).not.toContain("dangerouslySetInnerHTML");
  expect(component).not.toContain("</script>");
  expect(component).not.toContain(candidate.evidenceNotes);
  expect(component).toContain(candidate.href);
});

it("treats creator copy as text and leaves private data outside the exported page", () => {
  const candidate = { ...page.products[0]!, name: '<b title="x">Paper</b>', privateNotes: "Unpublished cost assumptions" };
  const html = renderAffiliateHtml({ ...page, title: "Paper & Ink", products: [candidate] });
  expect(html).toContain("&lt;b title=&quot;x&quot;&gt;Paper&lt;/b&gt;");
  expect(html).toContain("Paper &amp; Ink");
  expect(html).not.toContain(candidate.privateNotes);
});

it.each(["", "/item", "https:shop.example", "http://shop.example", "javascript:void(0)",
  "https://name:password@shop.example/item", "https://shop.example\\other", "https://127.0.0.1/a",
  "https://[::1]/x", "https://localhost/x", "https://shop.localhost/x", "https://shop.example/a\nb",
  "https://..", "https://a..b/product", "https://shop.home.arpa/product"])(
  "rejects an unsuitable public product destination: %s", (href) => {
    expect(affiliateLinkIsValid(href)).toBe(false);
    expect(() => renderAffiliateHtml({ ...page, products: [{ ...page.products[0]!, href }] })).toThrow();
  },
);

it("requires a title, disclosure and at least one named product", () => {
  for (const invalid of [{ ...page, title: " " }, { ...page, disclosure: "" }, { ...page, products: [] },
    { ...page, products: [{ ...page.products[0]!, name: " " }] }]) {
    expect(() => renderAffiliateHtml(invalid)).toThrow();
  }
});
