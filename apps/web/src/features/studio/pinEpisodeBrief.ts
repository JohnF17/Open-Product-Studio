import type { StudioDraft } from "./drafts";
import type { VideoSeriesBrief } from "./videoSeries";
import { compatibleVideoTools } from "./videoToolSelection";

export function pinBriefUpdate(episode: StudioDraft, next: VideoSeriesBrief) {
  const old = episode.seriesBrief;
  if (episode.category !== "video" || episode.seriesBriefOwner || !old ||
      old.seriesId !== next.seriesId || next.revision <= old.revision) return null;
  const keepsStyle = episode.fields.seriesStyleOverride === episode.style || episode.style !== old.style;
  const style = keepsStyle ? episode.style : next.style;
  return {
    seriesBrief: { ...next },
    seriesHistory: [...(episode.seriesHistory ?? []), old],
    style,
    tools: style === episode.style ? episode.tools : compatibleVideoTools(episode.tools, style),
  };
}
