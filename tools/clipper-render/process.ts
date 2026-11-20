import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

type FailureCode = "cancelled" | "timeout" | "spawn" | "read" | "output-limit" | "exit" | "termination";

export class LocalProcessError extends Error {
  readonly code: FailureCode;
  readonly exitCode: number | null;

  constructor(code: FailureCode, exitCode: number | null = null) {
    super(`Local media process failed (${code})`);
    this.name = "LocalProcessError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

interface ProcessOptions {
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
  readonly signal?: AbortSignal | undefined;
}

const TERMINATION_GRACE_MS = 2_000;

/** Internal to the host driver. Call only with a trusted executable and driver-owned argv. */
export async function runBoundedProcess(
  executable: string,
  args: readonly string[],
  options: ProcessOptions,
): Promise<{ stdout: string; stderr: string }> {
  const { cwd, timeoutMs, maxOutputBytes, signal } = options;
  if (signal?.aborted) throw new LocalProcessError("cancelled");

  const env: NodeJS.ProcessEnv = { LANG: "C", LC_ALL: "C" };
  if (process.platform === "win32" && process.env.SystemRoot) {
    env.SystemRoot = process.env.SystemRoot;
  }

  return new Promise((resolve, reject) => {
    let child: ChildProcessByStdio<null, Readable, Readable>;
    try {
      child = spawn(executable, args, {
        cwd, env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      reject(new LocalProcessError("spawn"));
      return;
    }

    let failure: LocalProcessError | undefined;
    let grace: NodeJS.Timeout | undefined;
    let bytes = 0;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const onAbort = () => stop("cancelled");
    const deadline = setTimeout(() => stop("timeout"), timeoutMs);

    function release() {
      clearTimeout(deadline);
      clearTimeout(grace);
      signal?.removeEventListener("abort", onAbort);
    }

    function stop(code: FailureCode) {
      if (failure) return;
      failure = new LocalProcessError(code);
      grace = setTimeout(() => {
        release();
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        reject(new LocalProcessError("termination"));
      }, TERMINATION_GRACE_MS);
      // Hard-stop a single qualified native executable with no helper processes.
      // 'close' is the confirmation that both the child and its pipes are done.
      try {
        child.kill("SIGKILL");
      } catch {
        // Keep waiting for close within the termination grace period.
      }
    }

    function collect(chunks: Buffer[], chunk: Buffer) {
      if (failure) return;
      bytes += chunk.length;
      if (bytes > maxOutputBytes) {
        stop("output-limit");
        return;
      }
      chunks.push(chunk);
    }

    child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
    child.stdout.on("error", () => stop("read"));
    child.stderr.on("error", () => stop("read"));
    child.on("error", () => stop("spawn"));
    child.once("close", (code) => {
      release();
      if (failure) reject(failure);
      else if (code !== 0) reject(new LocalProcessError("exit", code));
      else resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}
