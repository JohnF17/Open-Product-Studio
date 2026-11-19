import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import type { DraftEditor, StudioDraft } from "./drafts";

export const digitalProductFormats = [
  "Ebook", "Workbook", "Template kit", "Curriculum", "Action plan",
] as const;
export const digitalProductPublicTitle = "digitalProductPublicTitle";
const approvalField = "digitalProductApproval";

export function writeDigitalProductField(editor: DraftEditor, key: string, value: string) {
  const current = editor.snapshot().draft.fields;
  if ((current[key] ?? "") === value) return;
  const fields = { ...current, [key]: value };
  delete fields[approvalField];
  editor.update({ fields });
}

function manuscriptVersion(draft: StudioDraft) {
  if (draft.category !== "digital-product") return null;
  const title = draft.fields[digitalProductPublicTitle]?.trim().replace(/\s*[\r\n]+\s*/g, " ");
  const body = draft.fields.draft?.replace(/\r\n?/g, "\n");
  if (!title || !body?.trim()) return null;
  const format = digitalProductFormats.find((option) => option === draft.fields.format) ?? "Ebook";
  const content = JSON.stringify([draft.id, title, format, body]);
  const approval = `1:${bytesToHex(sha256(new TextEncoder().encode(content)))}`;
  return { title, format, body, approval, approved: draft.fields[approvalField] === approval };
}

export function setDigitalProductApproval(
  editor: DraftEditor,
  reviewedVersion: string,
  approved: boolean,
) {
  const draft = editor.snapshot().draft;
  if (manuscriptVersion(draft)?.approval !== reviewedVersion) return;
  const fields = { ...draft.fields };
  if (approved) fields[approvalField] = reviewedVersion;
  else delete fields[approvalField];
  editor.update({ fields });
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function digitalProductManuscript(draft: StudioDraft) {
  const version = manuscriptVersion(draft);
  if (!version) return null;
  const { title, format, body, approval, approved } = version;
  const safeTitle = escapeHtml(title);
  return {
    title,
    approval,
    approved,
    text: `${title}\n${format}\n\n${body}\n`,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${safeTitle}</title>
<style>
  body { margin: 0; background: #fff; color: #202429; font: 1.0625rem/1.6 Georgia, serif; }
  main { max-width: 66ch; margin: 0 auto; padding: clamp(1rem, 5vw, 3rem); overflow-wrap: anywhere; }
  header { border-bottom: 1px solid #b9bdc2; margin-bottom: 1.5rem; padding-bottom: 0.75rem; }
  h1 { font-size: clamp(1.75rem, 5vw, 2.75rem); line-height: 1.15; margin: 0; }
  .format { margin: 0.4rem 0 0; font: 0.875rem/1.4 system-ui, sans-serif; }
  .manuscript { white-space: pre-wrap; orphans: 3; widows: 3; }
  @page { margin: 18mm; }
  @media print {
    body { color: #000; font-size: 11pt; }
    main { max-width: none; margin: 0; padding: 0; }
    header { break-inside: avoid; break-after: avoid; }
    h1 { font-size: 24pt; }
    .format { font-size: 9pt; }
  }
</style>
</head>
<body>
<main>
<header><h1>${safeTitle}</h1><p class="format">${format}</p></header>
<div class="manuscript">${escapeHtml(body)}</div>
</main>
</body>
</html>`,
  };
}
