export function formatVttTimestamp(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const clock = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  return clock + "." + String(ms % 1000).padStart(3, "0");
}

export function escapeVttText(text: string) {
  return text
    .replaceAll("\u0000", "\uFFFD")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
