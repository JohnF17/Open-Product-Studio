import { msg } from "gt-react";
import { m, type MessageResolver } from "../../i18n/messages";
import { escapeVttText, formatVttTimestamp } from "./captionVtt";
import { parseClipTime } from "./clipTimes";
import { inspectCueSheet, type VideoCue } from "./videoCues";

type CaptionFile = { content: string } | { error: string };

export function prepareVideoCaptionFile(
  cues: readonly VideoCue[],
  finalEndInput: string,
  resolve: MessageResolver = m,
): CaptionFile {
  const finalCaptionIndex = cues.findLastIndex((cue) => cue.caption.trim());
  if (finalCaptionIndex < 0) {
    return { error: resolve(msg("Add at least one caption on Storyboard.")) };
  }

  const { rows } = inspectCueSheet(cues);
  const invalidIndex = rows.findIndex((row) => row.error);
  if (invalidIndex >= 0) {
    return {
      error: resolve(
        msg("Cue {index}. {detail}", {
          index: invalidIndex + 1,
          detail: rows[invalidIndex]?.error ?? "",
        }),
      ),
    };
  }

  const finalEnd = parseClipTime(finalEndInput);
  if (finalEnd === null) {
    return { error: resolve(msg("Enter the end time of the final caption, such as 0:09.500.")) };
  }

  const lastStart = rows[finalCaptionIndex]?.startMs;
  if (lastStart == null || finalEnd <= lastStart) {
    return { error: resolve(msg("End the final caption after its start time.")) };
  }

  const nextStart = rows[finalCaptionIndex + 1]?.startMs;
  if (nextStart != null && finalEnd > nextStart) {
    return { error: resolve(msg("End the final caption by the next storyboard cue.")) };
  }

  const entries = [];
  for (const [index, { cue, startMs }] of rows.entries()) {
    const text = cue.caption.trim();
    if (!text || startMs === null) continue;
    if (/[\p{Cc}\p{Cs}]/u.test(cue.caption.replace(/[\t\n\r]/gu, ""))) {
      return {
        error: resolve(
          msg("Cue {index} contains unsupported control characters.", { index: index + 1 }),
        ),
      };
    }
    // Keep authored line breaks within a cue while preventing empty lines from ending its payload.
    const lines = text.replace(/\r\n?/gu, "\n").replace(/\n(?:[ \t]*\n)+/gu, "\n");
    const endMs = index === finalCaptionIndex ? finalEnd : (rows[index + 1]?.startMs ?? finalEnd);
    entries.push(
      `${formatVttTimestamp(startMs)} --> ${formatVttTimestamp(endMs)}\n${escapeVttText(lines)}`,
    );
  }

  const content = `WEBVTT\n\n${entries.join("\n\n")}\n`;
  if (new TextEncoder().encode(content).length > 256 * 1024) {
    return { error: resolve(msg("The caption file exceeds 256 KiB. Shorten it on Storyboard.")) };
  }
  return { content };
}
