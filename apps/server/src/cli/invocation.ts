import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import type { ServerInstallation } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";

import packageJson from "../../package.json" with { type: "json" };
import {
  findPosixLauncher,
  readPosixLauncherTarget,
  resolveLauncherPath,
} from "../cloud/pinnedRuntime.ts";

const PINNED_RUNTIME_ENTRY = /^(.*)\/runtime\/versions\/[^/]+\/t3$/;

export type CliRunner = "npx" | "pnpm dlx" | "bunx";

/** Detection is best-effort; callers must fail closed to a plain `t3` command. */
export function detectCliRunner(entryPath: string): CliRunner | null {
  const path = entryPath.replaceAll("\\", "/");
  if (path.includes("/_npx/")) {
    return "npx";
  }
  if (
    path.includes("/pnpm/dlx/") ||
    path.includes("/.pnpm/dlx/") ||
    path.includes("/pnpm-cache/dlx/")
  ) {
    return "pnpm dlx";
  }
  if (path.includes("/.bun/install/cache/") || path.includes("/bunx-")) {
    return "bunx";
  }
  return null;
}

const InstallManifest = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  bin: Schema.optionalKey(Schema.Struct({ t3: Schema.String })),
});
const decodeInstallManifest = Schema.decodeUnknownEffect(Schema.fromJsonString(InstallManifest));

/**
 * `T3CODE_NPM_LAUNCHER_PATH` is inherited by child shells, so accept it only for this package
 * version to avoid claiming another `t3` invocation is the npm install.
 */
export const resolveEntryPath = Effect.gen(function* () {
  const npmLauncher = (yield* HostProcess.Environment).T3CODE_NPM_LAUNCHER_PATH?.trim();
  if (npmLauncher) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const manifest = yield* fs
      .readFileString(path.join(path.dirname(npmLauncher), "../package.json"))
      .pipe(Effect.flatMap(decodeInstallManifest), Effect.option);
    if (
      Option.isSome(manifest) &&
      manifest.value.name === "t3" &&
      manifest.value.version === packageJson.version
    ) {
      return npmLauncher;
    }
  }
  if (yield* HostProcess.IsExecutable) return yield* HostProcess.ExecutablePath;
  return (yield* HostProcess.Arguments)[1] ?? "";
});

export const resolveServerInstallation = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const entry = yield* fs.realPath(yield* resolveEntryPath);
  const runtime = PINNED_RUNTIME_ENTRY.exec(entry);
  if (runtime) {
    const launchedAs = yield* resolveLauncherPath;
    if (launchedAs === undefined) return null;
    const link = yield* fs.readLink(launchedAs).pipe(Effect.option);
    // A launcher script execs the runtime itself, so look for the script that runs it.
    const launcher = Option.isSome(link)
      ? launchedAs
      : yield* findPosixLauncher({
          launchedAs,
          versionsDir: path.join(runtime[1] || "/", "runtime/versions"),
        });
    // None for a runtime started directly, as SSH launches do, or through a copy.
    if (launcher === undefined) return null;
    const target = Option.isSome(link)
      ? path.resolve(path.dirname(launcher), link.value)
      : yield* readPosixLauncherTarget(launcher);
    // Keep the home as the launcher spells it; `t3 update` only repoints launchers into that spelling.
    const linked = target === undefined ? null : PINNED_RUNTIME_ENTRY.exec(target);
    if (!linked || (yield* fs.realPath(linked[1] || "/")) !== (runtime[1] || "/")) return null;
    return {
      kind: "t3-launcher",
      launcher,
      baseDir: linked[1] || "/",
    } satisfies ServerInstallation;
  }
  const match = /^(.*)\/lib\/node_modules\/t3\/(?:dist\/bin\.mjs|bin\/t3\.mjs)$/.exec(entry);
  if (!match) {
    const runner = detectCliRunner(entry);
    return runner === null
      ? null
      : ({ kind: runner === "pnpm dlx" ? "pnpm-dlx" : runner } satisfies ServerInstallation);
  }
  if (platform === "win32") return null;
  const prefix = match[1] || "/";
  if (
    prefix.includes("/node_modules/") ||
    /\/(?:Cellar|Caskroom)\//i.test(prefix) ||
    /\/mise\/installs\/(?!node\/)[^/]+\//.test(prefix)
  )
    return null;

  const packageRoot = path.join(prefix, "lib/node_modules/t3");
  const manifest = yield* fs
    .readFileString(path.join(packageRoot, "package.json"))
    .pipe(Effect.flatMap(decodeInstallManifest));
  if (manifest.name !== "t3" || !manifest.bin) return null;
  const bin = yield* fs.realPath(path.join(packageRoot, manifest.bin.t3));
  const globalBin = yield* fs.realPath(path.join(prefix, "bin/t3"));
  if (globalBin !== bin || bin !== entry) return null;
  return { kind: "npm-global", prefix } satisfies ServerInstallation;
}).pipe(Effect.orElseSucceed(() => null));

