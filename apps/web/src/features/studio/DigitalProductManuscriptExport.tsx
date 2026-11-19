import { ArrowDownToLine } from "lucide-react";
import type { DraftEditor, StudioDraft } from "./drafts";
import {
  digitalProductManuscript,
  digitalProductPublicTitle,
  setDigitalProductApproval,
  writeDigitalProductField,
} from "./digitalProductExport";
import { downloadStudioFile } from "./guide";
import "./digitalProductExport.css";

export function DigitalProductManuscriptExport({ draft, editor, saveBackup }: {
  saveBackup: () => void;
  draft: StudioDraft;
  editor: DraftEditor;
}) {
  const manuscript = digitalProductManuscript(draft);

  function download(kind: "text" | "html") {
    const current = digitalProductManuscript(editor.snapshot().draft);
    if (!current?.approved) return;
    const blob = new Blob([current[kind]], {
      type: kind === "text" ? "text/plain;charset=utf-8" : "text/html;charset=utf-8",
    });
    downloadStudioFile(blob, current.title, kind === "text" ? ".txt" : ".html");
  }

  return (
    <>
      <label className="ops-field">
        <span>Public title</span>
        <input
          type="text"
          maxLength={160}
          value={draft.fields[digitalProductPublicTitle] ?? ""}
          onChange={(event) =>
            writeDigitalProductField(editor, digitalProductPublicTitle, event.currentTarget.value)
          }
        />
      </label>
      {manuscript ? (
        <iframe
          className="ops-manuscript-preview"
          title="Public manuscript preview"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={manuscript.html}
        />
      ) : (
        <p className="ops-note">Enter a public title and add text in Manuscript to preview your export.</p>
      )}
      <label className="ops-manuscript-approval">
        <input
          type="checkbox"
          checked={manuscript?.approved ?? false}
          disabled={!manuscript}
          onChange={(event) => {
            if (manuscript) {
              setDigitalProductApproval(editor, manuscript.approval, event.currentTarget.checked);
            }
          }}
        />
        Approve this manuscript for export
      </label>
      <div className="ops-actions">
        <button
          type="button"
          className="ops-button ops-primary"
          disabled={!manuscript?.approved}
          onClick={() => download("text")}
        >
          <ArrowDownToLine size={16} /> Download manuscript text
        </button>
        <button
          type="button"
          className="ops-button"
          disabled={!manuscript?.approved}
          onClick={() => download("html")}
        >
          <ArrowDownToLine size={16} /> Download print-friendly HTML
        </button>
      </div>
      <p className="ops-note">
        For a PDF, open the downloaded HTML in your browser, select Print, and choose Save as PDF.
      </p>
      <button
        type="button"
        className="ops-link"
        onClick={saveBackup}
      >
        <ArrowDownToLine size={16} /> Download private draft
      </button>
    </>
  );
}
