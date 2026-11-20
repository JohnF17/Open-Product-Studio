# Local Video Series briefs

Open a Video project and choose **Brief → Series brief (optional)**. Save an audience, a format and the current visual style. Enter an episode title and choose **Start episode**. The new project inherits those three choices and has its own script, notes and tool preferences.

This run created *One pot of basil* from revision 1 of *The windowsill guide*, then changed the episode's audience. The source kept its private note and original audience. Editing the source produced revision 2 with a new audience and format. After reloading, both projects reopened with their own values. The episode still pointed to revision 1.

**Check for a newer brief** showed the episode's choices after an update. **Keep current revision** preserved its pin. **Apply revision 2** adopted the new format, kept the episode's audience override, and retained the previous brief in its history. Opening the episode again preserved these results. The source project had the same stored contents before and after the episode update.

| Captured state | Desktop, 1240 × 940 | Phone width, 390 × 844 |
| --- | --- | --- |
| Start an episode | [Light appearance](desktop-source.png) | [Dark appearance](narrow-source.png) |
| Override its audience | [Light appearance](desktop-episode.png) | [Dark appearance](narrow-episode.png) |
| Review a newer brief | [Light appearance](desktop-review.png) | [Dark appearance](narrow-review.png) |

[Silent viewport-only walkthrough](desktop-series.webm) · [Source and media hashes](manifest.json)

## Verification

The Windows x64 fixture bundled the Studio workspace with its pinned appearance code, a fresh IndexedDB workspace and synthetic content. Chromium intercepted fixture assets in memory and blocked external network access. The narrow run used mobile viewport emulation, touch and reduced motion. These checks cover the renderer. Electron packaging, physical phones, backup restoration, media rendering and publication have separate evidence.

The capture verifier compared the live renderer inputs to the snapshot and SHA-256 manifest, checked both viewports for horizontal overflow, and required every source and episode assertion to pass. FFmpeg decoded every frame of the recording and all six screenshots. The manifest records the stream dimensions, sizes, frame counts and hashes.
