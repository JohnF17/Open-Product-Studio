import { assert, describe, expect, it } from "vite-plus/test";

import { verifyClipperSaveReply, verifyPreloadBundle } from "./verify-preload-bundle.mjs";

const validPreload = `
  const electron = require("electron");
  const PICK_FOLDER_CHANNEL = "desktop:pick-folder";
  electron.contextBridge.exposeInMainWorld("__clerk_internal_electron_passkeys", {});
  electron.contextBridge.exposeInMainWorld("desktopBridge", {
    clipperSample: (request) => electron.ipcRenderer.invoke("desktop:clipper-sample", request),
    getClientPlatform: () => process.platform,
    getLocalEnvironmentBootstraps: () => [],
    getPathForFile: () => "",
    pickFolder: (options) => electron.ipcRenderer.invoke(PICK_FOLDER_CHANNEL, options),
  });
`;

describe("desktop preload bundle verifier", () => {
  it("checks passkey exposure against the build flavor", () => {
    const local = validPreload.replace(/electron\.contextBridge\.exposeInMainWorld\("__clerk_internal_electron_passkeys", \{\}\);/, "");
    assert.doesNotThrow(() => verifyPreloadBundle(local, { hosted: false }));
    assert.throws(() => verifyPreloadBundle(local, { hosted: true }), /passkeys/);
    assert.throws(() => verifyPreloadBundle(validPreload, { hosted: false }), /hosted passkey/);
  });

  it("requires a non-retryable result after a lost save reply", async () => {
    const guarded = validPreload.replace('invoke("desktop:clipper-sample", request),', 'invoke("desktop:clipper-sample", request).catch(() => ({status:"uncertain"})),');
    await verifyClipperSaveReply(guarded);
    await expect(verifyClipperSaveReply(guarded.replace('status:"uncertain"', 'status:"failed"'))).rejects.toThrow(/uncertain outcome/);
  });
  it("rejects required API names that only appear in strings", () => {
    assert.throws(
      () =>
        verifyPreloadBundle(`
          "desktopBridge getClientPlatform getLocalEnvironmentBootstraps pickFolder";
          "__clerk_internal_electron_passkeys";
          require("electron");
        `),
      /missing executable APIs/,
    );
  });

  it("rejects a required API whose exposed value is not callable", () => {
    assert.throws(
      () =>
        verifyPreloadBundle(
          validPreload.replace(
            "getClientPlatform: () => process.platform,",
            "getClientPlatform: undefined,",
          ),
        ),
      /missing executable APIs: getClientPlatform/,
    );
  });

  it("accepts a required API exposed through a function alias", () => {
    assert.doesNotThrow(() =>
      verifyPreloadBundle(`
        const readClientPlatform = () => process.platform;
        ${validPreload.replace(
          "getClientPlatform: () => process.platform,",
          "getClientPlatform: readClientPlatform,",
        )}
      `),
    );
  });

  it("rejects dynamic imports with comments before the opening parenthesis", () => {
    assert.throws(
      () =>
        verifyPreloadBundle(`${validPreload}\nimport /* @vite-ignore */("unsupported-module");`),
      /dynamic import\(\)/,
    );
  });

  it("rejects unsupported require calls with comments before the opening parenthesis", () => {
    assert.throws(
      () => verifyPreloadBundle(`${validPreload}\nrequire /* @__PURE__ */ ("node:fs");`),
      /unsupported sandbox imports: node:fs/,
    );
  });

  it("accepts Electron sandbox module aliases", () => {
    assert.doesNotThrow(() =>
      verifyPreloadBundle(`
        ${validPreload}
        require("electron/common");
        require("electron/renderer");
        require("node:events");
        require("node:timers");
        require("node:url");
      `),
    );
  });

  it("runs a preload that reads the page's DOM while loading", () => {
    assert.doesNotThrow(() =>
      verifyPreloadBundle(`
        ${validPreload}
        const report = () => document.fullscreenElement;
        report();
        document.addEventListener("fullscreenchange", report);
        window.addEventListener("resize", report);
      `),
    );
  });

  it("ignores require-like text in strings and comments", () => {
    assert.doesNotThrow(() =>
      verifyPreloadBundle(`
        ${validPreload}
        const message = 'require("node:fs")';
        // require("node:path")
      `),
    );
  });
});
