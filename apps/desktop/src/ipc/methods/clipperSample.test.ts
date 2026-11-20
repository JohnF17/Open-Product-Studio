import { EventEmitter } from "node:events";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { expect, it, vi } from "vite-plus/test";

import { ElectronWindow } from "../../electron/ElectronWindow.ts";
import * as DesktopIpc from "../DesktopIpc.ts";
import { installClipperSample } from "./clipperSample.ts";

const { app, dialog, createSampleHost, handle, release } = vi.hoisted(() => {
  const handle = vi.fn();
  const release = vi.fn(async (_owner: string) => {});
  return {
    app: { isPackaged: true, on: vi.fn(), removeListener: vi.fn(), getPath: vi.fn(() => "C:\\profile") },
    dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
    createSampleHost: vi.fn(() => ({ handle, release })),
    handle,
    release,
  };
});
vi.mock("electron", () => ({ app, dialog }));
vi.mock("../../clipper/sampleHost.ts", () => ({ createSampleHost }));

const localUrl = "open-product-studio://app/";

function fixture() {
  const contents = Object.assign(new EventEmitter(), {
    id: 1,
    mainFrame: { url: localUrl },
    getType: () => "window",
    isDestroyed: () => false,
  });
  const window = { webContents: contents, isDestroyed: () => false };
  const listeners = new Map<string, DesktopIpc.DesktopIpcHandleListener>();
  const appEvents = new EventEmitter();
  app.on.mockImplementation((event: string, listener) => appEvents.on(event, listener));
  app.removeListener.mockImplementation((event: string, listener) =>
    appEvents.removeListener(event, listener),
  );
  const electronWindow = Layer.mock(ElectronWindow, {
    main: Effect.succeedSome(window as unknown as Electron.BrowserWindow),
  });
  const layer = Layer.mergeAll(
    electronWindow,
    Layer.succeed(HostProcess.Platform, "win32"),
    Layer.succeed(HostProcess.Architecture, "x64"),
    DesktopIpc.layer({
      removeHandler: (channel) => void listeners.delete(channel),
      handle: (channel, invoke) => void listeners.set(channel, invoke),
      on: () => {},
      removeAllListeners: () => {},
    }).pipe(Layer.provide(electronWindow)),
  );
  const invoke = (raw: unknown, senderFrame: unknown = contents.mainFrame) =>
    listeners.get("desktop:clipper-sample")!({ sender: contents, senderFrame }, raw);
  const run = (test: () => Promise<void>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* installClipperSample();
        appEvents.emit("web-contents-created", {}, contents);
        contents.emit("did-navigate", {}, localUrl);
        yield* Effect.promise(test);
      }).pipe(Effect.provide(layer), Effect.scoped),
    );
  return { contents, invoke, run, window };
}

it("uses native dialogs owned by the trusted app window and rejects extra fields", async () => {
  vi.clearAllMocks();
  const { contents, invoke, run, window } = fixture();
  dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ["C:\\ffmpeg.exe"] });
  handle.mockImplementation(async (_owner, _request, dialogs) => {
    expect(await dialogs.pickEncoder()).toBe("C:\\ffmpeg.exe");
    return { status: "ready" };
  });
  await run(async () => {
    await expect(Promise.resolve(invoke({ action: "enroll" }, {}))).rejects.toThrow();
    await expect(invoke({ action: "enroll", path: "C:\\ffmpeg.exe" })).resolves.toEqual({
      status: "failed",
    });
    contents.mainFrame.url = "https://example.test/";
    await expect(invoke({ action: "enroll" })).resolves.toEqual({ status: "unavailable" });
    expect(handle).not.toHaveBeenCalled();
    contents.mainFrame.url = localUrl;
    await expect(invoke({ action: "enroll" })).resolves.toEqual({ status: "ready" });
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(
      window,
      expect.objectContaining({ properties: ["openFile", "dontAddToRecent"] }),
    );
  });
});

it("revokes in-flight dialog authority at navigation and rotates owners for the new document", async () => {
  vi.clearAllMocks();
  const { contents, invoke, run, window } = fixture();
  const destination = Promise.withResolvers<{ canceled: boolean; filePath: string }>();
  const opened = Promise.withResolvers<void>();
  dialog.showSaveDialog.mockImplementation(() => {
    opened.resolve();
    return destination.promise;
  });
  const owners: string[] = [];
  handle.mockImplementation(async (owner, request, dialogs) => {
    owners.push(owner);
    if (request.action === "save") expect(await dialogs.pickDestination()).toBeUndefined();
    return { status: "ready" };
  });
  const uuid = "95f0d888-b490-4393-a125-99bdc73d5146";
  await run(async () => {
    const pending = invoke({ action: "save", projectId: uuid, token: uuid });
    await opened.promise;
    expect(dialog.showSaveDialog).toHaveBeenCalledWith(
      window,
      expect.objectContaining({ defaultPath: "clipper-sample.mp4" }),
    );
    contents.emit("did-start-navigation", { isMainFrame: false, isSameDocument: false });
    expect(release).not.toHaveBeenCalled();
    contents.emit("did-start-navigation", { isMainFrame: true, isSameDocument: false });
    expect(release).toHaveBeenCalledExactlyOnceWith(owners[0]);
    await expect(invoke({ action: "status" })).resolves.toEqual({ status: "unavailable" });
    contents.emit("did-navigate", {}, localUrl);
    await expect(invoke({ action: "status" })).resolves.toEqual({ status: "ready" });
    expect(owners[1]).not.toBe(owners[0]);
    destination.resolve({ canceled: false, filePath: "C:\\output.mp4" });
    await expect(pending).resolves.toEqual({ status: "uncertain" });
    contents.emit("destroyed");
    expect(release).toHaveBeenLastCalledWith(owners[1]);
  });
});

it("keeps the native route unavailable in unpackaged static windows", async () => {
  vi.clearAllMocks();
  app.isPackaged = false;
  try {
    const { invoke, run } = fixture();
    await run(async () => {
      await expect(invoke({ action: "enroll" })).resolves.toEqual({ status: "unavailable" });
      expect(handle).not.toHaveBeenCalled();
    });
  } finally {
    app.isPackaged = true;
  }
});

it("returns uncertain when a dispatched save loses its acknowledgement", async () => {
  vi.clearAllMocks();
  const { invoke, run } = fixture();
  const id = "95f0d888-b490-4393-a125-99bdc73d5146";
  await run(async () => {
    handle.mockRejectedValueOnce(new Error("reply lost"));
    await expect(invoke({ action: "save", projectId: id, token: id })).resolves.toEqual({ status: "uncertain" });
  });
});

it("maps host, schema and native errors to fixed replies without paths", async () => {
  vi.clearAllMocks();
  const { invoke, run } = fixture();
  await run(async () => {
    handle.mockResolvedValueOnce({ status: "failed", path: "C:\\private" });
    handle.mockRejectedValueOnce(new Error("C:\\private"));
    for (let call = 0; call < 2; call++) {
      await expect(invoke({ action: "status" })).resolves.toEqual({ status: "failed" });
    }
  });
});
