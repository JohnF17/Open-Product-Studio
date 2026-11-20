import { createHash } from "node:crypto";
import { lstat, mkdtemp, open, realpath, rmdir, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { PORTRAIT, validatePortraitMp4 } from "./portraitMp4.ts";
import { LocalProcessError, runBoundedProcess } from "./process.ts";

export const PORTRAIT_PRESET = "portrait-360x640-24-silent";

/** Supplied by the local host's qualification registry, once per driver instance. */
export interface QualifiedFfmpeg {
  readonly path: string;
  readonly sha256: string;
}

/** An immutable regular-file revision in engine-owned storage. */
export interface SelectedInput {
  readonly path: string;
  readonly sha256: string;
}

export interface FrameCut {
  readonly startFrame: number;
  readonly endFrameExclusive: number;
}

export interface PortraitRenderRequest {
  readonly source: SelectedInput;
  readonly jobDirectory: string;
  readonly cut: FrameCut;
  readonly signal?: AbortSignal | undefined;
}

export interface StagedPortrait {
  readonly path: string;
  readonly preset: typeof PORTRAIT_PRESET;
  readonly sourceSha256: string;
  readonly sourceFrameCount: number;
  readonly rendererSha256: string;
  readonly cut: FrameCut;
  readonly width: 360;
  readonly height: 640;
  readonly frameCount: number;
  readonly duration: Readonly<{ ticks: number; timescale: 12_288 }>;
  readonly audio: "silent";
  readonly bytes: number;
  readonly sha256: string;
}

export interface PortraitRenderDriver {
  render(request: PortraitRenderRequest): Promise<StagedPortrait>;
}

type Phase = "prepare" | "inspect" | "source-decode" | "encode" | "verify";
type ErrorCode =
  | LocalProcessError["code"]
  | "invalid-path" | "invalid-cut" | "binary-mismatch" | "source-mismatch"
  | "unsupported-source" | "invalid-output" | "filesystem" | "cleanup";

export class PortraitRenderError extends Error {
  readonly code: ErrorCode;
  readonly phase: Phase;
  readonly exitCode: number | null;

  constructor(code: ErrorCode, phase: Phase, exitCode: number | null = null) {
    super(`Portrait render failed during ${phase} (${code})`);
    this.name = "PortraitRenderError";
    this.code = code;
    this.phase = phase;
    this.exitCode = exitCode;
  }
}

const FPS = 24;
const MAX_SOURCE_FRAMES = 30 * FPS;
const MAX_BINARY_BYTES = 192 * 1024 * 1024;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
const COMMON = ["-nostdin", "-hide_banner", "-xerror", "-nostats", "-max_alloc", "67108864"];

function checkCancelled(signal: AbortSignal | undefined, phase: Phase) {
  if (signal?.aborted) throw new PortraitRenderError("cancelled", phase);
}

function hostPath(path: string): boolean {
  if (!isAbsolute(path) || /[\x00-\x1f]/.test(path)) return false;
  return process.platform === "win32"
    ? /^[a-z]:[\\/][^:]*$/i.test(path)
    : !path.startsWith("//");
}

async function checkedPath(path: string, kind: "file" | "directory"): Promise<string> {
  if (!hostPath(path)) throw new PortraitRenderError("invalid-path", "prepare");
  const info = await lstat(path);
  const canonical = await realpath(path);
  const comparable = (value: string) =>
    process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
  if (!hostPath(canonical) || comparable(path) !== comparable(canonical) ||
      !(kind === "file" ? info.isFile() : info.isDirectory())) {
    throw new PortraitRenderError("invalid-path", "prepare");
  }
  return canonical;
}

async function verifyDigest(
  file: Readonly<{ path: string; sha256: string }>,
  limit: number,
  code: "binary-mismatch" | "source-mismatch",
  phase: Phase,
  signal: AbortSignal | undefined,
) {
  if (!/^[a-f0-9]{64}$/i.test(file.sha256)) throw new PortraitRenderError(code, phase);
  checkCancelled(signal, phase);
  const handle = await open(file.path, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size === 0 || info.size > limit ||
        (code === "source-mismatch" && info.nlink !== 1)) {
      throw new PortraitRenderError(code, phase);
    }
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(256 * 1024);
    let consumed = 0;
    while (consumed < info.size) {
      checkCancelled(signal, phase);
      const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, info.size - consumed));
      if (bytesRead === 0) throw new PortraitRenderError(code, phase);
      hash.update(buffer.subarray(0, bytesRead));
      consumed += bytesRead;
    }
    if ((await handle.stat()).size !== info.size || hash.digest("hex") !== file.sha256.toLowerCase()) {
      throw new PortraitRenderError(code, phase);
    }
  } finally {
    await handle.close();
  }
}

