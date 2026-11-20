import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test, type TestContext } from "node:test";
import { createSampleHost } from "../../apps/desktop/src/clipper/sampleHost.ts";

const windows = { skip: process.platform !== "win32" || process.arch !== "x64" };
const encoder = process.env.CLIP_RENDER_TEST_FFMPEG;
const wheelPath = process.env.CLIP_SAMPLE_TEST_WHEEL;
const qualified = { skip: windows.skip || !encoder };

async function fixture(t: TestContext) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "studio-host-test-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const profileDirectory = join(root, "profile");
  await mkdir(profileDirectory);
  const host = createSampleHost({ profileDirectory, isAllowedVolume: async () => true });
  t.after(() => host.release("window"));
  return { root, profileDirectory, host };
}

const closed = { pickEncoder: async () => undefined, pickDestination: async () => undefined };

test("missing or unqualified encoder leaves the sample unenrolled", windows, async t => {
  const { root, host } = await fixture(t);
  assert.deepEqual(await host.handle("window", { action: "status" }, closed), { status: "needs-encoder" });
  assert.deepEqual(await host.handle("window", { action: "enroll" }, closed), { status: "cancelled" });
  const file = join(root, "unrelated.exe");
  await writeFile(file, "unrelated fixture");
  assert.deepEqual(await host.handle("window", { action: "enroll" }, { ...closed, pickEncoder: async () => file }), { status: "needs-encoder" });
  await truncate(file, 31_246_824);
  assert.deepEqual(await host.handle("window", { action: "enroll" }, { ...closed, pickEncoder: async () => file }), { status: "needs-encoder" });
  assert.deepEqual(await host.handle("window", { action: "status" }, closed), { status: "needs-encoder" });
});

test("the published wheel enrolls directly and the host fingerprint verifies on reopen", {
  skip: windows.skip || !wheelPath,
}, async t => {
  const { host } = await fixture(t);
  assert.deepEqual(await host.handle("window", { action: "enroll" }, { ...closed, pickEncoder: async () => wheelPath }), { status: "ready" });
  await host.release("window");
  assert.deepEqual(await host.handle("new-window", { action: "status" }, closed), { status: "ready" });
  await host.release("new-window");
});

test("native save writes the exact reviewed bytes for its owning document and project", qualified, async t => {
  const { root, host, profileDirectory } = await fixture(t);
  const projectId = randomUUID();
  const output = join(root, "reviewed.mp4");
  const dialogs = { pickEncoder: async () => encoder, pickDestination: async () => output };
  assert.deepEqual(await host.handle("window", { action: "enroll" }, dialogs), { status: "ready" });
  assert.deepEqual(await host.handle("window", { action: "status" }, dialogs), { status: "ready" });
  const review = await host.handle("window", { action: "render", projectId, startFrame: 30, endFrameExclusive: 90 }, dialogs);
  assert.equal(review.status, "review");
  if (review.status !== "review") return;
  const request = { action: "save" as const, projectId, token: review.token };
  assert.deepEqual(await host.handle("different-window", request, dialogs), { status: "failed" });
  assert.deepEqual(await host.handle("window", { ...request, projectId: randomUUID() }, dialogs), { status: "failed" });
  assert.deepEqual(await host.handle("window", request, closed), { status: "cancelled" });
  await writeFile(output, "earlier export");
  assert.deepEqual(await host.handle("window", request, dialogs), { status: "occupied" });
  assert.equal(await readFile(output, "utf8"), "earlier export");
  const final = join(root, "second.mp4");
  assert.deepEqual(await host.handle("window", request, { ...dialogs, pickDestination: async () => final }), { status: "saved" });
  const bytes = await readFile(final);
  assert.deepEqual(bytes, Buffer.from(review.base64, "base64"));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "9b0027813dcff34b22f8d1d0bd31dea990aaf4c93270724abb047231c886b277");
  assert.deepEqual(await host.handle("window", request, { ...dialogs, pickDestination: async () => assert.fail("duplicate dialog") }), { status: "saved" });
  await host.release("window");
  assert.deepEqual(await host.handle("window", request, dialogs), { status: "failed" });
  assert.deepEqual(await readdir(join(profileDirectory, "clipper-sample")), ["encoder"]);
});

test("release during native file selection cannot enroll the later result", windows, async t => {
  const { host, profileDirectory } = await fixture(t);
  const opened = Promise.withResolvers<void>();
  const result = Promise.withResolvers<string | undefined>();
  const pending = host.handle("window", { action: "enroll" }, {
    ...closed, pickEncoder: () => { opened.resolve(); return result.promise; },
  });
  await opened.promise;
  assert.deepEqual(await host.handle("window", { action: "status" }, closed), { status: "failed" });
  const release = host.release("window");
  result.resolve(join(dirname(profileDirectory), "never-opened.exe"));
  await release;
  assert.deepEqual(await pending, { status: "cancelled" });
});
