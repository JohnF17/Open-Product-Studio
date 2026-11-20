import { createHash } from "node:crypto";
import { link, lstat, mkdir, mkdtemp, open, readFile, realpath, rm, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createPortraitRenderDriver, PortraitRenderError, type StagedPortrait, verifyQualifiedFfmpeg } from "./portraitRender.ts";
import { LocalProcessError, runBoundedProcess } from "./process.ts";

const usage = "node tools/clipper-render/qualify.ts --ffmpeg <absolute-file> --sha256 <trusted-SHA-256> --out <new-absolute-directory>";
const cut = { startFrame: 30, endFrameExclusive: 90 } as const;
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function reportCleanupFailure(path: string) {
  console.warn("Could not remove temporary qualification data. Inspect " + path);
}

export function qualificationReceipt(result: StagedPortrait) {
  if (result.sourceFrameCount !== 120) {
    throw new Error(`Expected 120 decoded fixture frames, received ${result.sourceFrameCount}.`);
  }
  return {
    schema: "studio-clipper-qualification/1",
    scope: "synthetic-local-render",
    host: { platform: process.platform, architecture: process.arch, node: process.version },
    preset: result.preset,
    rendererSha256: result.rendererSha256,
    source: { fixture: "testsrc2", fps: 24, width: 800, height: 450, frames: result.sourceFrameCount, sha256: result.sourceSha256 },
    cut: result.cut,
    artifact: {
      name: "portrait.mp4", width: result.width, height: result.height, audio: result.audio,
      frameCount: result.frameCount, duration: result.duration, bytes: result.bytes, sha256: result.sha256,
    },
  };
}

function localPath(path: string) {
  if (!isAbsolute(path) || /[\x00-\x1f]/.test(path)) return false;
  return process.platform === "win32" ? /^[a-z]:[\\/][^:]*$/i.test(path) : !path.startsWith("//");
}

async function newOutputPath(path: string) {
  if (!localPath(path)) throw new Error("Output must be an absolute local directory path.");
  const dest = resolve(path);
  const parent = dirname(dest);
  const canonical = await realpath(parent);
  const equivalent = process.platform === "win32" ? canonical.toLowerCase() === parent.toLowerCase() : canonical === parent;
  if (parent === dest || !equivalent || !localPath(canonical)) throw new Error("Choose a directory under an existing local parent without symlinks.");
  try {
    await lstat(dest);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return dest;
    throw error;
  }
  throw new Error("The output directory already exists. Choose a new directory.");
}

// mkdir reserves a new destination even if two runs passed the early existence check.
// The receipt link is the commit marker. It appears only after both files are flushed.
async function publish(dest: string, mp4: Buffer, receipt: string, signal: AbortSignal) {
  await mkdir(dest, { mode: 0o700 });
  const owned: string[] = [];
  async function write(name: string, data: Buffer | string) {
    const path = join(dest, name);
    const file = await open(path, "wx", 0o600);
    owned.push(path);
    try {
      await file.writeFile(data);
      await file.sync();
    } finally {
      await file.close();
    }
  }
  const pending = join(dest, ".receipt.pending");
  try {
    await write("portrait.mp4", mp4);
    await write(".receipt.pending", receipt);
    signal.throwIfAborted();
    await link(pending, join(dest, "receipt.json"));
  } catch (error) {
    for (const file of owned.reverse()) await unlink(file).catch(() => reportCleanupFailure(file));
    await rmdir(dest).catch(() => reportCleanupFailure(dest));
    throw error;
  }
  await unlink(pending).catch(() => reportCleanupFailure(pending));
}

async function qualify(ffmpeg: string, sha256: string, output: string, signal: AbortSignal) {
  const dest = await newOutputPath(output);
  const binary = { path: await verifyQualifiedFfmpeg({ path: ffmpeg, sha256 }, signal), sha256 };
  const temporaryParent = await realpath(tmpdir());
  if (!localPath(temporaryParent)) throw new Error("Choose a local temporary directory.");
  const work = await mkdtemp(join(temporaryParent, "ops-portrait-qualify-"));
  let quarantine = false;
  try {
    const source = join(work, "fixture.webm");
    await runBoundedProcess(binary.path, [
      "-nostdin", "-hide_banner", "-xerror", "-v", "error", "-n", "-f", "lavfi",
      "-i", "testsrc2=duration=5:size=800x450:rate=24", "-map", "0:v:0", "-an",
      "-c:v", "libvpx-vp9", "-threads", "2", "-deadline", "realtime", "-cpu-used", "8",
      "-pix_fmt", "yuv420p", "-f", "webm", "-fs", "4194304", source,
    ], { cwd: work, timeoutMs: 15_000, maxOutputBytes: 32_768, signal });
    const result = await createPortraitRenderDriver(binary).render({
      source: { path: source, sha256: hash(await readFile(source)) }, jobDirectory: work, cut, signal,
    });
    const mp4 = await readFile(result.path);
    if (mp4.length !== result.bytes || hash(mp4) !== result.sha256) throw new Error("Staged artifact changed before publication.");
    const receipt = qualificationReceipt(result);
    signal.throwIfAborted();
    await publish(dest, mp4, JSON.stringify(receipt, null, 2) + "\n", signal);
  } catch (error) {
    quarantine = (error instanceof PortraitRenderError || error instanceof LocalProcessError) && error.code === "termination";
    throw error;
  } finally {
    if (quarantine) {
      process.stderr.write("Termination could not be confirmed. Inspect the private job directory: " + work + "\n");
    } else if (dirname(work) === temporaryParent && basename(work).startsWith("ops-portrait-qualify-")) {
      await rm(work, { recursive: true, force: true }).catch(() => reportCleanupFailure(work));
    }
  }
}

async function main(args: string[]) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    return;
  }
  const { values } = parseArgs({ args, options: {
    ffmpeg: { type: "string" }, sha256: { type: "string" }, out: { type: "string" },
  } });
  if (!values.ffmpeg || !values.sha256 || !values.out) throw new Error(usage);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  try {
    await qualify(values.ffmpeg, values.sha256, values.out, controller.signal);
    console.log("Verified the synthetic portrait. Saved portrait.mp4 and receipt.json.");
  } finally {
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Portrait qualification failed.");
    process.exitCode = 1;
  });
}