export async function verifyQualifiedFfmpeg(qualification: QualifiedFfmpeg, signal?: AbortSignal): Promise<string> {
  const binary = await checkedPath(qualification.path, "file");
  await verifyDigest({ path: binary, sha256: qualification.sha256 }, MAX_BINARY_BYTES, "binary-mismatch", "prepare", signal);
  return binary;
}

function inspectInventory(stdout: string) {
  const lines = stdout.split(/\r?\n/);
  const tracks = lines.filter((line) => line.startsWith("#media_type "));
  if (tracks.length !== 1 || tracks[0] !== "#media_type 0: video" ||
      !lines.includes("#codec_id 0: vp9")) {
    throw new PortraitRenderError("unsupported-source", "inspect");
  }
}

function sourceFrameCount(stderr: string): number {
  let count = 0;
  const lines = stderr.split(/[\r\n]+/);
  const config = lines.filter((line) => /^\[Parsed_showinfo_\d+ @ [^\]]+\] config in /.test(line));
  if (config.length !== 1 || !config[0]!.endsWith("time_base: 1/1000, frame_rate: 24/1") ||
      /displaymatrix|display matrix/i.test(stderr)) {
    throw new PortraitRenderError("unsupported-source", "source-decode");
  }
  for (const line of lines) {
    const frame = /^\[Parsed_showinfo_\d+ @ [^\]]+\] n:\s*(\d+) pts:\s*(-?\d+) (.*)$/.exec(line);
    if (!frame) continue;
    if (Number(frame[1]) !== count || Number(frame[2]) !== Math.round(count * 1000 / FPS) ||
        !/\bfmt:yuv420p\b.*\bsar:1\/1\s+s:800x450\s+i:P\b/.test(frame[3]!)) {
      throw new PortraitRenderError("unsupported-source", "source-decode");
    }
    count += 1;
  }
  if (count < 1 || count > MAX_SOURCE_FRAMES) {
    throw new PortraitRenderError("unsupported-source", "source-decode");
  }
  return count;
}

function verifyDecodedOutput(stdout: string, frameCount: number) {
  const lines = stdout.split(/\r?\n/);
  const frames = lines.filter((line) => line.length > 0 && !line.startsWith("#"));
  if (!lines.includes("#tb 0: 1/24") || !lines.includes("#dimensions 0: 360x640") ||
      !lines.includes("#sar 0: 1/1") || frames.length !== frameCount) {
    throw new PortraitRenderError("invalid-output", "verify");
  }
  for (const [index, frame] of frames.entries()) {
    const fields = frame.split(",").map((field) => field.trim());
    if (fields.length !== 6 || fields[0] !== "0" ||
        fields[1] !== String(index) || fields[2] !== String(index) || fields[3] !== "1" ||
        fields[4] !== "345600" || !/^[a-f0-9]{32}$/.test(fields[5]!)) {
      throw new PortraitRenderError("invalid-output", "verify");
    }
  }
}

async function validatedArtifact(file: string, frameCount: number) {
  const handle = await open(file, "r+");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.size === 0 || info.size > MAX_ARTIFACT_BYTES) {
      throw new PortraitRenderError("invalid-output", "verify");
    }
    const bytes = Buffer.allocUnsafe(info.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset);
      if (bytesRead === 0) throw new PortraitRenderError("invalid-output", "verify");
      offset += bytesRead;
    }
    if ((await handle.stat()).size !== info.size) throw new PortraitRenderError("invalid-output", "verify");
    let ticks: number;
    try {
      ticks = validatePortraitMp4(bytes, frameCount);
    } catch {
      throw new PortraitRenderError("invalid-output", "verify");
    }
    await handle.sync();
    return { ticks, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  } finally {
    await handle.close();
  }
}

