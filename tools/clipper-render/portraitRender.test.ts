import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { before, test, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createPortraitRenderDriver, verifyQualifiedFfmpeg } from "../../scripts/lib/clipper/portraitRender.ts";
import { qualificationReceipt } from "./qualify.ts";

const binaryPath = process.env.CLIP_RENDER_TEST_FFMPEG;
const sha256 = process.env.CLIP_RENDER_TEST_FFMPEG_SHA256;
if (Boolean(binaryPath) !== Boolean(sha256)) throw new Error("Supply both CLIP_RENDER_TEST_FFMPEG and its trusted SHA-256.");
const binary = binaryPath && sha256 ? { path: binaryPath, sha256 } : undefined;
const mediaOptions = { skip: binary ? false : "Set the explicit local FFmpeg path and SHA-256" };
before(async () => { if (binary) await verifyQualifiedFfmpeg(binary); });
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function setup(t: TestContext) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "studio-test-portrait-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const jobDirectory = await mkdtemp(join(root, "job-"));
  return { root, jobDirectory, inputPath: join(root, "selected source.webm") };
}

function fixture(path: string, mode: "silent" | "audio" | "variable" | "short" = "silent") {
  assert.ok(binary);
  // Frames 0..29 red, 30..59 green, 60..89 blue, 90..119 yellow.
  execFileSync(binary.path, [
    "-nostdin", "-v", "error", "-n", "-f", "lavfi", "-i", "color=red:s=800x450:r=24:d=5",
    ...(mode === "audio" ? ["-f", "lavfi", "-i", "sine=frequency=440:duration=5", "-c:a", "libopus"] : []),
    "-vf", [
      "drawbox=color=lime:t=fill:enable='between(n,30,59)'",
      "drawbox=color=blue:t=fill:enable='between(n,60,89)'",
      "drawbox=color=yellow:t=fill:enable='gte(n,90)'",
      "drawbox=x=274:y=0:w=24:h=450:color=white:t=fill",
      "drawbox=x=502:y=0:w=24:h=450:color=black:t=fill",
      ...(mode === "short" ? ["trim=end_frame=100"] : []),
      ...(mode === "variable" ? ["select='not(eq(n,12))'"] : []),
    ].join(","),
    "-fps_mode", "passthrough", "-filter_threads", "1", "-c:v", "libvpx-vp9",
    "-threads", "2", "-g", "120", "-deadline", "realtime", "-f", "webm", path,
  ], { timeout: 15_000, maxBuffer: 32_768, windowsHide: true });
}

const cut = { startFrame: 30, endFrameExclusive: 90 };

test("stages the marked 60 frames with the correct center and both crop edges", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath);
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  const existing = join(jobDirectory, "portrait.mp4");
  await writeFile(existing, "existing");
  const driver = createPortraitRenderDriver(binary);
  const rendered = await driver.render({ source, jobDirectory, cut });
  assert.equal(rendered.preset, "portrait-360x640-24-silent");
  assert.equal(rendered.frameCount, 60);
  assert.equal(rendered.sourceFrameCount, 120);
  assert.deepEqual(rendered.duration, { ticks: 30720, timescale: 12288 });
  assert.equal(rendered.audio, "silent");
  assert.deepEqual([rendered.width, rendered.height], [360, 640]);
  const output = await readFile(rendered.path);
  assert.equal(rendered.bytes, output.length);
  assert.equal(rendered.sha256, digest(output));
  assert.equal(source.sha256, digest(await readFile(inputPath)));
  assert.equal(await readFile(existing, "utf8"), "existing");
  const pixels = execFileSync(binary.path, [
    "-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file", "-f", "mov",
    "-i", rendered.path, "-vf", "scale=36:64,format=rgb24,crop=36:1:0:32", "-threads", "1",
    "-fps_mode", "passthrough", "-f", "rawvideo", "-",
  ], { timeout: 10_000, maxBuffer: 8192, windowsHide: true });
  assert.equal(pixels.length, 60 * 36 * 3);
  function pixel(frame: number, x: number) {
    const offset = (frame * 36 + x) * 3;
    return pixels.subarray(offset, offset + 3);
  }
  for (let frame = 0; frame < 60; frame++) {
    assert.ok(pixel(frame, 1).every(channel => channel > 225), `left edge of frame ${frame}`);
    assert.ok(pixel(frame, 34).every(channel => channel < 30), `right edge of frame ${frame}`);
  }
  const first = pixel(0, 18);
  const last = pixel(59, 18);
  assert.ok(first[0]! < 20 && first[1]! > 230 && first[2]! < 20, String(first));
  assert.ok(last[0]! < 20 && last[1]! < 20 && last[2]! > 230, String(last));
});

