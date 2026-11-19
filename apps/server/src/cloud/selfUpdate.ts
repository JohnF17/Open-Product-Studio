import {
  ServerSelfUpdateError,
  type ServerSelfUpdateInput,
  type ServerSelfUpdateProgressEvent,
  type ServerSelfUpdateProgressStage,
  type ServerSelfUpdateResult,
} from "@t3tools/contracts";
import { crossesReleaseTrack } from "@t3tools/shared/cliRelease";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";

import packageJson from "../../package.json" with { type: "json" };
import * as ServerConfig from "../config.ts";
import * as DesktopAppUpdate from "../desktopUpdate/DesktopAppUpdate.ts";
import { databaseMigrationHead } from "../persistence/databaseMigrationHead.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";

export class ServerSelfUpdate extends Context.Service<
  ServerSelfUpdate,
  {
    readonly update: (
      input: ServerSelfUpdateInput,
      reportProgress?: (
        stage: ServerSelfUpdateProgressStage,
      ) => Effect.Effect<void, ServerSelfUpdateError>,
      onHandoffAccepted?: () => Effect.Effect<void>,
    ) => Effect.Effect<ServerSelfUpdateResult, ServerSelfUpdateError>;
    readonly commitDesktopUpdate: (
      requestId: string,
      onHandoffAccepted?: () => Effect.Effect<void>,
    ) => Effect.Effect<never, ServerSelfUpdateError>;
  }
>()("t3/cloud/selfUpdate/ServerSelfUpdate") {}

/** The client checks this when planning; the host checks again because its database may have
 * moved on since (another client updated it). Stable and Nightly each build their own commits,
 * so crossing tracks needs the target release to know every migration this database holds. */
export function trackSwitchBlockReason(input: {
  readonly serverVersion: string;
  readonly targetVersion: string;
  readonly targetDatabaseMigration: number | undefined;
  /** Read only for a crossing; undefined when the database cannot be read. */
  readonly databaseMigration: () => number | undefined;
}): string | null {
  if (!crossesReleaseTrack(input.serverVersion, input.targetVersion)) return null;
  const databaseMigration = input.databaseMigration();
  if (input.targetDatabaseMigration === undefined || databaseMigration === undefined) {
    return `Cannot confirm this database works with Studio ${input.targetVersion}. A track switch requires the target release's database migration level.`;
  }
  return input.targetDatabaseMigration < databaseMigration
    ? `This database has changes Studio ${input.targetVersion} does not support yet; it stays on this release.`
    : null;
}

export const make = Effect.fn("cloud.server_self_update.make")(function* () {
  const config = yield* ServerConfig.ServerConfig;
  const desktop = yield* DesktopAppUpdate.DesktopAppUpdate;
  const policy = yield* ManagedPolicy.ManagedPolicy;

  const checkAvailable = Effect.gen(function* () {
    if (policy.document?.limits?.updates?.mode === "off") {
      return yield* new ServerSelfUpdateError({
        reason: `${policy.document.organization} manages Open Product Studio updates.`,
      });
    }
    if (!desktop.available) {
      return yield* new ServerSelfUpdateError({
        reason: "This Open Product Studio server has no configured desktop updater.",
      });
    }
  });

  const update: ServerSelfUpdate["Service"]["update"] = Effect.fn("cloud.server_self_update.update")(
    function* (input, reportProgress = () => Effect.void) {
      yield* checkAvailable;
      if (input.stageOnly === true) {
        return yield* new ServerSelfUpdateError({
          reason: "Studio does not stage standalone server runtimes.",
        });
      }
      if (input.channel !== undefined) {
        const reason = trackSwitchBlockReason({
          serverVersion: packageJson.version,
          targetVersion: input.targetVersion,
          targetDatabaseMigration: input.targetDatabaseMigration,
          databaseMigration: () => databaseMigrationHead(config.dbPath),
        });
        if (reason !== null) return yield* new ServerSelfUpdateError({ reason });
      }
      return yield* desktop.run(
        reportProgress,
        input.channel === undefined
          ? undefined
          : { channel: input.channel, targetVersion: input.targetVersion },
      );
    },
  );
  return ServerSelfUpdate.of({
    update,
    commitDesktopUpdate: (requestId, onHandoffAccepted) =>
      checkAvailable.pipe(Effect.andThen(() => desktop.commit(requestId, onHandoffAccepted))),
  });
});

export const layer = Layer.effect(ServerSelfUpdate, make());

// The update outlives client sockets; progress offers to a closed queue are ignored.
export const updateProgressStream = (
  selfUpdate: ServerSelfUpdate["Service"],
  input: ServerSelfUpdateInput,
) =>
  Stream.callback<ServerSelfUpdateProgressEvent, ServerSelfUpdateError>((queue) => {
    const offer = (event: ServerSelfUpdateProgressEvent) =>
      Queue.offer(queue, event).pipe(Effect.ignore);

    return selfUpdate
      .update(input, (stage) => offer({ type: "progress", stage }))
      .pipe(
        Effect.flatMap((result) => offer({ type: "complete", result })),
        Effect.catchTags({
          ServerSelfUpdateError: (error) => Queue.fail(queue, error).pipe(Effect.ignore),
        }),
        Effect.andThen(Queue.end(queue).pipe(Effect.ignore)),
        Effect.forkDetach,
      );
  });
