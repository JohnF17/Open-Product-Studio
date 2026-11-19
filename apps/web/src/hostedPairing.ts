import { STUDIO_APP_ORIGIN } from "@t3tools/shared/promptLinks";
import { parseUrl } from "@t3tools/shared/url";

import { getPairingTokenFromUrl, setPairingTokenOnUrl } from "@t3tools/shared/remote";

export interface HostedPairingRequest {
  readonly host: string;
  readonly token: string;
  readonly label: string;
}

export type HostedAppChannel = "latest" | "nightly";

export function configuredHostedAppUrl(): string | null {
  const url = parseUrl(import.meta.env.VITE_HOSTED_APP_URL?.trim() || "");
  if (!url || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    return null;
  return url.protocol === "https:" ||
    (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    ? url.origin
    : null;
}

/** Copy links for this app unless this build explicitly targets a hosted Studio deployment. */
export function shareLinkOrigin(
  currentHref = typeof window !== "undefined" ? window.location.href : "",
): string {
  const hosted = configuredHostedAppUrl();
  if (hosted) return hosted;
  const current = parseUrl(currentHref);
  if (current?.protocol === "http:" || current?.protocol === "https:") return current.origin;
  return current?.protocol === "open-product-studio-dev:"
    ? "open-product-studio-dev://app"
    : STUDIO_APP_ORIGIN;
}

function configuredBackendUrl(): string {
  return import.meta.env.VITE_HTTP_URL?.trim() || import.meta.env.VITE_WS_URL?.trim() || "";
}

function configuredHostedAppChannel(): HostedAppChannel | null {
  const channel = import.meta.env.VITE_HOSTED_APP_CHANNEL?.trim().toLowerCase();
  return channel === "latest" || channel === "nightly" ? channel : null;
}

export function isHostedStaticApp(url?: URL): boolean {
  const hostedOrigin = configuredHostedAppUrl();
  if (!hostedOrigin || configuredBackendUrl()) {
    return false;
  }

  if (configuredHostedAppChannel()) {
    return true;
  }

  if (url === undefined && (typeof window === "undefined" || window.location === undefined)) {
    return false;
  }

  return (url ?? new URL(window.location.href)).origin === hostedOrigin;
}

export function readHostedPairingRequest(url: URL = new URL(window.location.href)) {
  const host = url.searchParams.get("host")?.trim() ?? "";
  const token = getPairingTokenFromUrl(url)?.trim() ?? "";
  const label = url.searchParams.get("label")?.trim() ?? "";

  if (!host || !token) {
    return null;
  }

  return {
    host,
    token,
    label,
  } satisfies HostedPairingRequest;
}

export function hasHostedPairingRequest(url: URL = new URL(window.location.href)): boolean {
  return readHostedPairingRequest(url) !== null;
}

export function buildHostedPairingUrl(input: {
  readonly host: string;
  readonly token: string;
  readonly label?: string | null;
}): string | null {
  const origin = configuredHostedAppUrl();
  if (!origin) return null;
  const url = new URL("/pair", origin);
  url.searchParams.set("host", input.host);

  const label = input.label?.trim();
  if (label) {
    url.searchParams.set("label", label);
  }

  return setPairingTokenOnUrl(url, input.token).toString();
}

export function buildHostedChannelSelectionUrl(input: {
  readonly channel: HostedAppChannel;
}): string | null {
  const origin = configuredHostedAppUrl();
  if (!origin) return null;
  const url = new URL("/__t3code/channel", origin);
  url.searchParams.set("channel", input.channel);
  return url.toString();
}
