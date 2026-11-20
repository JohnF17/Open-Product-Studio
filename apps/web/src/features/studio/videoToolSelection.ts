import type { VideoStyle } from "./drafts";
import { catalog } from "./guide";

export function compatibleVideoTools(tools: string[], style: VideoStyle): string[] {
  const recipe = catalog.styles[style];
  const supported = new Set([...recipe.optional, ...recipe.required.flatMap((slot) => slot.chooseOne)]);
  return tools.filter((id) => supported.has(id));
}
