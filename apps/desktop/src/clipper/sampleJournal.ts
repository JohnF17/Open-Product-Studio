// @effect-diagnostics nodeBuiltinImport:off -- Recovery uses flushed exclusive files and no-replace hard links across process restarts.
import { link, lstat, open, opendir, readFile, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { saveApprovedPortrait, type ApprovedPortraitSave, type SaveIntent } from "../../../../scripts/lib/clipper/portraitSave.ts";

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const suffix = ".prepared.json";
const requestFrom = (intent: SaveIntent): ApprovedPortraitSave => ({
  operationId: intent.operationId, artifactPath: intent.artifactPath, destination: intent.destination,
  bytes: intent.bytes, sha256: intent.sha256,
});

/** A closed and flushed record becomes visible before the next phase can run. */
async function writeOnce(final: string, contents: ApprovedPortraitSave | SaveIntent) {
  const temp = final + ".tmp";
  const handle = await open(temp, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(contents));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await link(temp, final);
  await unlink(temp).catch(() => {});
}

export async function recordAuthorized(directory: string, request: ApprovedPortraitSave) {
  await writeOnce(join(directory, request.operationId + ".authorized.json"), request);
}

export async function recordPrepared(directory: string, intent: SaveIntent) {
  await writeOnce(join(directory, intent.operationId + suffix), intent);
}

export async function forgetOperation(directory: string, operationId: string) {
  await unlink(join(directory, operationId + suffix)).catch(() => {});
  await unlink(join(directory, operationId + ".authorized.json")).catch(() => {});
}

function identity(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return ["device", "inode", "birthNs"].every(key => {
    const field: unknown = Reflect.get(value, key);
    return typeof field === "string" && /^\d{1,32}$/.test(field);
  });
}

function prepared(value: unknown, id: string, root: string): value is SaveIntent {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SaveIntent>;
  if (v.version !== 1 || v.operationId !== id || typeof v.artifactPath !== "string" ||
      typeof v.destination !== "string" || typeof v.stagingDirectory !== "string" || typeof v.bytes !== "number" ||
      typeof v.sha256 !== "string" || !identity(v.parentIdentity) || !identity(v.directoryIdentity) || !identity(v.stageIdentity)) return false;
  const stage = dirname(v.artifactPath);
  const job = dirname(stage);
  return basename(v.artifactPath) === "portrait.mp4" && /^portrait-[a-z\d]{6}$/i.test(basename(stage)) &&
    /^job-[a-z\d]{6}$/i.test(basename(job)) && dirname(job) === root;
}

/** Reconcile an interrupted host save by identity. A missing destination never triggers publication. */
export async function reconcilePrepared(directory: string, allowed: (path: string) => Promise<boolean>) {
  const entries = await opendir(directory, { bufferSize: 32 });
  for await (const entry of entries) {
    const name = entry.name;
    if (!entry.isFile() || !name.endsWith(suffix)) continue;
    const id = name.slice(0, -suffix.length);
    if (!uuid.test(id)) continue;
    try {
      const file = join(directory, name);
      const info = await lstat(file);
      if (!info.isFile() || info.size > 32_768) continue;
      const intent: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!prepared(intent, id, directory)) continue;
      const authorization = join(directory, id + ".authorized.json");
      const record = await lstat(authorization);
      if (!record.isFile() || record.size > 32_768) continue;
      const approved: unknown = JSON.parse(await readFile(authorization, "utf8"));
      const expected = requestFrom(intent);
      if (!approved || typeof approved !== "object" ||
          !Object.entries(expected).every(([key, value]) => Reflect.get(approved, key) === value) ||
          !await allowed(dirname(intent.destination))) continue;
      const result = await saveApprovedPortrait(expected, {
        prepared: intent, persistPrepared: async () => { throw new Error("Recovery cannot start a new save."); },
      });
      if (result.status === "saved" && result.verification === "verified" && result.cleanup === "complete") await forgetOperation(directory, id);
    } catch {
      // An unavailable drive or interrupted journal remains available for a later reconciliation.
    }
  }
}
