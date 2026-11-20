/** The environment travels with the route so a restored URL cannot open a namesake elsewhere. */
export function studioProjectHash(workspace: string, id: string) {
  return ["studio", encodeURIComponent(workspace), encodeURIComponent(id)].join("/");
}

export function projectFromHash(hash: string, workspace: string) {
  const parts = hash.split("/");
  if (parts.length !== 3 || parts[0] !== "studio") return null;
  try {
    const id = decodeURIComponent(parts[2]!);
    return decodeURIComponent(parts[1]!) === workspace && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export function projectShelf(finished: boolean, editing: boolean, agentWorking: boolean) {
  if (finished) return "finished";
  return editing || agentWorking ? "working" : "settled";
}
