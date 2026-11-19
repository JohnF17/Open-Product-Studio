import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import * as NpmRelease from "./npmRelease.ts";

it.layer(NpmRelease.layer)("Studio release lookup", (it) => {
  it.effect.each(["latest", "nightly", "1.2.3"])("returns no upstream npm release for %s", (spec) =>
    Effect.gen(function* () {
      const releases = yield* NpmRelease.NpmRelease;
      expect(yield* releases.get({ spec })).toBeNull();
    }),
  );

  it.effect("retains the protocol error for an invalid version", () =>
    Effect.gen(function* () {
      const releases = yield* NpmRelease.NpmRelease;
      expect((yield* releases.get({ spec: "not a version" }).pipe(Effect.flip)).reason).toBe(
        "Invalid release version or track.",
      );
    }),
  );
});
