// @effect-diagnostics nodeBuiltinImport:off -- Native file identities, exclusive writes, fsync and hard links establish the save commit.
import { createHash } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { lstat, link, mkdir, open, realpath, rmdir, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, normalize, parse, relative } from "node:path";

/** Inputs originate in the native main process. None of these types is an IPC payload. */
export interface ApprovedPortraitSave {
  readonly operationId: string;
  readonly artifactPath: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly destination: string;
}

interface Identity {
  readonly device: string;
  readonly inode: string;
  readonly birthNs: string;
}

export interface SaveIntent {
  readonly version: 1;
  readonly operationId: string;
  readonly artifactPath: string;
  readonly destination: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly stagingDirectory: string;
  readonly parentIdentity: Identity;
  readonly directoryIdentity: Identity;
  readonly stageIdentity: Identity;
}

type Cleanup = "complete" | "pending";
export type SaveOutcome =
  | { readonly status: "saved"; readonly verification: "verified" | "unconfirmed"; readonly cleanup: Cleanup; readonly intent: SaveIntent }
  | { readonly status: "uncertain"; readonly intent: SaveIntent }
  | { readonly status: "stopped"; readonly reason: StopReason; readonly cleanup: Cleanup };

type StopReason = "cancelled" | "invalid-request" | "source-mismatch" | "destination-occupied" |
  "stage-mismatch" | "journal-failed" | "filesystem-unavailable" | "intent-mismatch";

export interface SaveHooks {
  /** Resolve only after the exact intent is durably recorded under this operation. */
  readonly persistPrepared: (intent: SaveIntent) => Promise<void>;
  readonly prepared?: SaveIntent;
  readonly signal?: AbortSignal;
}

const maxBytes = 32 * 1024 * 1024;
const stagePrefix = ".studio-portrait-";
const stageLeaf = "reviewed.mp4";
const bufferSize = 64 * 1024;
const stopped = (reason: StopReason, cleanup: Cleanup = "complete"): SaveOutcome =>
  ({ status: "stopped", reason, cleanup });

function code(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code : undefined;
}

function normalLocalPath(path: string): boolean {
  if (!isAbsolute(path) || path !== normalize(path) || path.includes("\0") || path === parse(path).root) return false;
  if (process.platform !== "win32") return !path.startsWith("//");
  if (!/^[A-Za-z]:\\/.test(path)) return false;
  return path.slice(3).split("\\").every((part) =>
    part.length > 0 && !/[<>:"|?*\x00-\x1f]/.test(part) && !/[. ]$/.test(part) &&
    !/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part));
}

function validRequest(a: ApprovedPortraitSave): boolean {
  return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(a.operationId) &&
    Number.isSafeInteger(a.bytes) && a.bytes > 0 && a.bytes <= maxBytes &&
    /^[a-f0-9]{64}$/.test(a.sha256) && normalLocalPath(a.artifactPath) &&
    normalLocalPath(a.destination) && /\.mp4$/i.test(basename(a.destination));
}

function identify(s: BigIntStats): Identity | undefined {
  if (s.ino <= 0n || s.birthtimeNs <= 0n) return;
  return { device: s.dev.toString(), inode: s.ino.toString(), birthNs: s.birthtimeNs.toString() };
}

function same(a: Identity | undefined, b: Identity | undefined): boolean {
  return !!a && !!b && a.device === b.device && a.inode === b.inode && a.birthNs === b.birthNs;
}

async function statOrAbsent(path: string): Promise<BigIntStats | undefined> {
  try { return await lstat(path, { bigint: true }); }
  catch (error) { if (code(error) === "ENOENT") return; throw error; }
}

async function stableParent(path: string): Promise<Identity | undefined> {
  if (relative(await realpath(path), path) !== "") return;
  const stat = await lstat(path, { bigint: true });
  return stat.isDirectory() ? identify(stat) : undefined;
}

function matchesIntent(intent: SaveIntent, a: ApprovedPortraitSave): boolean {
  return intent.version === 1 && intent.operationId === a.operationId &&
    intent.artifactPath === a.artifactPath && intent.destination === a.destination &&
    intent.bytes === a.bytes && intent.sha256 === a.sha256 &&
    normalLocalPath(intent.stagingDirectory) && dirname(intent.stagingDirectory) === dirname(a.destination) &&
    basename(intent.stagingDirectory) === stagePrefix + a.operationId;
}

