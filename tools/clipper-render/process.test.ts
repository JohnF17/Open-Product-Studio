import assert from "node:assert/strict";
import { mkdtemp, readFile, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { runBoundedProcess } from "../../scripts/lib/clipper/process.ts";

const options = { cwd: process.cwd(), timeoutMs: 3_000, maxOutputBytes: 256 };

test("native Windows children receive only the system search locations", { skip: process.platform !== "win32" }, async () => {
  const original = process.env.PATH;
  const marker = join(tmpdir(), "studio-parent-path-marker");
  process.env.PATH = marker + ";" + original;
  try {
    const result = await runBoundedProcess(process.execPath, ["-e", "process.stdout.write(process.env.PATH)"], options);
    const root = process.env.SystemRoot!;
    assert.equal(result.stdout, join(root, "System32") + ";" + root);
    assert.ok(!result.stdout.includes(marker));
  } finally {
    if (original === undefined) delete process.env.PATH;
    else process.env.PATH = original;
  }
});

test("cancellation kills an active child and waits for its close", async () => {
  const controller = new AbortController();
  const dir = await mkdtemp(join(tmpdir(), "studio-test-child-"));
  const marker = join(dir, "started");
  const args = [
    "-e", "require('node:fs').writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)",
    marker,
  ];
  const running = assert.rejects(
    runBoundedProcess(process.execPath, args, { ...options, cwd: dir, signal: controller.signal }),
    { code: "cancelled" },
  );
  try {
    let pid: number | undefined;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const contents = await readFile(marker, "utf8").catch(() => "");
      if (/^\d+$/.test(contents)) {
        pid = Number(contents);
        break;
      }
      await delay(20);
    }
    assert.ok(pid, "the child must be running before cancellation");
    controller.abort();
    await running;
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  } finally {
    controller.abort();
    await running;
    await unlink(marker).catch(() => undefined);
    await rmdir(dir);
  }
});

test("process deadline fails a hanging child", async () => {
  await assert.rejects(
    runBoundedProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      ...options, timeoutMs: 200,
    }),
    { code: "timeout" },
  );
});

test("oversize diagnostics fail the process", async () => {
  await assert.rejects(
    runBoundedProcess(process.execPath, ["-e", "process.stderr.write('x'.repeat(4096))"], options),
    { code: "output-limit" },
  );
});

test("nonzero exit fails without returning captured diagnostics", async () => {
  await assert.rejects(
    runBoundedProcess(process.execPath, ["-e", "console.error('private'); process.exitCode = 7"], options),
    { code: "exit", exitCode: 7 },
  );
});
