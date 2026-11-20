// @effect-diagnostics nodeBuiltinImport:off -- The standalone qualification command and desktop generate and hash the same local sample.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPortraitRenderDriver, verifyQualifiedFfmpeg, type FrameCut, type QualifiedFfmpeg } from "./portraitRender.ts";
import { runBoundedProcess } from "./process.ts";

/** The host owns this new, private directory and supplies the entire five-second recording. */
export async function renderStudioSample(binary: QualifiedFfmpeg, directory: string, cut: FrameCut, signal: AbortSignal) {
  const executable = await verifyQualifiedFfmpeg(binary, signal);
  const path = join(directory, "fixture.webm");
  await runBoundedProcess(executable, [
    "-nostdin", "-hide_banner", "-xerror", "-v", "error", "-n", "-f", "lavfi",
    "-i", "testsrc2=duration=5:size=800x450:rate=24", "-map", "0:v:0", "-an",
    "-c:v", "libvpx-vp9", "-threads", "2", "-deadline", "realtime", "-cpu-used", "8",
    "-pix_fmt", "yuv420p", "-f", "webm", "-fs", "4194304", path,
  ], { cwd: directory, timeoutMs: 15_000, maxOutputBytes: 32_768, signal });
  const source = { path, sha256: createHash("sha256").update(await readFile(path)).digest("hex") };
  const result = await createPortraitRenderDriver(binary).render({ source, jobDirectory: directory, cut, signal });
  if (result.sourceFrameCount !== 120) throw new Error("The generated sample is incomplete.");
  return result;
}
