# WP08 six-category Studio smoke

Captured on November 19, 2026, on Windows x64. The run mounted the production `StudioWorkspace` component and its own stylesheet in a minimal HTML fixture. Playwright 1.64.1 drove Headless Chromium 156.0.8078.4 with fresh private profiles. Esbuild 0.28.2 bundled only the component and its imports.

[Entry, resume and edit video](entry-resume-edit.webm) contains 26.56 seconds of actual automated interaction in the isolated browser content area. It is a silent 1240 × 940 VP9 WebM at 25 fps, 1,350,158 bytes. FFmpeg decoded all 664 frames. SHA-256 is `464fe5d3da9acbc40a302a55f7fbedccf7bfd62c0c97046ab3454b0b98c5aa4e`.

| View | Desktop · 1240 × 940 | Narrow · 390 × 844 |
| --- | --- | --- |
| Six-category chooser | [PNG](desktop-chooser.png) | [PNG](narrow-chooser.png) |
| Clipper caption look | [PNG](clipper-caption-look.png) | [PNG](narrow-clipper-caption-look.png) |
| Clipper edit notes | [PNG](clipper-edit.png) | [PNG](narrow-clipper-edit.png) |
| Replica interface sketch | [PNG](replica-edit.png) | [PNG](narrow-replica-edit.png) |
| Day Trader practice journal | [PNG](day-trader-edit.png) | [PNG](narrow-day-trader-edit.png) |

## What the run checked

- The chooser exposed Blank, Digital product, Video, Clipper, Replica and Day Trader. It used three columns on desktop and one at 390 pixels. The tested chooser and editing steps had no horizontal overflow.
- **Clipper** saved a recording reference, permission notes, timecodes, framing, captions and review notes. The run resumed the review, returned to the edit sheet, revised framing, and checked the revised value in the edit-plan JSON. On the built-in sample frame, the run typed a caption, tried Callout and Headline, applied Headline, undid to Subtitles, and saved Callout. Reopening restored the text and Callout, and both values were present in the export. Publishing prep showed the planned M4C boundary.
- **Replica** saved a permitted observation, an original behavior brief and an interface sketch. The run resumed the sketch, revised it, and checked the revised value in the design-brief JSON. The optional prototype sheet showed the planned M6B boundary.
- **Day Trader** saved a synthetic data reference, practice rules, a manual replay decision and a journal. The run resumed and revised the journal, checked the revised value in the practice-journal JSON, and found no agent, replay, broker or order action on the tested screens.
- Each category returned through Projects and reopened on its last sheet with saved values. A second reopen confirmed the revised value. At 390 pixels, the first reopen also followed a page reload. Chromium reported offline throughout. The chooser displayed **Local workspace**, the editors displayed **Saved on this device**, and no renderer errors or unexpected requests were observed.

## Layout observations and scope

A preliminary pass at 1240 ? 870 showed all six titles, with the lower card descriptions extending past the initial viewport. In the final run at 390 ? 844, Clipper Edit measured 1293 pixels of content with the caption preview. Clipper Review measured 993 pixels with Earlier notes expanded by default. The fields and footer remained reachable by scrolling.

The Windows command was `node E:/T3Code/data/scratch/wp08-six-category-smoke/smoke.cjs`. The scratch harness used a synthetic HTTPS origin and fulfilled only the fixture HTML, JavaScript and CSS in memory. Chromium stayed offline, service workers were blocked, and unmatched requests were denied. The PNGs and video show page viewports only. The run covered authored local drafts and desktop JSON downloads. It did not exercise T3 navigation or theming, Electron, an agent handoff, provider or backend calls, optional still import, media execution, prototype generation, replay, or trading. The [earlier Electron capture](../README.md) covers the integrated Video flow.

## Source identity

`87fb6394cb06491039acc8fbf6bc4a3b4f266e47816feb57fc488f53a9a598e6` identifies the component source snapshot tested before and after capture. For each path below in ordinal order, normalize CRLF to LF and calculate SHA-256. Append each lowercase digest, two ASCII spaces, the path and LF. Then calculate SHA-256 of the concatenated UTF-8 records.

```text
apps/web/src/features/studio/ClipLookPreview.tsx
apps/web/src/features/studio/StudioWorkspace.tsx
apps/web/src/features/studio/clipLook.css
apps/web/src/features/studio/drafts.ts
apps/web/src/features/studio/guide.ts
apps/web/src/features/studio/studio.css
apps/web/src/features/studio/workingDraftGuides.ts
docs/roadmap/project-categories.json
```
