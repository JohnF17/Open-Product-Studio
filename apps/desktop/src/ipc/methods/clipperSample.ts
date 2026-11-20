import {
  ClipperSampleRequestSchema,
  ClipperSampleResultSchema,
  type ClipperSampleResult,
} from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Electron from "electron";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { uuidV4Unsafe } from "effect/crypto/SecureRandom";

import { createSampleHost } from "../../clipper/sampleHost.ts";
import { DESKTOP_HOST, getDesktopScheme } from "../../electron/ElectronProtocol.ts";
import { ElectronWindow } from "../../electron/ElectronWindow.ts";
import { CLIPPER_SAMPLE_CHANNEL } from "../channels.ts";
import { DesktopIpc } from "../DesktopIpc.ts";
import { isAllowedVolume } from "./clipperSampleVolume.ts";

const decodeRequest = Schema.decodeUnknownSync(ClipperSampleRequestSchema, {
  onExcessProperty: "error",
});
const decodeResult = Schema.decodeUnknownSync(ClipperSampleResultSchema, {
  onExcessProperty: "error",
});

function isLocalDesktopUrl(raw: string): boolean {
  const url = URL.parse(raw);
  return (
    url !== null &&
    url.protocol === getDesktopScheme(false) + ":" &&
    url.host === DESKTOP_HOST &&
    url.username === "" &&
    url.password === ""
  );
}

interface DocumentLifetime {
  committed: boolean;
  owner: string | undefined;
  stop(): void;
}

export const installClipperSample = Effect.fn("desktop.ipc.clipperSample.install")(function* () {
  const ipc = yield* DesktopIpc;
  const platform = yield* HostProcess.Platform;
  const architecture = yield* HostProcess.Architecture;
  const electronWindow = yield* ElectronWindow;
  const documents = new Map<Electron.WebContents, DocumentLifetime>();
  let host: ReturnType<typeof createSampleHost> | undefined;

  const trackWindow = (_event: Electron.Event, contents: Electron.WebContents) => {
    if (contents.getType() !== "window") return;
    const release = () => {
      const owner = document.owner;
      document.owner = undefined;
      if (owner !== undefined) void host?.release(owner).catch(() => {});
    };
    const invalidate = () => {
      document.committed = false;
      release();
    };
    const onNavigation = (
      event: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>,
    ) => {
      if (event.isMainFrame && !event.isSameDocument) invalidate();
    };
    const onCommit = (_event: Electron.Event, url: string) => {
      release();
      document.committed = isLocalDesktopUrl(url);
    };
    const onInPageNavigation = (_event: Electron.Event, _url: string, isMainFrame: boolean) => {
      if (isMainFrame) release();
    };
    const document: DocumentLifetime = {
      committed: false,
      owner: undefined,
      stop() {
        invalidate();
        documents.delete(contents);
        contents.removeListener("did-start-navigation", onNavigation);
        contents.removeListener("did-navigate", onCommit);
        contents.removeListener("did-navigate-in-page", onInPageNavigation);
        contents.removeListener("render-process-gone", invalidate);
        contents.removeListener("destroyed", document.stop);
      },
    };
    documents.set(contents, document);
    contents.on("did-start-navigation", onNavigation);
    contents.on("did-navigate", onCommit);
    contents.on("did-navigate-in-page", onInPageNavigation);
    contents.on("render-process-gone", invalidate);
    contents.once("destroyed", document.stop);
  };

  // Only the static asset protocol qualifies; the development proxy can follow redirects.
  if (platform === "win32" && architecture === "x64" && Electron.app.isPackaged) {
    yield* Effect.acquireRelease(
      Effect.sync(() => Electron.app.on("web-contents-created", trackWindow)),
      () =>
        Effect.sync(() => {
          Electron.app.removeListener("web-contents-created", trackWindow);
          for (const document of documents.values()) document.stop();
        }),
    );
  }

  yield* ipc.handle({
    channel: CLIPPER_SAMPLE_CHANNEL,
    handler: (input, event) =>
      Effect.flatMap(electronWindow.main, (main) =>
        Effect.promise(async (): Promise<ClipperSampleResult> => {
          let saveDispatched = false;
          try {
            if (Option.isNone(main) || main.value.isDestroyed()) return { status: "unavailable" };
            const window = main.value;
            const contents = window.webContents;
            const document = documents.get(contents);
            if (
              !document?.committed ||
              event?.sender !== contents ||
              event.senderFrame !== contents.mainFrame ||
              !isLocalDesktopUrl(contents.mainFrame.url)
            ) {
              return { status: "unavailable" };
            }

            const request = decodeRequest(input);
            host ??= createSampleHost({
              profileDirectory: Electron.app.getPath("userData"),
              isAllowedVolume,
            });
            const owner = (document.owner ??= uuidV4Unsafe());
            const isActive = () => document.owner === owner && !window.isDestroyed();
            saveDispatched = request.action === "save";
            const result = await host.handle(owner, request, {
              pickEncoder: async () => {
                if (!isActive()) return undefined;
                const result = await Electron.dialog.showOpenDialog(window, {
                  title: "Choose the Clipper sample encoder",
                  properties: ["openFile", "dontAddToRecent"],
                  filters: [
                    {
                      name: "Qualified Windows encoder package or executable",
                      extensions: ["whl", "exe"],
                    },
                  ],
                });
                return isActive() && !result.canceled && result.filePaths.length === 1
                  ? result.filePaths[0]
                  : undefined;
              },
              pickDestination: async () => {
                if (!isActive()) return undefined;
                const result = await Electron.dialog.showSaveDialog(window, {
                  title: "Save Clipper sample",
                  defaultPath: "clipper-sample.mp4",
                  properties: ["dontAddToRecent"],
                  filters: [{ name: "MP4 video", extensions: ["mp4"] }],
                });
                return isActive() && !result.canceled ? result.filePath : undefined;
              },
            });
            if (isActive()) return decodeResult(result);
            return { status: saveDispatched ? "uncertain" : "cancelled" };
          } catch {
            return { status: saveDispatched ? "uncertain" : "failed" };
          }
        }),
      ),
  });
});
