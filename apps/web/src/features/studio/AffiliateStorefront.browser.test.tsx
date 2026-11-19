import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace, { type StudioAgentRequest } from "./StudioWorkspace";

it("hands off only the question the creator chooses to put in the T3 composer", async () => {
  const onAskAgent = vi.fn(async (_request: StudioAgentRequest) => {});
  await using screen = await render(
    <StudioWorkspace workspaceId={randomUUID()} onAskAgent={onAskAgent} />,
    { router: false },
  );
  await screen.getByRole("button", { name: /^Affiliate Storefront/ }).click();
  await screen.getByRole("textbox", { name: "Project name" }).fill("Private buying hypothesis");
  await screen.getByRole("button", { name: "Add candidate" }).click();
  await screen.getByRole("textbox", { name: "Source URL 1" }).fill("https://source.example/private-draft");
  await screen.getByText("Ask AI to research products", { exact: true }).click();
  const prepare = screen.getByRole("button", { name: "Prepare research question" });
  await expect.element(prepare).toBeDisabled();
  const question = "Compare pocket notebooks for rainy hikes and show dated sources.";
  await screen.getByRole("textbox", { name: "Research question" }).fill(question);
  expect(onAskAgent).not.toHaveBeenCalled();
  await prepare.click();
  await expect.element(screen.getByText("Question opened in the composer.")).toBeVisible();
  expect(onAskAgent).toHaveBeenCalledTimes(1);
  const { prompt } = onAskAgent.mock.calls[0]![0];
  expect(JSON.parse(prompt.split("\n").at(-1)!)).toEqual({ question });
  expect(prompt).not.toMatch(/Private buying hypothesis|source\.example/);
});