async function discardStage(stage: string) {
  try {
    await unlink(join(stage, "portrait.mp4"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await rmdir(stage);
}

/** Engine-only API. The host must protect the source, executable and job directory from concurrent mutation. */
export function createPortraitRenderDriver(qualified: QualifiedFfmpeg): PortraitRenderDriver {
  const qualification = { path: qualified.path, sha256: qualified.sha256 };
  return {
    async render(request) {
      const { signal, jobDirectory } = request;
      const source = { path: request.source.path, sha256: request.source.sha256 };
      const cut = { startFrame: request.cut.startFrame, endFrameExclusive: request.cut.endFrameExclusive };
      let phase: Phase = "prepare";
      let stage: string | undefined;
      try {
        checkCancelled(signal, phase);
        const { startFrame, endFrameExclusive } = cut;
        if (!Number.isSafeInteger(startFrame) || !Number.isSafeInteger(endFrameExclusive) ||
            startFrame < 0 || endFrameExclusive <= startFrame || endFrameExclusive > MAX_SOURCE_FRAMES) {
          throw new PortraitRenderError("invalid-cut", phase);
        }
        const binary = await verifyQualifiedFfmpeg(qualification, signal);
        const input = await checkedPath(source.path, "file");
        const job = await checkedPath(jobDirectory, "directory");
        await verifyDigest({ ...source, path: input }, MAX_SOURCE_BYTES, "source-mismatch", phase, signal);
        checkCancelled(signal, phase);
        stage = await mkdtemp(join(job, "portrait-"));
        const cwd = stage;

        const run = (args: readonly string[], timeoutMs: number, maxOutputBytes: number) =>
          runBoundedProcess(binary, [...COMMON, ...args], { cwd, timeoutMs, maxOutputBytes, signal });
        const demux = ["-protocol_whitelist", "file", "-f", "matroska"];
        const decodeSource = [
          ...demux, "-c:v", "vp9", "-max_pixels", "1048576", "-threads", "2", "-noautorotate", "-i", input,
        ];
        const videoOnly = ["-map", "0:v:0", "-an", "-sn", "-dn", "-filter_threads", "1"];
        phase = "inspect";
        const inventory = await run([
          "-v", "error", ...demux, "-i", input, "-map", "0", "-c", "copy", "-t", "0", "-f", "framecrc", "-",
        ], 5_000, 32_768);
        inspectInventory(inventory.stdout);

        phase = "source-decode";
        const decoded = await run([
          "-v", "info", "-copyts", ...decodeSource, ...videoOnly,
          "-vf", "showinfo=checksum=0", "-fps_mode", "passthrough",
          "-frames:v", String(MAX_SOURCE_FRAMES + 1), "-f", "null", "-",
        ], 15_000, 1_048_576);
        const decodedSourceFrames = sourceFrameCount(decoded.stderr);
        if (endFrameExclusive > decodedSourceFrames) {
          throw new PortraitRenderError("invalid-cut", phase);
        }

        phase = "encode";
        const output = join(stage, "portrait.mp4");
        const frameCount = endFrameExclusive - startFrame;
        await run([
          "-v", "error", "-n", "-copyts", ...decodeSource, ...videoOnly,
          "-vf", `trim=start_frame=${startFrame}:end_frame=${endFrameExclusive},settb=1/24,setpts=N,crop=252:448:274:0,scale=360:640,setsar=1`,
          "-r", "24", "-fps_mode", "cfr", "-map_metadata", "-1", "-map_metadata:s:v:0", "-1", "-map_chapters", "-1",
          "-c:v", "libx264", "-threads", "2", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-bf", "0", "-use_editlist", "0", "-video_track_timescale", "12288", "-movie_timescale", "12288",
          "-movflags", "+faststart",
          "-fs", String(MAX_ARTIFACT_BYTES), "-f", "mp4", output,
        ], 25_000, 32_768);

        phase = "verify";
        const artifact = await validatedArtifact(output, frameCount);
        const verified = await run([
          "-v", "error", "-copyts", "-protocol_whitelist", "file",
          "-f", "mov", "-c:v", "h264", "-max_pixels", "1048576", "-threads", "2", "-noautorotate", "-i", output,
          ...videoOnly, "-fps_mode", "passthrough", "-threads", "1", "-f", "framemd5", "-",
        ], 15_000, 131_072);
        verifyDecodedOutput(verified.stdout, frameCount);
        await verifyDigest({ ...source, path: input }, MAX_SOURCE_BYTES, "source-mismatch", phase, signal);
        checkCancelled(signal, phase);
        return {
          path: output, preset: PORTRAIT_PRESET, cut,
          sourceFrameCount: decodedSourceFrames,
          sourceSha256: source.sha256.toLowerCase(), rendererSha256: qualification.sha256.toLowerCase(),
          width: PORTRAIT.width, height: PORTRAIT.height, frameCount, audio: "silent",
          duration: { ticks: artifact.ticks, timescale: PORTRAIT.timescale },
          bytes: artifact.bytes, sha256: artifact.sha256,
        };
      } catch (error) {
        if (stage && !(error instanceof LocalProcessError && error.code === "termination")) {
          try {
            await discardStage(stage);
          } catch {
            throw new PortraitRenderError("cleanup", phase);
          }
        }
        if (error instanceof LocalProcessError) throw new PortraitRenderError(error.code, phase, error.exitCode);
        if (error instanceof PortraitRenderError) throw error;
        throw new PortraitRenderError("filesystem", phase);
      }
    },
  };
}
