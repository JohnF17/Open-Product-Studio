import type {
  DesktopDiscoveredSshHost,
  DesktopSshEnvironmentBootstrap,
  DesktopSshEnvironmentTarget,
} from "@t3tools/contracts";
import { resolveSshTarget } from "@t3tools/ssh/command";
import { discoverSshHosts } from "@t3tools/ssh/config";
import {
  SshCommandError,
  SshHostDiscoveryError,
  SshInvalidTargetError,
  SshLaunchError,
} from "@t3tools/ssh/errors";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

export class DesktopSshEnvironment extends Context.Service<
  DesktopSshEnvironment,
  {
    readonly discoverHosts: (input?: {
      readonly homeDir?: string;
    }) => Effect.Effect<readonly DesktopDiscoveredSshHost[], SshHostDiscoveryError>;
    readonly resolveHost: (
      alias: string,
    ) => Effect.Effect<DesktopSshEnvironmentTarget, SshCommandError | SshInvalidTargetError>;
    readonly ensureEnvironment: (
      target: DesktopSshEnvironmentTarget,
      options?: { readonly issuePairingToken?: boolean },
    ) => Effect.Effect<DesktopSshEnvironmentBootstrap, SshLaunchError>;
    readonly disconnectEnvironment: (
      target: DesktopSshEnvironmentTarget,
    ) => Effect.Effect<void>;
    readonly closeAllTunnels: Effect.Effect<void>;
  }
>()("@t3tools/desktop/ssh/DesktopSshEnvironment") {}

const managedSshUnavailable = () =>
  Effect.fail(
    new SshLaunchError({
      message:
        "Managed SSH setup is unavailable in Studio. Enter the host and pairing code of a running Studio server.",
      stdout: "",
    }),
  );

export const layer = Layer.effect(
  DesktopSshEnvironment,
  Effect.gen(function* () {
    const context = yield* Effect.context<
      FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
    >();
    return DesktopSshEnvironment.of({
      discoverHosts: Effect.fn("DesktopSshEnvironment.discoverHosts")(
        (input?: { readonly homeDir?: string }) => discoverSshHosts(input ?? {}).pipe(Effect.provide(context)),
      ),
      resolveHost: Effect.fn("DesktopSshEnvironment.resolveHost")(
        (alias: string) => resolveSshTarget(alias).pipe(Effect.provide(context)),
      ),
      // Saved SSH connections and direct IPC calls both reach this boundary.
      ensureEnvironment: managedSshUnavailable,
      disconnectEnvironment: Effect.fn("DesktopSshEnvironment.disconnectEnvironment")(() => Effect.void),
      closeAllTunnels: Effect.void,
    });
  }),
);
