# WP08 Video cue sheet

[Recording](video-cue-sheet.webm) · [Light mode](cue-sheet-light.png) · [Dark mode](cue-sheet-dark.png)

The recording shows a synthetic stick-figure Video project on Windows x64. The cue sheet opens in Storyboard. A second cue starts before the first, so the editor shows the timing warning while keeping the inputs editable. After reopening the saved project following a reload, the JSON download marks the sheet `draft`. The run corrects the second cue to `0:08`, removes the first, opens Preview and downloads the draft again. The second download reports `ready`, retains the remaining cue’s ID, stores its start as 8,000 milliseconds and preserves the original shot list.

The light and dark screenshots show the same unfinished cues. Applying T3’s appearance functions gave the tested cue text input 17.27:1 contrast in light and 19.26:1 in dark. The invalid field exposes its error through `aria-invalid` and its associated description. No horizontal overflow was observed at 1240 pixels.

## Capture and verification

On November 19, 2026, `node E:/T3Code/data/scratch/wp08-video-cue-smoke/capture.cjs` ran with Node 26.13.1 and Playwright 1.64.1 against HeadlessChrome/156.0.8078.4. The fixture mounted `StudioWorkspace`, the compiled T3 stylesheet and the T3 appearance functions from the repository pin. Esbuild 0.28.2 bundled the renderer and appearance functions. Tailwind CSS 4.3.3 compiled the stylesheet. A fresh, isolated profile used a synthetic HTTPS origin with in-memory assets and blocked service workers. Chromium stayed offline. The harness blocked 4 local environment-discovery requests and recorded zero renderer errors or unexpected requests. The media shows the Chromium content window only. Electron installation, native appearance settings, and Video media rendering require separate verification.

FFmpeg 7.1 decoded all 233 frames of the 9.32-second clip. It is silent VP9 WebM, 1240 × 940 at 25 fps, 586,375 bytes. The [capture manifest](capture-manifest.json) records SHA-256 hashes for the media and normalized Studio sources and the pinned appearance bundle. The source snapshot SHA-256 is `9807c8095dd96099db31202f1c39682169f7ac164326684ed38e1fb33641e058`.

To reproduce the source identity, normalize the inputs to LF, then sort their paths in ordinal order. Hash the UTF-8 records formed by each lowercase SHA-256 digest, two ASCII spaces, the path and LF.
