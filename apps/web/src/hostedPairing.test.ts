import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  buildHostedPairingUrl,
  buildHostedChannelSelectionUrl,
  isHostedStaticApp,
  shareLinkOrigin,
  hasHostedPairingRequest,
  readHostedPairingRequest,
} from "./hostedPairing";

describe("hostedPairing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps desktop and browser share links within the current Studio", () => {
    vi.stubEnv("VITE_HOSTED_APP_URL", "");
    vi.stubEnv("VITE_HOSTED_APP_CHANNEL", "latest");
    expect(shareLinkOrigin("open-product-studio://app/home")).toBe("open-product-studio://app");
    expect(shareLinkOrigin("open-product-studio-dev://app/home")).toBe(
      "open-product-studio-dev://app",
    );
    expect(shareLinkOrigin("http://127.0.0.1:7181/home")).toBe("http://127.0.0.1:7181");
    expect(buildHostedChannelSelectionUrl({ channel: "nightly" })).toBeNull();
    expect(isHostedStaticApp(new URL("https://app.t3.codes/"))).toBe(false);
  });

  it.each([
    "invalid",
    "http://external.test",
    "https://account@host.test",
    "https://host.test/other",
  ])("ignores an invalid configured destination %s", (value) => {
    vi.stubEnv("VITE_HOSTED_APP_URL", value);
    expect(buildHostedPairingUrl({ host: "https://engine.test", token: "fixture" })).toBeNull();
  });

  it("reads hosted pairing host and query token parameters", () => {
    const url = new URL("https://app.t3.codes/pair?host=100.64.1.2:3773&token=ABCD1234");

    expect(readHostedPairingRequest(url)).toEqual({
      host: "100.64.1.2:3773",
      token: "ABCD1234",
      label: "",
    });
    expect(hasHostedPairingRequest(url)).toBe(true);
  });

  it("prefers hash tokens so generated hosted links do not put credentials in search params", () => {
    vi.stubEnv("VITE_HOSTED_APP_URL", "https://preview.studio.example.test");
    expect(shareLinkOrigin("open-product-studio://app/")).toBe(
      "https://preview.studio.example.test",
    );

    const url = new URL(
      buildHostedPairingUrl({
        host: "https://backend.example.com:3773",
        token: "pairing-token",
        label: "Workstation",
      })!,
    );

    expect(url.origin).toBe("https://preview.studio.example.test");
    expect(url.pathname).toBe("/pair");
    expect(url.searchParams.get("host")).toBe("https://backend.example.com:3773");
    expect(url.searchParams.get("label")).toBe("Workstation");
    expect(url.searchParams.has("token")).toBe(false);
    expect(url.hash).toBe("#token=pairing-token");
  });
});
