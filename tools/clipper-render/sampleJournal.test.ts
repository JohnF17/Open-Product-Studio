import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { saveApprovedPortrait } from "../../scripts/lib/clipper/portraitSave.ts";
import { reconcilePrepared, recordAuthorized, recordPrepared } from "../../apps/desktop/src/clipper/sampleJournal.ts";

for (const removed of [false, true]) {
  test(removed ? "recovery preserves a subsequent deletion" : "recovery recognizes the committed identity", async t => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "studio-sample-journal-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    const directory = join(root, "clipper-sample");
    const job = join(directory, "job-123456", "portrait-abcdef");
    await mkdir(job, { recursive: true });
    const artifactPath = join(job, "portrait.mp4");
    const destination = join(root, "saved.mp4");
    const bytes = Buffer.from("reviewed save journal fixture");
    await writeFile(artifactPath, bytes);
    const operationId = "ffffffff-0000-4000-8000-000000000001";
    const retained = Array.from({ length: 40 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}.prepared.json`);
    for (const name of retained) await writeFile(join(directory, name), "{}");
    const request = { operationId, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), artifactPath, destination };
    await recordAuthorized(directory, request);
    const result = await saveApprovedPortrait(request, { persistPrepared: intent => recordPrepared(directory, intent) });
    assert.equal(result.status, "saved");
    const name = operationId + ".prepared.json";
    assert.ok((await readdir(directory)).includes(name));
    if (removed) await unlink(destination);
    await reconcilePrepared(directory, async () => true);
    assert.equal((await readdir(root)).includes("saved.mp4"), !removed);
    assert.equal((await readdir(directory)).includes(name), removed);
    assert.ok((await readdir(directory)).includes(retained[0]!));
  });
}
