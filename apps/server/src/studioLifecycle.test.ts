import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as NetService from "@t3tools/shared/Net";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { Command } from "effect/cli";
import { ChildProcessSpawner } from "effect/process";

import { makeCli } from "./binCli.ts";
import { isLegacyLifecycleCommand, studioLifecycleGuidance } from "./studioLifecycle.ts";

it.effect("declines inherited service controls without spawning or modifying files", () =>
  Effect.gen(function* () {
    const commands = [
      ["service", "install"],
      ["service", "restart"],
      ["service", "protect"],
      ["service", "uninstall"],
      ["service", "update"],
      ["install"],
      ["uninstall"],
      ["update"],
      ["up"],
      ["status"],
      ["__service-launcher"],
      ["__service-preflight"],
    ];
    const sideEffects: string[] = [];
    const unexpected = (operation: string) =>
      Effect.sync(() => sideEffects.push(operation)).pipe(
        Effect.andThen(Effect.die("Unexpected host operation: " + operation)),
      );
    const cli = makeCli({ cloudEnabled: true });
    for (const args of [...commands, ["connect"]]) {
      const error = yield* Command.runWith(cli, { version: "0.0.0", renderErrors: false })(args).pipe(
        Effect.flip,
        Effect.provide(
          Layer.mergeAll(
            FileSystem.layerNoop({
              makeDirectory: () => unexpected("makeDirectory"),
              remove: () => unexpected("remove"),
              writeFile: () => unexpected("writeFile"),
              writeFileString: () => unexpected("writeFileString"),
            }),
            Layer.mock(ChildProcessSpawner.ChildProcessSpawner)({
              spawn: () => unexpected("spawn"),
            }),
          ),
        ),
      );
      assert.include(String(error), studioLifecycleGuidance);
    }
    assert.deepEqual(sideEffects, []);
    assert.isTrue(commands.every(([name]) => isLegacyLifecycleCommand(name)));
    for (const name of ["serve", "start", "app", "pair", "thread", "project", "doctor"]) {
      assert.isFalse(isLegacyLifecycleCommand(name));
    }
  }).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer))),
);