/** Reads exactly the approved size, then probes for surplus. The optional writer is a fresh exclusive file. */
async function digest(file: FileHandle, size: number, writer?: FileHandle, signal?: AbortSignal): Promise<string | undefined> {
  const data = Buffer.alloc(Math.min(size, bufferSize));
  const hash = createHash("sha256");
  let position = 0;
  while (position < size) {
    signal?.throwIfAborted();
    const { bytesRead } = await file.read(data, 0, Math.min(size - position, data.length), position);
    if (!bytesRead) return;
    hash.update(data.subarray(0, bytesRead));
    if (writer) {
      let written = 0;
      while (written < bytesRead) {
        const { bytesWritten } = await writer.write(data, written, bytesRead - written, position + written);
        if (bytesWritten === 0) throw new Error("Stage write made no progress");
        written += bytesWritten;
      }
    }
    position += bytesRead;
  }
  if ((await file.read(data, 0, 1, position)).bytesRead !== 0) return;
  return hash.digest("hex");
}

async function verified(path: string, id: Identity, bytes: number, sha256: string): Promise<boolean> {
  const before = await statOrAbsent(path);
  if (!before?.isFile() || before.size !== BigInt(bytes) || !same(identify(before), id)) return false;
  const file = await open(path, "r");
  try {
    if (!same(identify(await file.stat({ bigint: true })), id)) return false;
    if (await digest(file, bytes) !== sha256) return false;
    const after = await statOrAbsent(path);
    return !!after && after.isFile() && same(identify(after), id) && before.mtimeNs === after.mtimeNs;
  } finally { await file.close(); }
}

/** Staging cleanup deliberately never removes unknown occupants or touches the destination. */
async function clean(directory: string, parent: Identity, directoryId?: Identity, fileId?: Identity): Promise<Cleanup> {
  try {
    if (!same(await stableParent(dirname(directory)), parent)) return "pending";
    const dir = await statOrAbsent(directory);
    if (!dir) return "complete";
    if (!dir.isDirectory() || !same(identify(dir), directoryId) || relative(await realpath(directory), directory) !== "") return "pending";
    const path = join(directory, stageLeaf);
    const stat = await statOrAbsent(path);
    if (stat) {
      if (!stat.isFile() || !same(identify(stat), fileId)) return "pending";
      await unlink(path);
    }
    await rmdir(directory);
    return "complete";
  } catch { return "pending"; }
}

async function settle(intent: SaveIntent, signal?: AbortSignal, resume = false): Promise<SaveOutcome> {
  const { destination, parentIdentity, stageIdentity, stagingDirectory, bytes, sha256 } = intent;
  const stage = join(stagingDirectory, stageLeaf);
  const cleanup = () => clean(stagingDirectory, parentIdentity, intent.directoryIdentity, stageIdentity);
  let linkedHere = false;
  try {
    if (!same(await stableParent(dirname(destination)), parentIdentity)) return { status: "uncertain", intent };
    const existing = await statOrAbsent(destination);
    if (existing) {
      if (!existing.isFile() || !same(identify(existing), stageIdentity))
        return stopped("destination-occupied", await cleanup());
      linkedHere = true;
      const ok = await verified(destination, stageIdentity, bytes, sha256);
      return { status: "saved", verification: ok ? "verified" : "unconfirmed", cleanup: ok ? await cleanup() : "pending", intent };
    }
    // After interruption, absence cannot disambiguate a lost publication from a user's later deletion.
    if (resume) return { status: "uncertain", intent };
    if (signal?.aborted) return stopped("cancelled", await cleanup());
    const dirStat = await statOrAbsent(stagingDirectory);
    if (!dirStat?.isDirectory() || !same(identify(dirStat), intent.directoryIdentity) ||
      relative(await realpath(stagingDirectory), stagingDirectory) !== "")
      return stopped("stage-mismatch", await cleanup());
    if (!await verified(stage, stageIdentity, bytes, sha256))
      return stopped("stage-mismatch", await cleanup());
    if (signal?.aborted) return stopped("cancelled", await cleanup());
    try {
      await link(stage, destination);
      linkedHere = true;
    } catch (error) {
      if (code(error) === "EEXIST") {
        const occupant = await statOrAbsent(destination);
        if (!occupant) return { status: "uncertain", intent };
        if (!occupant.isFile() || !same(identify(occupant), stageIdentity))
          return stopped("destination-occupied", await cleanup());
        linkedHere = true;
      } else {
        if (["ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EXDEV"].includes(code(error) ?? ""))
          return stopped("filesystem-unavailable", await cleanup());
        return { status: "uncertain", intent };
      }
    }
    const ok = await verified(destination, stageIdentity, bytes, sha256);
    return { status: "saved", verification: ok ? "verified" : "unconfirmed", cleanup: ok ? await cleanup() : "pending", intent };
  } catch {
    if (linkedHere) return { status: "saved", verification: "unconfirmed", cleanup: "pending", intent };
    return { status: "uncertain", intent };
  }
}

