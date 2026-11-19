import {
  ServerNpmReleaseError,
  ServerNpmReleaseInput,
  type ServerNpmRelease,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

export class NpmRelease extends Context.Service<
  NpmRelease,
  {
    readonly get: (
      input: ServerNpmReleaseInput,
    ) => Effect.Effect<ServerNpmRelease | null, ServerNpmReleaseError>;
  }
>()("t3/cloud/npmRelease") {}

// This compatibility RPC looks up releases of the upstream npm package. Studio publishes no
// standalone runtime there. Its configured desktop updater owns release discovery.
const decodeInput = Schema.decodeUnknownEffect(ServerNpmReleaseInput);
export const layer = Layer.succeed(
  NpmRelease,
  NpmRelease.of({
    get: Effect.fn("NpmRelease.get")((input: ServerNpmReleaseInput) =>
      decodeInput(input).pipe(
        Effect.as(null),
        Effect.mapError(() => new ServerNpmReleaseError({ reason: "Invalid release version or track." })),
      ),
    ),
  }),
);
