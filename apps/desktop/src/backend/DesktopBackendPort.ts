import * as NetService from "@t3tools/shared/Net";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const DEFAULT_DESKTOP_BACKEND_PORT = 3773;
const MAX_TCP_PORT = 65_535;
export const DESKTOP_LOOPBACK_HOST = "127.0.0.1";

export class DesktopBackendPortUnavailableError extends Schema.TaggedError<DesktopBackendPortUnavailableError>()(
  "DesktopBackendPortUnavailableError",
  {
    startPort: Schema.Int,
    maxPort: Schema.Int,
    host: Schema.String,
  },
) {
  override get message(): string {
    return `No desktop backend port is available on ${this.host} between ${this.startPort} and ${this.maxPort}.`;
  }
}

export const scanDesktopBackendPort = Effect.fn("desktop.backend.scanPort")(function* (
  bindHost: string,
  startPort = DEFAULT_DESKTOP_BACKEND_PORT,
) {
  const net = yield* NetService.NetService;
  for (let port = startPort; port <= MAX_TCP_PORT; port += 1) {
    // A listener reachable over IPv4 loopback is a collision even when a probe can bind.
    // This also catches dual-stack listeners. An IPv6-only listener is irrelevant to this IPv4 bind.
    if (
      !(yield* net.hasListenerOnHost(port, DESKTOP_LOOPBACK_HOST)) &&
      (yield* net.canListenOnHost(port, bindHost))
    ) {
      return port;
    }
  }
  return yield* new DesktopBackendPortUnavailableError({
    startPort,
    maxPort: MAX_TCP_PORT,
    host: bindHost,
  });
});