export async function saveApprovedPortrait(a: ApprovedPortraitSave, hooks: SaveHooks): Promise<SaveOutcome> {
  if (!validRequest(a)) return stopped("invalid-request");
  if (hooks.prepared) {
    if (!matchesIntent(hooks.prepared, a)) return stopped("intent-mismatch");
    return settle(hooks.prepared, hooks.signal, true);
  }
  if (hooks.signal?.aborted) return stopped("cancelled");
  let directory: string | undefined;
  let parent: Identity | undefined;
  let directoryIdentity: Identity | undefined;
  let stageIdentity: Identity | undefined;
  const fail = async (reason: StopReason): Promise<SaveOutcome> =>
    stopped(reason, directory && parent ? await clean(directory, parent, directoryIdentity, stageIdentity) : "complete");
  try {
    parent = await stableParent(dirname(a.destination));
    if (!parent) return stopped("filesystem-unavailable");
    if (await statOrAbsent(a.destination)) return stopped("destination-occupied");
    if (relative(await realpath(a.artifactPath), a.artifactPath) !== "") return stopped("source-mismatch");
    const initial = await statOrAbsent(a.artifactPath);
    if (!initial?.isFile() || initial.nlink !== 1n || initial.size !== BigInt(a.bytes)) return stopped("source-mismatch");
    const sourceIdentity = identify(initial);
    if (!sourceIdentity) return stopped("source-mismatch");
    const source = await open(a.artifactPath, "r");
    let matches = false;
    try {
      if (!same(identify(await source.stat({ bigint: true })), sourceIdentity)) return stopped("source-mismatch");
      const newDirectory = join(dirname(a.destination), stagePrefix + a.operationId);
      await mkdir(newDirectory, { mode: 0o700 });
      directory = newDirectory;
      directoryIdentity = await stableParent(directory);
      if (!directoryIdentity) return await fail("filesystem-unavailable");
      const output = await open(join(directory, stageLeaf), "wx+", 0o600);
      try {
        stageIdentity = identify(await output.stat({ bigint: true }));
        if (stageIdentity && await digest(source, a.bytes, output, hooks.signal) === a.sha256) {
          await output.sync();
          matches = await digest(output, a.bytes) === a.sha256;
        }
      } finally { await output.close(); }
    } finally { await source.close(); }
    if (!matches || !directory || !directoryIdentity || !stageIdentity) return fail("source-mismatch");
    if (hooks.signal?.aborted) return fail("cancelled");
    const intent: SaveIntent = { version: 1, operationId: a.operationId, artifactPath: a.artifactPath,
      destination: a.destination, bytes: a.bytes, sha256: a.sha256, stagingDirectory: directory,
      parentIdentity: parent, directoryIdentity, stageIdentity };
    try { await hooks.persistPrepared(intent); }
    catch { return fail("journal-failed"); }
    return await settle(intent, hooks.signal);
  } catch (error) {
    if (hooks.signal?.aborted) return fail("cancelled");
    return fail(code(error) === "ENOENT" ? "source-mismatch" : "filesystem-unavailable");
  }
}
