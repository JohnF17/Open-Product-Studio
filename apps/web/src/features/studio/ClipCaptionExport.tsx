import { useId, useState } from "react";
import { escapeVttText, formatVttTimestamp } from "./captionVtt";
import { downloadStudioFile } from "./guide";
import { formatClipTime, readClipRange } from "./clipTimes";

type Timeline = "excerpt" | "recording";

export function ClipCaptionExport({ fields, durationMs }: { fields: Record<string, string>; durationMs?: number | undefined }) {
  const [timeline, setTimeline] = useState<Timeline>("excerpt");
  const timelineId = useId();
  const range = readClipRange(fields, durationMs);
  const caption = (fields.captionLine ?? "").trim().replace(/\s+/gu, " ");
  const start = range && (timeline === "excerpt" ? 0 : range.start);
  const end = range && (timeline === "excerpt" ? range.duration : range.end);

  function download() {
    if (!caption || start === null || end === null) return;
    const plainText = escapeVttText(caption);
    const contents = `WEBVTT\n\n${formatVttTimestamp(start)} --> ${formatVttTimestamp(end)}\n${plainText}\n`;
    downloadStudioFile(new Blob([contents], { type: "text/vtt;charset=utf-8" }), "Caption - " + timeline, ".vtt");
  }

  return <fieldset className="ops-look">
    <legend>Caption file</legend>
    <div className="ops-field">
      <label htmlFor={timelineId}>Use caption with</label>
      <select id={timelineId} value={timeline} onChange={(e) => setTimeline(e.target.value === "recording" ? "recording" : "excerpt")}>
        <option value="excerpt">Trimmed clip · starts at zero</option>
        <option value="recording">Original recording · uses source timecodes</option>
      </select>
    </div>
    <p>{start === null || end === null
      ? durationMs !== undefined && readClipRange(fields)
        ? "Mark out exceeds the recording duration. Adjust the marks on the Moment sheet."
        : "Enter a mark in and a later mark out on the Moment sheet."
      : !caption ? "Add caption text on the Edit notes sheet."
      : <><strong>{formatClipTime(start)} – {formatClipTime(end)}</strong><br />{caption}</>}</p>
    {range && <p>{durationMs === undefined ? "Using written marks. Recording duration is unverified." : "The marks fit the recording duration checked in this session."}</p>}
    <button type="button" className="ops-button" disabled={!range || !caption} onClick={download}>Download caption (.vtt)</button>
  </fieldset>;
}
