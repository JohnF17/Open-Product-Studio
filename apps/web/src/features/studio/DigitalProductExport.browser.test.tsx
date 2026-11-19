import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace from "./StudioWorkspace";
import { createDraft, saveDraft } from "./drafts";

it("keeps a legacy project private until the user reviews an explicit public title and manuscript", async () => {
  const workspaceId = randomUUID();
  const legacy = { ...createDraft(workspaceId, "digital-product"), title: "Internal study", stage: "export" };
  await saveDraft({ ...legacy, fields: { brief: "Private pitch", outline: "Private outline" } }, 0);

  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { router: false });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const publicTitle = screen.getByRole("textbox", { name: "Public title", exact: true });
  const download = button("Download manuscript text");
  const approval = screen.getByRole("checkbox", { name: "Approve this manuscript for export" });

  await button(/^Internal study/).click();
  await expect.element(publicTitle).toHaveValue("");
  await expect.element(button("Download private draft")).toBeEnabled();
  await expect.element(download).toBeDisabled();
  await publicTitle.fill("Field study");
  await expect.element(approval).toBeDisabled();
  await button("Back").click();
  await expect.element(screen.getByRole("textbox", { name: "Manuscript" })).toHaveValue("");
  await screen.getByRole("textbox", { name: "Manuscript" }).fill("Look closely at the first leaf.");
  await button("Next").click();
  await expect.element(publicTitle).toHaveValue("Field study");
  await expect.element(approval).toBeEnabled();
  await expect.element(download).toBeDisabled();
});

it("reopens an approved version, exports only reader content, and clears approval on edits", async () => {
  const workspaceId = randomUUID();
  const manuscript = "Café & garden\n\n  1. Find a leaf.\n<img src=https://example.invalid/hidden>";
  const legacy = {
    ...createDraft(workspaceId, "digital-product"),
    title: "Internal study",
    stage: "export",
    fields: {
      format: "Workbook",
      draft: manuscript,
      brief: "Private pitch",
      audience: "Private audience",
      outline: "Private outline",
      notes: "Private notes",
      unrelated: "Private future field",
    },
  };
  await saveDraft(legacy, 0);

  await using screen = await render(<StudioWorkspace workspaceId={workspaceId} />, { router: false });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const textDownload = button("Download manuscript text");
  const htmlDownload = button("Download print-friendly HTML");
  const publicTitle = screen.getByRole("textbox", { name: "Public title", exact: true });
  const approval = screen.getByRole("checkbox", { name: "Approve this manuscript for export" });

  await button(/^Internal study/).click();
  await expect.element(htmlDownload).toBeDisabled();
  await publicTitle.fill("Garden guide");
  await expect.element(htmlDownload).toBeDisabled();
  await approval.click();
  await button("Projects").click();
  await button(/^Internal study/).click();
  await expect.element(approval).toBeChecked();
  await expect.element(publicTitle).toHaveValue("Garden guide");

  const frame = document.querySelector<HTMLIFrameElement>("iframe[title='Public manuscript preview']")!;
  expect(frame.getAttribute("sandbox")).toBe("");
  const privateData = /Internal study|Private |digitalProductApproval/;
  expect(frame.srcdoc).not.toMatch(privateData);

  let file: Promise<File> | undefined;
  function captureDownload(event: MouseEvent) {
    const link = event.target;
    if (!(link instanceof HTMLAnchorElement) || !link.download) return;
    event.preventDefault();
    const { href, download } = link;
    file = fetch(href).then(async (response) => {
      const blob = await response.blob();
      return new File([blob], download, { type: blob.type });
    });
  }
  document.addEventListener("click", captureDownload);
  try {
    await textDownload.click();
    const text = (await file)!;
    expect(text.name).toBe("Garden guide.txt");
    expect(text.type).toMatch(/^text\/plain/);
    const contents = await text.text();
    expect(contents).toBe(`Garden guide\nWorkbook\n\n${manuscript}\n`);
    expect(contents).not.toMatch(privateData);

    await htmlDownload.click();
    const html = (await file)!;
    expect(html.name).toBe("Garden guide.html");
    expect(html.type).toMatch(/^text\/html/);
    const htmlSource = await html.text();
    expect(htmlSource).toBe(frame.srcdoc);
    expect(htmlSource).toContain("@media print");
    const page = new DOMParser().parseFromString(htmlSource, "text/html");
    expect(page.title).toBe("Garden guide");
    expect(page.querySelector("main h1")?.textContent).toBe("Garden guide");
    expect(page.querySelector(".manuscript")?.textContent).toBe(manuscript);
    expect(page.querySelector("script, img, link, iframe")).toBeNull();

    await button("Download private draft").click();
    const backup = (await file)!;
    expect(backup.name).toBe("Internal study.json");
    expect(JSON.parse(await backup.text())).toMatchObject({ title: "Internal study", fields: legacy.fields });
  } finally {
    document.removeEventListener("click", captureDownload);
  }

  await publicTitle.fill("Updated guide");
  await publicTitle.fill("Garden guide");
  await expect.element(htmlDownload).toBeDisabled();
  await approval.click();
  await button("Back").click();
  const manuscriptField = screen.getByRole("textbox", { name: "Manuscript" });
  await expect.element(manuscriptField).toHaveValue(manuscript);
  await manuscriptField.fill("New manuscript");
  await manuscriptField.fill(manuscript);
  await button("Next").click();
  await expect.element(textDownload).toBeDisabled();
  await approval.click();
  const steps = screen.getByRole("combobox", { name: "Go to step" });
  await steps.selectOptions("0");
  await button("Curriculum").click();
  await steps.selectOptions("4");
  await expect.element(htmlDownload).toBeDisabled();
  await expect.element(button("Download private draft")).toBeEnabled();
});
