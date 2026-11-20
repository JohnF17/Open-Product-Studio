import { T, useGT, useMessages } from "gt-react";
import { useId, useState } from "react";
import type { DraftEditor, StudioDraft } from "./drafts";
import { downloadStudioFile } from "./guide";
import { prepareVideoCaptionFile } from "./videoCaptionFile";
import "./clipLook.css";

type CaptionReview = {
  workspaceId: string;
  projectId: string;
  cues: StudioDraft["videoCues"];
  content: string;
};

function matchesReview(draft: StudioDraft, review: CaptionReview, content: string) {
  return (
    draft.category === "video" &&
    draft.stage === "export" &&
    draft.workspaceId === review.workspaceId &&
    draft.id === review.projectId &&
    draft.videoCues === review.cues &&
    content === review.content
  );
}

export function VideoCaptionExport({ draft, editor }: { draft: StudioDraft; editor: DraftEditor }) {
  const gt = useGT();
  const m = useMessages();
  const hint = useId();
  const [end, setEnd] = useState("");
  const [review, setReview] = useState<CaptionReview | null>(null);
  const hasCaptions = draft.videoCues?.some((cue) => cue.caption.trim()) === true;
  const result = prepareVideoCaptionFile(draft.videoCues ?? [], end, m);
  const content = "content" in result ? result.content : null;
  const reviewed = review !== null && content !== null && matchesReview(draft, review, content);

  function download() {
    if (!reviewed || !review) return;
    const latest = editor.snapshot().draft;
    const fresh = prepareVideoCaptionFile(latest.videoCues ?? [], end, m);
    if ("content" in fresh && matchesReview(latest, review, fresh.content)) {
      downloadStudioFile(
        new Blob([review.content], { type: "text/vtt;charset=utf-8" }),
        "Video captions",
        ".vtt",
      );
    }
  }

  return (
    // oxlint-disable-next-line shadcn/no-unknown-classes -- .ops-look is defined in the imported clipLook.css.
    <fieldset className="ops-look min-w-0 space-y-3">
      <legend>
        <T>Video captions (.vtt)</T>
      </legend>
      <p id={hint}>
        <T>
          Export the captions you wrote in Storyboard. Earlier captions end at the next timed cue.
          Enter an end time for the final caption.
        </T>
      </p>
      {/* oxlint-disable-next-line shadcn/no-unknown-classes -- The Studio builder defines .ops-field in studio.css. */}
      <label className="ops-field">
        <span>
          <T>Final caption end</T>
        </span>
        <input
          type="text"
          disabled={!hasCaptions}
          value={end}
          placeholder="0:09.500"
          aria-describedby={hint}
          onChange={(event) => {
            setEnd(event.currentTarget.value);
            setReview(null);
          }}
        />
      </label>
      {"error" in result && <p role="status">{result.error}</p>}
      {content !== null && (
        <>
          <pre
            role="region"
            aria-label={gt("WebVTT preview")}
            tabIndex={0}
            className="max-h-48 max-w-full overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground [overflow-wrap:anywhere]"
          >
            {content}
          </pre>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-primary"
              checked={reviewed}
              onChange={(event) =>
                setReview(
                  event.currentTarget.checked
                    ? {
                        workspaceId: draft.workspaceId,
                        projectId: draft.id,
                        cues: draft.videoCues,
                        content,
                      }
                    : null,
                )
              }
            />
            <T>I reviewed this caption file</T>
          </label>
        </>
      )}
      {/* oxlint-disable-next-line shadcn/no-unknown-classes -- The Studio builder defines .ops-button in studio.css. */}
      <button type="button" className="ops-button" disabled={!reviewed} onClick={download}>
        <T>Download video captions (.vtt)</T>
      </button>
    </fieldset>
  );
}
