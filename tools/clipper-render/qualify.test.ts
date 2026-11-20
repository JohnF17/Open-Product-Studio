import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";

const cli = join(import.meta.dirname, "qualify.ts");
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const binary = process.env.CLIP_RENDER_TEST_FFMPEG;
const sha256 = process.env.CLIP_RENDER_TEST_FFMPEG_SHA256;

async function paths(t: TestContext) {
  const base = await realpath(tmpdir());
  const root = await mkdtemp(join(base, "studio-qualify-test-"));
  t.after(() => {
    assert.equal(dirname(root), base);
    return rm(root, { recursive: true, force: true });
  });
  return { root, out: join(root, "qualified") };
}

function run(binaryPath: string, pin: string, out: string, fault?: { preload: string; temp: string }) {
  const options = fault ? ["--import", pathToFileURL(fault.preload).href] : [];
  const result = spawnSync(process.execPath, [...options, cli, "--ffmpeg", binaryPath, "--sha256", pin, "--out", out], {
    encoding: "utf8", timeout: 70_000, maxBuffer: 65_536, windowsHide: true,
    env: fault ? { ...process.env, TMPDIR: fault.temp, TMP: fault.temp, TEMP: fault.temp } : process.env,
  });
  assert.ifError(result.error);
  return result;
}

test("rejects a wrong executable digest before generating or publishing the fixture", async (t) => {
  const { root, out } = await paths(t);
  const file = join(root, "unqualified");
  await writeFile(file, "inert qualification fixture");
  const result = run(file, "f".repeat(64), out);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /binary-mismatch/);
  assert.deepEqual(await readdir(root), ["unqualified"]);
});

test("refuses an existing destination and preserves its contents", async (t) => {
  const { out } = await paths(t);
  await mkdir(out);
  await writeFile(join(out, "portrait.mp4"), "existing work");
  const result = run(process.execPath, "0".repeat(64), out);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(await readFile(join(out, "portrait.mp4"), "utf8"), "existing work");
  assert.deepEqual(await readdir(out), ["portrait.mp4"]);
});

test("publishes a decodable portrait and a path-free receipt for the pinned synthetic run", {
  skip: binary && sha256 ? false : "Supply a pinned local FFmpeg for media qualification",
}, async (t) => {
  assert.ok(binary && sha256);
  const { root, out } = await paths(t);
  const runResult = run(binary, sha256, out);
  assert.equal(runResult.status, 0, runResult.stderr);
  assert.deepEqual((await readdir(out)).sort(), ["portrait.mp4", "receipt.json"]);
  const receipt = JSON.parse(await readFile(join(out, "receipt.json"), "utf8"));
  assert.equal(receipt.scope, "synthetic-local-render");
  assert.equal(receipt.rendererSha256, sha256.toLowerCase());
  assert.equal(receipt.source.frames, 120);
  assert.deepEqual(receipt.cut, { startFrame: 30, endFrameExclusive: 90 });
  assert.equal(receipt.artifact.frameCount, 60);
  assert.deepEqual(receipt.artifact.duration, { ticks: 30_720, timescale: 12_288 });
  const bytes = await readFile(join(out, "portrait.mp4"));
  assert.equal(receipt.artifact.bytes, bytes.length);
  assert.equal(receipt.artifact.sha256, digest(bytes));
  for (const path of [binary, root]) assert.ok(!JSON.stringify(receipt).includes(JSON.stringify(path).slice(1, -1)));
});

test("cleanup failures warn about retained paths and preserve the committed result", {
  skip: binary && sha256 ? false : "Supply a pinned local FFmpeg for media qualification",
}, async (t) => {
  assert.ok(binary && sha256);
  const { root, out } = await paths(t);
  const preload = join(root, "deny-cleanup.mjs");
  await writeFile(preload, `
    import fs from "node:fs/promises";
    import { basename } from "node:path";
    import { syncBuiltinESMExports } from "node:module";
    const { rm, unlink } = fs;
    fs.unlink = async (path) => {
      if (basename(path) === ".receipt.pending") throw new Error("test cleanup failure");
      return unlink(path);
    };
    fs.rm = async (path, options) => {
      if (basename(path).startsWith("ops-portrait-qualify-")) throw new Error("test cleanup failure");
      return rm(path, options);
    };
    syncBuiltinESMExports();
  `);
  const result = run(binary, sha256, out, { preload, temp: root });
  assert.equal(result.status, 0, result.stderr);
  const work = (await readdir(root)).filter(name => name.startsWith("ops-portrait-qualify-"));
  assert.equal(work.length, 1);
  assert.ok(result.stderr.includes(join(root, work[0]!)));
  assert.ok(result.stderr.includes(join(out, ".receipt.pending")));
  const receipt = JSON.parse(await readFile(join(out, "receipt.json"), "utf8"));
  assert.equal(receipt.artifact.sha256, digest(await readFile(join(out, "portrait.mp4"))));
  const retry = run(binary, sha256, out);
  assert.equal(retry.status, 1);
  assert.match(retry.stderr, /already exists/);
  assert.equal(receipt.artifact.sha256, digest(await readFile(join(out, "portrait.mp4"))));
});
