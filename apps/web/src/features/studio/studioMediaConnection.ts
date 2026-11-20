export function parseStudioMediaPairing(raw: string) {
  const url = new URL(raw.trim());
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.username ||
    url.password ||
    !/^#[\w-]{43}$/.test(url.hash)
  )
    throw Error("Invalid renderer pairing code.");
  return { origin: url.origin, token: url.hash.slice(1) };
}
export async function transcribeStudioRecording(
  pairingCode: string,
  file: File,
  signal: AbortSignal,
) {
  const { origin, token } = parseStudioMediaPairing(pairingCode);
  if (!file.size || file.size >= 128 * 1024 * 1024)
    throw Error("Choose a recording under 128 MiB.");
  const form = new FormData();
  form.append("recording", file, "source.media");
  const response = await fetch(origin + "/transcribe", {
    method: "POST",
    body: form,
    headers: { Authorization: "Bearer " + token },
    signal,
    redirect: "error",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok)
    throw Error(
      response.status === 503
        ? "Start your paired renderer with a local whisper.cpp model."
        : "Could not transcribe this recording. Check your pairing code and its audio track.",
    );
  const text = await response.text();
  if (!text.trim() || text.length > 262144)
    throw Error("The local transcript exceeds the caption limit.");
  return text;
}