const STUDIO_CLI = "open-product-studio";

export const resolveCliCommand = (subcommand: string) =>
  Effect.succeed(`${STUDIO_CLI} ${subcommand}`.trimEnd());

const shellWord = (value: string) =>
  /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replaceAll("'", `'"'"'`)}'`;

/** PowerShell also treats typographic quotes as delimiters; escape them and suppress expansion. */
const powershellWord = (value: string) =>
  `"${value
    .replaceAll("`", "``")
    .replaceAll("$", "`$")
    .replace(/["\u201C\u201D\u201E]/g, "$&$&")}"`;

export const hostShellWord = (platform: NodeJS.Platform, value: string) =>
  platform === "win32" ? powershellWord(value) : shellWord(value);

/** Use Studio's own launcher when it is installed outside PATH. */
export const resolveHostCliCommand = Effect.fn("invocation.resolveHostCliCommand")(function* (
  subcommand: string,
  args: ReadonlyArray<string> = [],
) {
  const platform = yield* HostProcess.Platform;
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const shim = (yield* HostProcess.Environment).STUDIO_CLI_PATH?.trim();
  const ownLauncher =
    shim || ((yield* HostProcess.IsExecutable) ? yield* HostProcess.ExecutablePath : undefined);
  const useAbsolute =
    ownLauncher !== undefined &&
    path.isAbsolute(ownLauncher) &&
    /^open-product-studio(?:\.cmd|\.exe)?$/i.test(path.basename(ownLauncher)) &&
    (yield* fs.exists(ownLauncher).pipe(Effect.orElseSucceed(() => false)));
  const executable = useAbsolute
    ? (platform === "win32" ? "& " : "") + hostShellWord(platform, ownLauncher)
    : STUDIO_CLI;
  const command = [executable, subcommand, ...args.map((arg) => hostShellWord(platform, arg))]
    .filter(Boolean)
    .join(" ");
  return { command, launcher: useAbsolute };
});

/** A hint's command, run against the caller's `--base-dir` when one was given. */
export const resolveHostCliHint = (
  subcommand: string,
  baseDir: Option.Option<string>,
  args: ReadonlyArray<string> = [],
) =>
  resolveHostCliCommand(subcommand, [
    ...Option.match(baseDir, { onNone: () => [], onSome: (dir) => ["--base-dir", dir] }),
    ...args,
  ]).pipe(Effect.map(({ command }) => command));

/**
 * `sudo` resets PATH on most distributions, which drops a user-installed Node
 * (nvm, fnm, a tarball) and with it `npx` or a global `t3`, so the command
 * carries PATH through unless Node is on root's PATH too. An absolute launcher
 * needs neither.
 */
export const resolveRootCliCommand = Effect.fn("invocation.resolveRootCliCommand")(function* (
  subcommand: string,
  args: ReadonlyArray<string> = [],
) {
  const { command, launcher } = yield* resolveHostCliCommand(subcommand, args);
  if (launcher) return `sudo ${command}`;
  const executablePath = yield* HostProcess.ExecutablePath;
  const systemNode = ROOT_PATH_DIRECTORIES.some((directory) =>
    executablePath.startsWith(`${directory}/`),
  );
  return systemNode ? `sudo ${command}` : `sudo env "PATH=$PATH" ${command}`;
});

const ROOT_PATH_DIRECTORIES = [
  "/usr/local/sbin",
  "/usr/local/bin",
  "/usr/sbin",
  "/usr/bin",
  "/sbin",
  "/bin",
];
