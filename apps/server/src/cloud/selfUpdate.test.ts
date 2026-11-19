import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import { ServerSelfUpdateError, type ManagedPolicyDocument } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as ServerConfig from "../config.ts";
import * as DesktopAppUpdate from "../desktopUpdate/DesktopAppUpdate.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";
import * as ServerSelfUpdate from "./selfUpdate.ts";
import * as ServiceLauncherClient from "./serviceLauncherClient.ts";

const unavailable = DesktopAppUpdate.DesktopAppUpdate.of({
  available: false,
  run: () => Effect.die("unexpected desktop preparation"),
  commit: () => Effect.die("unexpected desktop install"),
});

const makeService = (baseDir: string, desktop = unavailable, policy?: ManagedPolicyDocument) =>
  ServerSelfUpdate.make().pipe(
    Effect.provideService(DesktopAppUpdate.DesktopAppUpdate, desktop),
    Effect.provide(
      Layer.mergeAll(ManagedPolicy.layerTest(policy), ServerConfig.layerTest(baseDir, baseDir)),
    ),
  );

it.layer(NodeServices.layer)("Studio server self update", (it) => {
  it.effect("never stages, activates or prunes a T3 runtime, including under an inherited launcher", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "studio-update-" });
      const upstream = path.join(baseDir, "runtime", "versions", "0.0.1");
      yield* fs.makeDirectory(upstream, { recursive: true });
      const sentinel = path.join(upstream, ".install-complete");
      yield* fs.writeFileString(sentinel, "upstream fixture");
      yield* fs.utimes(sentinel, 0, 0);
      const service = yield* makeService(baseDir).pipe(
        Effect.provideService(HostProcess.Environment, {
          T3_SERVICE_LAUNCHER_CONTEXT: '{"protocol":4,"childVersion":"1.2.3"}',
          T3CODE_RELEASE_BASE_URL: "https://upstream.invalid",
        }),
        Effect.provideService(ServiceLauncherClient.ServiceLauncherClient, {
          managed: true,
          protocol: 4,
          requestUpdate: () => Effect.die("unexpected request to the upstream launcher"),
          prepareTrial: () => Effect.die("unexpected activation of an upstream runtime"),
        }),
      );
      const input = { targetVersion: "1.2.3" };
      for (const request of [input, { ...input, stageOnly: true }]) {
        const failure = yield* service.update(request).pipe(Effect.flip);
        expect(failure.reason).toContain("no configured desktop updater");
      }
      const streamFailure = yield* ServerSelfUpdate.updateProgressStream(service, input).pipe(
        Stream.runCollect,
        Effect.flip,
      );
      expect(streamFailure.reason).toContain("no configured desktop updater");
      const commitFailure = yield* service.commitDesktopUpdate("unowned-request").pipe(Effect.flip);
      expect(commitFailure.reason).toContain("no configured desktop updater");
      expect(yield* fs.readFileString(sentinel)).toBe("upstream fixture");
      expect(yield* fs.readDirectory(path.dirname(upstream))).toEqual(["0.0.1"]);
    }),
  );

  it.effect("delegates progress and commit only to the configured desktop updater", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const baseDir = yield* fs.makeTempDirectoryScoped();
      const calls: string[] = [];
      const desktop = DesktopAppUpdate.DesktopAppUpdate.of({
        available: true,
        run: (report) =>
          Effect.gen(function* () {
            calls.push("prepare");
            yield* report("downloading");
            return {
              targetVersion: "1.2.3",
              method: "desktop-app" as const,
              desktopUpdateToken: "fixture",
            };
          }),
        commit: (requestId) =>
          Effect.gen(function* () {
            calls.push(requestId);
            return yield* new ServerSelfUpdateError({ reason: "fixture install result" });
          }),
      });
      const service = yield* makeService(baseDir, desktop);
      const input = { targetVersion: "1.2.3" };
      const stagingFailure = yield* service.update({ ...input, stageOnly: true }).pipe(Effect.flip);
      expect(stagingFailure.reason).toContain("does not stage");
      const events = yield* ServerSelfUpdate.updateProgressStream(service, input).pipe(
        Stream.runCollect,
      );
      expect(Array.from(events)).toEqual([
        { type: "progress", stage: "downloading" },
        {
          type: "complete",
          result: { targetVersion: "1.2.3", method: "desktop-app", desktopUpdateToken: "fixture" },
        },
      ]);
      const commit = yield* service.commitDesktopUpdate("fixture").pipe(Effect.flip);
      expect(commit.reason).toBe("fixture install result");
      expect(calls).toEqual(["prepare", "fixture"]);
    }),
  );

  it.effect("respects a managed update refusal for both prepare and commit", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const service = yield* makeService(
        yield* fs.makeTempDirectoryScoped(),
        { ...unavailable, available: true },
        { schemaVersion: 1, organization: "Example Corp", limits: { updates: { mode: "off" } } },
      );
      const prepare = yield* service.update({ targetVersion: "1.2.3" }).pipe(Effect.flip);
      const commit = yield* service.commitDesktopUpdate("fixture").pipe(Effect.flip);
      expect(prepare.reason).toBe("Example Corp manages Open Product Studio updates.");
      expect(commit.reason).toBe(prepare.reason);
    }),
  );
});

it("a host crosses tracks only to a release that knows its whole database", () => {
  const cross = (
    serverVersion: string,
    targetVersion: string,
    targetDatabaseMigration: number | undefined,
    databaseMigration = 72,
  ) =>
    ServerSelfUpdate.trackSwitchBlockReason({
      serverVersion,
      targetVersion,
      targetDatabaseMigration,
      databaseMigration: () => databaseMigration,
    });
  const nightly = "0.1.4-nightly.20261027.3796";

  expect(cross(nightly, "0.1.4", 72)).toBeNull();
  // Another client moved this host to a newer Nightly after the switch was planned.
  expect(cross(nightly, "0.1.4", 72, 73)).toContain("does not support yet");
  expect(cross(nightly, "0.1.4", undefined)).toContain("Cannot confirm");
  // A Stable tag can carry a migration the latest Nightly lacks.
  expect(cross("0.1.4", nightly, 72, 73)).toContain("does not support yet");
  expect(cross("0.1.3", "0.1.4", undefined)).toBeNull();
  // A database that exists but cannot be read proves nothing.
  expect(
    ServerSelfUpdate.trackSwitchBlockReason({
      serverVersion: nightly,
      targetVersion: "0.1.4",
      targetDatabaseMigration: 72,
      databaseMigration: () => undefined,
    }),
  ).toContain("Cannot confirm");
});