it("resumes a storefront, previews only public content, and downloads the approved HTML", async () => {
  const workspaceId = randomUUID();
  const onAskAgent = vi.fn(async () => {});
  const container = document.createElement("div");
  container.style.width = "320px";
  await using screen = await render(
    <StudioWorkspace workspaceId={workspaceId} onAskAgent={onAskAgent} />,
    {
      container,
      router: false,
    },
  );
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const field = (name: string) => screen.getByRole("textbox", { name, exact: true });
  const next = () => button("Next").click();
  await button(/^Affiliate Storefront/).click();
  await expect.element(button("Ask agent for options")).not.toBeInTheDocument();
  await expect
    .element(screen.getByRole("heading", { name: "Find candidate products" }))
    .toBeVisible();
  await field("Project name").fill("Internal research");
  await button("Add candidate").click();
  await field("Candidate name 1").fill("Private reference");
  await field("Source URL 1").fill("https://source.example/private");
  await field("Buyer fit 1").fill("Internal fit note");
  await screen.getByText("Evidence for candidate 1", { exact: true }).click();
  await screen.getByLabelText("Evidence date 1", { exact: true }).fill("2026-11-19");
  await field("Evidence notes 1").fill("Private evidence");
  await button("Add candidate").click();
  await field("Candidate name 2").fill("Unlisted candidate");
  await next();
  await expect.element(screen.getByText("Private evidence", { exact: true })).toBeVisible();
  await screen.getByRole("checkbox", { name: "Pin Private reference" }).click();
  await next();
  await field("Public product name").fill("Field notebook");
  await field("Public recommendation (optional)").fill("A sturdy notebook for short field trips.");
  await field("Affiliate destination URL").fill("javascript:alert(1)");
  await expect
    .element(screen.getByText("Enter a valid HTTPS affiliate URL.", { exact: true }))
    .toBeVisible();
  await field("Affiliate destination URL").fill("https://merchant.example/notebook?ref=abc");
  await field("Public affiliate disclosure").fill("I may earn a commission from these links.");
  await next();
  await field("Public storefront title").fill("Everyday field kit");
  await field("Public introduction (optional)").fill("A few essentials for short trips.");
  await button(/^Catalog/).click();
  await next();
  await expect
    .element(screen.getByRole("heading", { name: "Review the public storefront" }))
    .toBeVisible();
  const frame = container.querySelector<HTMLIFrameElement>("iframe")!;
  expect(frame.getAttribute("sandbox")).toBe("");
  expect(frame.referrerPolicy).toBe("no-referrer");
  expect(frame.srcdoc).toContain("Field notebook");
  expect(frame.srcdoc).toContain("merchant.example/notebook?ref=abc");
  for (const privateData of [
    "Internal research",
    "Private reference",
    "source.example",
    "Internal fit note",
    "Private evidence",
    "2026-11-19",
    "Unlisted candidate",
  ]) {
    expect(frame.srcdoc).not.toContain(privateData);
  }
  const approvedHtml = frame.srcdoc;
  await screen.getByRole("checkbox", { name: "Approve this public version" }).click();
  await next();
  await button("Projects").click();
  await button(/^Internal research/).click();
  await expect.element(button("Download HTML")).toBeEnabled();
  let download: { filename: string; blob: Blob } | undefined;
  const createObjectURL = vi.spyOn(URL, "createObjectURL");
  using _download = {
    [Symbol.dispose]() {
      document.removeEventListener("click", capture);
      createObjectURL.mockRestore();
    },
  };
  function capture(event: MouseEvent) {
    if (!(event.target instanceof HTMLAnchorElement) || !event.target.download) return;
    event.preventDefault();
    const [blob] = createObjectURL.mock.lastCall!;
    if (blob instanceof Blob) download = { filename: event.target.download, blob };
  }
  document.addEventListener("click", capture);
  await button("Download HTML").click();
  expect(download?.filename).toBe("Everyday field kit.html");
  expect(download?.blob.type).toBe("text/html;charset=utf-8");
  expect(await download?.blob.text()).toBe(approvedHtml);
  const goToStep = (step: string) =>
    screen.getByRole("combobox", { name: "Go to step" }).selectOptions(step);
  for (const [target, label] of [
    ["shopify", "Shopify"],
    ["custom-stack", "Custom stack"],
  ] as const) {
    await goToStep("3");
    await screen.getByRole("combobox", { name: "Delivery target" }).selectOptions(target);
    await goToStep("5");
    await button(`Download ${label} handoff`).click();
    expect(download?.filename).toBe(`Everyday field kit - ${target} handoff.json`);
    expect(download?.blob.type).toBe("application/json");
    const handoff = JSON.parse((await download?.blob.text())!);
    expect(handoff).toMatchObject({
      target,
      page: {
        title: "Everyday field kit",
        style: "catalog",
        products: [{ name: "Field notebook", href: "https://merchant.example/notebook?ref=abc" }],
      },
    });
    expect(handoff.page.products).toHaveLength(1);
    expect(handoff.instructions).toHaveLength(3);
    expect(await download?.blob.text()).not.toMatch(/private|internal|unlisted/i);
    const isShopify = target === "shopify";
    await button(isShopify ? "Download Shopify section" : "Download React component").click();
    expect(download?.filename).toBe(isShopify ? "affiliate-collection.liquid" : "AffiliateStorefront.tsx");
    const source = await download!.blob.text();
    expect(source).toContain("Field notebook");
    expect(source).toContain(isShopify ? "{% schema %}" : "export default function AffiliateStorefront");
    expect(source).not.toMatch(/Private reference|source\.example|Unlisted candidate/);
  }
  await goToStep("3");
  await screen.getByRole("combobox", { name: "Site stack" }).selectOptions("astro");
  await goToStep("5");
  await expect.element(button("Download React component")).not.toBeInTheDocument();
  await button("Download Custom stack handoff").click();
  expect(JSON.parse(await download!.blob.text()).stack).toBe("Astro");
  await goToStep("0");
  await expect.element(field("Candidate name 1")).toHaveValue("Private reference");
  await screen.getByText("Evidence for candidate 1", { exact: true }).click();
  await expect.element(field("Evidence notes 1")).toHaveValue("Private evidence");
  await goToStep("3");
  await field("Public storefront title").fill("Revised field kit");
  await goToStep("5");
  await expect.element(button("Download Custom stack handoff")).toBeDisabled();
  const workspace = container.querySelector(".ops-workspace")!;
  expect(workspace.scrollWidth).toBeLessThanOrEqual(workspace.clientWidth);
  expect(onAskAgent).not.toHaveBeenCalled();
});
