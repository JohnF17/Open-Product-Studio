import { randomUUID } from "../../lib/randomUUID";
import { createDraft, isVideoSeriesBrief, type StudioDraft, type VideoSeriesBrief, type VideoStyle } from "./drafts";

export type { VideoSeriesBrief } from "./drafts";

/** Supply the current snapshot only from the project that authors this series. */
export function reviseSeriesBrief(
  current: VideoSeriesBrief | undefined,
  audience: string,
  format: string,
  style: VideoStyle,
): VideoSeriesBrief {
  const audienceText = audience.trim();
  const formatText = format.trim();
  if (!audienceText || !formatText) throw new Error("Enter an audience and format for the series.");
  if (current !== undefined && !isVideoSeriesBrief(current)) throw new Error("Invalid series brief.");
  if (current?.audience === audienceText && current.format === formatText && current.style === style) return current;
  if (current?.revision === Number.MAX_SAFE_INTEGER) throw new Error("This series has reached its last revision.");
  return {
    seriesId: current?.seriesId ?? randomUUID(),
    revision: (current?.revision ?? 0) + 1,
    audience: audienceText,
    format: formatText,
    style,
  };
}

export function createSeriesEpisode(workspaceId: string, brief: VideoSeriesBrief, title: string): StudioDraft {
  if (!isVideoSeriesBrief(brief)) throw new Error("Invalid series brief.");
  return {
    ...createDraft(workspaceId, "video"),
    stage: "brief",
    title: title.trim(),
    style: brief.style,
    seriesBrief: { ...brief },
  };
}
