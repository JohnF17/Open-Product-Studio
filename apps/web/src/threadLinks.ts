import { parseThreadLinkHref } from "@t3tools/shared/threadLinks";
import { parseUrl } from "@t3tools/shared/url";

import { configuredHostedAppUrl } from "./hostedPairing";

/** Only these web origins can name threads in this renderer. */
export function trustedThreadWebOrigins(): string[] {
  const current = typeof window === "undefined" ? null : parseUrl(window.location?.href ?? "");
  const hosted = configuredHostedAppUrl();
  const origins = hosted ? [hosted] : [];
  if (
    (current?.protocol === "http:" || current?.protocol === "https:") &&
    current.origin !== hosted
  ) {
    origins.push(current.origin);
  }
  return origins;
}

export function parseRendererThreadLink(href: string) {
  return href.includes("/threads/")
    ? parseThreadLinkHref(href, trustedThreadWebOrigins())
    : parseThreadLinkHref(href);
}
