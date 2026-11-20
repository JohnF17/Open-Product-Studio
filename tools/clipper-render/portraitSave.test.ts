import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { saveApprovedPortrait, type ApprovedPortraitSave, type SaveHooks, type SaveIntent } from "../../scripts/lib/clipper/portraitSave.ts";

const sha = (buffer: Uint8Array) => createHash("sha256").update(buffer).digest("hex");
const noop = async () => {};
const initialHooks: SaveHooks = { persistPrepared: noop };
const noSecondPrepare = async () => assert.fail("Recovery must never prepare a second save");
const stopped = (reason: string) => ({ status: "stopped", reason, cleanup: "complete" });

async function privateDirectory(t: TestContext, root = tmpdir()) {
  const path = await mkdtemp(join(resolve(root), "studio-save-check-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

async function fixture(t: TestContext, sourceRoot?: string) {
  const out = await privateDirectory(t);
  const input = await privateDirectory(t, sourceRoot);
  const payload = Buffer.alloc(169_853);
  for (let i = 0; i < payload.length; i++) payload[i] = (i * 31 + 7) % 256;
  const request: ApprovedPortraitSave = { operationId: randomUUID(), destination: join(out, "Portrait.mp4"),
    artifactPath: join(input, "reviewed.mp4"), bytes: payload.length, sha256: sha(payload) };
  await writeFile(request.artifactPath, payload);
  return { out, input, payload, request };
}

test("copy, independent digest, no-replace publication, cleanup, and read-only recovery after source loss", async (t) => {
  const { request, out, payload } = await fixture(t);
  let journal: SaveIntent | undefined;
  const result = await saveApprovedPortrait(request, { persistPrepared: async (intent) => {
    assert.deepEqual(await readdir(out), [intent.stagingDirectory.split(/[\\/]/).at(-1)]);
    assert.equal(sha(await readFile(join(intent.stagingDirectory, "reviewed.mp4"))), request.sha256);
    journal = JSON.parse(JSON.stringify(intent)) as SaveIntent;
  } });
  assert.ok(journal);
  assert.equal(result.status, "saved");
  assert.equal(result.verification, "verified");
  assert.equal(result.cleanup, "complete");
  assert.deepEqual(await readdir(out), ["Portrait.mp4"]);
  assert.deepEqual(await readFile(request.destination), payload);
  await unlink(request.artifactPath);
  const signal = AbortSignal.abort();
  const recovered = await saveApprovedPortrait(request, { persistPrepared: noSecondPrepare, prepared: journal, signal });
  assert.deepEqual(recovered, result);
});

test("preexisting destination, even with identical bytes, is preserved without preparing", async (t) => {
  const { request, payload, out } = await fixture(t);
  await writeFile(request.destination, payload);
  const before = await stat(request.destination, { bigint: true });
  assert.deepEqual(await saveApprovedPortrait(request, { persistPrepared: noSecondPrepare }), stopped("destination-occupied"));
  assert.equal((await stat(request.destination, { bigint: true })).ino, before.ino);
  assert.deepEqual(await readdir(out), ["Portrait.mp4"]);
});

test("stage verification prevents publication after the durable preparation hook changes the bytes", async (t) => {
  const { request, out } = await fixture(t);
  const outcome = await saveApprovedPortrait(request, { persistPrepared: async (intent) => {
    const stagePath = join(intent.stagingDirectory, "reviewed.mp4");
    await writeFile(stagePath, Buffer.alloc(intent.bytes, 255));
  } });
  assert.deepEqual(outcome, stopped("stage-mismatch"));
  assert.deepEqual(await readdir(out), []);
});

test("source digest, size and private single-file assumptions are enforced", async (t) => {
  const { request, out, input } = await fixture(t);
  const forbid = { persistPrepared: noSecondPrepare };
  for (const change of [{ bytes: request.bytes - 1 }, { sha256: "0".repeat(64) }]) {
    assert.deepEqual(await saveApprovedPortrait({ ...request, ...change }, forbid), stopped("source-mismatch"));
  }
  await link(request.artifactPath, join(input, "second-name.mp4"));
  assert.deepEqual(await saveApprovedPortrait(request, forbid), stopped("source-mismatch"));
  assert.deepEqual(await readdir(out), []);
});

test("cancellation before setup or during precommit never leaves a destination", async (t) => {
  const { request, out } = await fixture(t);
  assert.deepEqual(await saveApprovedPortrait(request, { signal: AbortSignal.abort(), persistPrepared: noSecondPrepare }), stopped("cancelled"));
  const abort = new AbortController();
  const result = await saveApprovedPortrait(request, { signal: abort.signal, persistPrepared: async () => abort.abort() });
  assert.deepEqual(result, stopped("cancelled"));
  assert.deepEqual(await readdir(out), []);
});

test("journal write failure aborts the save and cleans the destination stage", async (t) => {
  const { request, out } = await fixture(t);
  const result = await saveApprovedPortrait(request, { persistPrepared: async () => { throw new Error("test journal unavailable"); } });
  assert.deepEqual(result, stopped("journal-failed"));
  assert.deepEqual(await readdir(out), []);
});

test("a preexisting operation stage is left exactly as received", async (t) => {
  const { request, out } = await fixture(t);
  const existing = join(out, ".studio-portrait-" + request.operationId);
  await mkdir(existing);
  await writeFile(join(existing, "reviewed.mp4"), "preexisting");
  assert.deepEqual(await saveApprovedPortrait(request, { persistPrepared: noSecondPrepare }), stopped("filesystem-unavailable"));
  assert.equal(await readFile(join(existing, "reviewed.mp4"), "utf8"), "preexisting");
  assert.deepEqual(await readdir(out), [".studio-portrait-" + request.operationId]);
});

test("process termination around publication reconciles a committed file and preserves an uncertain private stage", async (t) => {
  const child = fileURLToPath(new URL("./crash.fixture.ts", import.meta.url));
  for (const mode of ["before-link", "after-save"] as const) {
    const { request, input, out, payload } = await fixture(t);
    const requestFile = join(input, "request.json");
    const journalFile = join(input, "intent.json");
    await writeFile(requestFile, JSON.stringify(request));
    const run = spawnSync(process.execPath, [child, mode, requestFile, journalFile], {
      encoding: "utf8", windowsHide: true, timeout: 15_000,
    });
    assert.equal(run.status, mode === "before-link" ? 37 : 38, run.stderr);
    const prepared = JSON.parse(await readFile(journalFile, "utf8")) as SaveIntent;
    const recovered = await saveApprovedPortrait(request, { prepared, persistPrepared: noSecondPrepare });
    if (mode === "before-link") {
      assert.equal(recovered.status, "uncertain");
      assert.deepEqual(await readdir(out), [".studio-portrait-" + request.operationId]);
      assert.deepEqual(await readFile(join(prepared.stagingDirectory, "reviewed.mp4")), payload);
    } else {
      assert.equal(recovered.status, "saved");
      assert.equal(recovered.verification, "verified");
      assert.deepEqual(await readdir(out), ["Portrait.mp4"]);
      assert.deepEqual(await readFile(request.destination), payload);
    }
  }
});

test("only one of two racing operations can publish at the same destination", async (t) => {
  const { request, out, payload } = await fixture(t);
  const barrier = Promise.withResolvers<void>();
  let prepared = 0;
  const persistPrepared = async () => { if (++prepared === 2) barrier.resolve(); await barrier.promise; };
  const results = await Promise.all([request, { ...request, operationId: randomUUID() }].map(a =>
    saveApprovedPortrait(a, { persistPrepared })));
  assert.equal(results.filter(x => x.status === "saved" && x.verification === "verified").length, 1);
  assert.equal(results.filter(x => x.status === "stopped" && x.reason === "destination-occupied").length, 1);
  assert.deepEqual(await readFile(request.destination), payload);
  assert.deepEqual(await readdir(out), ["Portrait.mp4"]);
});

test("failed postcommit cleanup leaves the valid export and unfamiliar entries intact", async (t) => {
  const { request, payload } = await fixture(t);
  const result = await saveApprovedPortrait(request, { persistPrepared: async (intent) => {
    await writeFile(join(intent.stagingDirectory, "unowned.txt"), "keep me");
  } });
  assert.equal(result.status, "saved");
  assert.equal(result.verification, "verified");
  assert.equal(result.cleanup, "pending");
  const foreign = join(result.intent.stagingDirectory, "unowned.txt");
  assert.equal(await readFile(foreign, "utf8"), "keep me");
  assert.deepEqual(await readFile(request.destination), payload);
  await unlink(foreign);
  const again = await saveApprovedPortrait(request, { prepared: result.intent, persistPrepared: noSecondPrepare });
  assert.equal(again.status, "saved");
  assert.equal(again.cleanup, "complete");
});

test("same bytes written as a different file cannot claim a previously saved receipt", async (t) => {
  const { request, out, payload } = await fixture(t);
  const saved = await saveApprovedPortrait(request, initialHooks);
  assert.equal(saved.status, "saved");
  await rename(request.destination, join(out, "moved.mp4"));
  await writeFile(request.destination, payload);
  const result = await saveApprovedPortrait(request, { prepared: saved.intent, persistPrepared: noSecondPrepare });
  assert.deepEqual(result, stopped("destination-occupied"));
  assert.deepEqual(await readFile(request.destination), payload);
});

test("a recovered operation with a missing destination never silently republishes it", async (t) => {
  const { request, out } = await fixture(t);
  const saved = await saveApprovedPortrait(request, initialHooks);
  assert.equal(saved.status, "saved");
  await unlink(request.destination);
  assert.deepEqual(await saveApprovedPortrait(request, { prepared: saved.intent, persistPrepared: noSecondPrepare }),
    { status: "uncertain", intent: saved.intent });
  assert.deepEqual(await readdir(out), []);
});

test("a later content modification is disclosed separately from the original commit", async (t) => {
  const { request, payload } = await fixture(t);
  const saved = await saveApprovedPortrait(request, initialHooks);
  assert.equal(saved.status, "saved");
  const changed = Buffer.alloc(payload.length);
  await writeFile(request.destination, changed);
  const outcome = await saveApprovedPortrait(request, { prepared: saved.intent, persistPrepared: noSecondPrepare });
  assert.equal(outcome.status, "saved");
  assert.equal(outcome.verification, "unconfirmed");
  assert.deepEqual(await readFile(request.destination), changed);
});

test("the host's exact journal binding rejects changed approval, operation, source or destination", async (t) => {
  const { request, out } = await fixture(t);
  const saved = await saveApprovedPortrait(request, initialHooks);
  assert.equal(saved.status, "saved");
  const hooks = { prepared: saved.intent, persistPrepared: noSecondPrepare };
  for (const change of [{ operationId: randomUUID() }, { sha256: "e".repeat(64) }, { bytes: 12 },
    { artifactPath: join(out, "other-input.mp4") }, { destination: join(out, "other.mp4") }]) {
    assert.deepEqual(await saveApprovedPortrait({ ...request, ...change }, hooks), stopped("intent-mismatch"));
  }
});

test("relative, non-MP4, and Windows special destination names fail before staging", async (t) => {
  const { request, out } = await fixture(t);
  const paths = ["relative.mp4", join(out, "a.exe")];
  if (process.platform === "win32") paths.push(join(out, "con.mp4"), join(out, "sample:stream.mp4"), "\\\\server\\share\\x.mp4");
  for (const destination of paths) {
    assert.deepEqual(await saveApprovedPortrait({ ...request, destination }, { persistPrepared: noSecondPrepare }), stopped("invalid-request"));
  }
  assert.deepEqual(await readdir(out), []);
});

test("a linked parent is refused and an existing directory is never replaced", async (t) => {
  const { request, out } = await fixture(t);
  const directory = await privateDirectory(t);
  const alias = join(out, "alias");
  await symlink(directory, alias, process.platform === "win32" ? "junction" : "dir");
  assert.deepEqual(await saveApprovedPortrait({ ...request, destination: join(alias, "x.mp4") }, initialHooks),
    stopped("filesystem-unavailable"));
  await mkdir(request.destination);
  assert.deepEqual(await saveApprovedPortrait(request, initialHooks), stopped("destination-occupied"));
  assert.ok((await lstat(request.destination)).isDirectory());
  assert.deepEqual(await readdir(directory), []);
});

test("staging and publication succeed with source and destination on separate real volumes", {
  skip: !process.env.CLIP_SAVE_TEST_SECOND_ROOT && "Set CLIP_SAVE_TEST_SECOND_ROOT to a writable second local volume",
}, async (t) => {
  const { request, out, payload } = await fixture(t, process.env.CLIP_SAVE_TEST_SECOND_ROOT);
  const source = await stat(request.artifactPath, { bigint: true });
  const targetDir = await stat(out, { bigint: true });
  assert.notEqual(source.dev, targetDir.dev, "Cross-volume qualification needs two physical volume IDs");
  const saved = await saveApprovedPortrait(request, { persistPrepared: async (intent) => {
    assert.equal(intent.stageIdentity.device, targetDir.dev.toString());
    assert.notEqual(intent.stageIdentity.device, source.dev.toString());
  } });
  assert.equal(saved.status, "saved");
  assert.equal(saved.verification, "verified");
  assert.deepEqual(await readFile(request.destination), payload);
});