test("a clean short fixture can render the cut but cannot produce a qualification receipt", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath, "short");
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  const rendered = await createPortraitRenderDriver(binary).render({ source, jobDirectory, cut });
  assert.equal(rendered.frameCount, 60);
  assert.equal(rendered.sourceFrameCount, 100);
  assert.throws(() => qualificationReceipt(rendered), /Expected 120 decoded fixture frames, received 100/);
});

test("the final eligible single frame has exact movie-level timing", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath);
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  const rendered = await createPortraitRenderDriver(binary).render({
    source, jobDirectory, cut: { startFrame: 119, endFrameExclusive: 120 },
  });
  assert.deepEqual(rendered.duration, { ticks: 512, timescale: 12288 });
  const output = await readFile(rendered.path);
  const movieHeader = output.indexOf("mvhd") + 4;
  assert.ok(movieHeader > 4);
  assert.equal(output.readUInt32BE(movieHeader + 12), 12288);
  assert.equal(output.readUInt32BE(movieHeader + 16), 512);
});

test("cancelling after the encoder opens the MP4 removes the staged output", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath);
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  const controller = new AbortController();
  let settled = false;
  const result = createPortraitRenderDriver(binary)
    .render({ source, jobDirectory, cut, signal: controller.signal })
    .finally(() => { settled = true; });
  const cancelled = assert.rejects(result, { code: "cancelled" });
  // Attach a handler while observing the filesystem so early settlement stays observable.
  void cancelled.catch(() => undefined);
  try {
    let outputOpened = false;
    for (let attempt = 0; attempt < 1500 && !settled; attempt += 1) {
      const stage = (await readdir(jobDirectory)).find(name => name.startsWith("portrait-"));
      if (stage && (await readdir(join(jobDirectory, stage))).includes("portrait.mp4")) {
        outputOpened = true;
        break;
      }
      await delay(10);
    }
    assert.ok(outputOpened && !settled, "encoder should have opened the staged file before cancellation");
    controller.abort();
    await cancelled;
    assert.deepEqual(await readdir(jobDirectory), []);
  } finally {
    controller.abort();
    await result.catch(() => undefined);
  }
});

test("refuses audio-bearing sources without staging an artifact", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath, "audio");
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  await assert.rejects(createPortraitRenderDriver(binary).render({ source, jobDirectory, cut }), {
    code: "unsupported-source",
  });
  assert.deepEqual(await readdir(jobDirectory), []);
});

test("refuses missing presentation timestamps on the 24 fps grid", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath, "variable");
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  await assert.rejects(createPortraitRenderDriver(binary).render({ source, jobDirectory, cut }), {
    code: "unsupported-source",
  });
  assert.deepEqual(await readdir(jobDirectory), []);
});

test("refuses an end cut beyond the decoded source", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  fixture(inputPath);
  const source = { path: inputPath, sha256: digest(await readFile(inputPath)) };
  await assert.rejects(
    createPortraitRenderDriver(binary).render({
      source, jobDirectory, cut: { startFrame: 30, endFrameExclusive: 121 },
    }),
    { code: "invalid-cut" },
  );
  assert.deepEqual(await readdir(jobDirectory), []);
});

test("fails closed on a corrupt selected file", mediaOptions, async (t) => {
  assert.ok(binary);
  const { jobDirectory, inputPath } = await setup(t);
  const corrupt = Buffer.from("synthetic invalid WebM");
  await writeFile(inputPath, corrupt);
  const source = { path: inputPath, sha256: digest(corrupt) };
  await assert.rejects(createPortraitRenderDriver(binary).render({ source, jobDirectory, cut }), {
    code: "exit", phase: "inspect",
  });
  assert.deepEqual(await readdir(jobDirectory), []);
});

test("pre-aborted requests leave an existing job file byte-identical", async (t) => {
  const { jobDirectory, inputPath } = await setup(t);
  const previous = join(jobDirectory, "portrait.mp4");
  await writeFile(previous, "previous");
  const controller = new AbortController();
  controller.abort();
  const source = { path: inputPath, sha256: "0".repeat(64) };
  const driver = createPortraitRenderDriver({ path: process.execPath, sha256: "0".repeat(64) });
  await assert.rejects(driver.render({ source, jobDirectory, cut, signal: controller.signal }), {
    code: "cancelled",
  });
  assert.deepEqual(await readdir(jobDirectory), ["portrait.mp4"]);
  assert.equal(await readFile(previous, "utf8"), "previous");
});

test("rejects a mismatched executable digest before launch", async (t) => {
  const { jobDirectory, inputPath } = await setup(t);
  const input = Buffer.from("synthetic input");
  await writeFile(inputPath, input);
  const source = { path: inputPath, sha256: digest(input) };
  const driver = createPortraitRenderDriver({ path: process.execPath, sha256: "0".repeat(64) });
  await assert.rejects(driver.render({ source, jobDirectory, cut }), { code: "binary-mismatch" });
  assert.deepEqual(await readdir(jobDirectory), []);
});
