import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import * as DesktopSshEnvironment from "./DesktopSshEnvironment.ts";

describe("managed SSH setup", () => {
  it.effect("refuses provisioning and reconnection before reaching a remote host", () =>
    Effect.gen(function* () {
      const ssh = yield* DesktopSshEnvironment.DesktopSshEnvironment;
      const target = { alias: "example", hostname: "example.invalid", username: null, port: null };
      for (const issuePairingToken of [true, false]) {
        const error = yield* ssh.ensureEnvironment(target, { issuePairingToken }).pipe(Effect.flip);
        assert.match(error.message, /Managed SSH setup is unavailable in Studio/);
      }
      yield* ssh.disconnectEnvironment(target);
    }).pipe(Effect.provide(DesktopSshEnvironment.layer), Effect.provide(NodeServices.layer)),
  );
});
