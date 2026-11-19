# WP08 six-category Studio smoke

Captured on November 19, 2026, on Windows x64. Playwright 1.64.1 drove HeadlessChrome/156.0.8078.4 in fresh private profiles. The fixture mounted the production `StudioWorkspace` component with its styles, T3's compiled application stylesheet and the pinned T3 appearance functions. Esbuild 0.28.2 bundled the renderer and appearance code. Tailwind CSS 4.3.3 compiled `apps/web/src/index.css` and its theme variables.

[Entry, resume and edit video](entry-resume-edit.webm) contains 29.64 seconds of actual automated interaction in the isolated browser content area. It is a silent 1240 × 940 VP9 WebM at 25 fps, 1,800,867 bytes. FFmpeg decoded all 741 frames. SHA-256 is `051491884bc155edb6f3d5e8abec055b77653ad45e15b27091222c851d0d1b18`.

| View | Desktop · 1240 × 940 | Narrow · 390 × 844 |
| --- | --- | --- |
| Six-category chooser | [PNG](desktop-chooser.png) | [PNG](narrow-chooser.png) |
| Clipper caption look | [PNG](clipper-caption-look.png) | [PNG](narrow-clipper-caption-look.png) |
| Clipper edit notes | [PNG](clipper-edit.png) | [PNG](narrow-clipper-edit.png) |
| Replica interface sketch | [PNG](replica-edit.png) | [PNG](narrow-replica-edit.png) |
| Day Trader practice journal | [PNG](day-trader-edit.png) | [PNG](narrow-day-trader-edit.png) |

## The same Clipper project in three appearances

The desktop recording changes appearance on the open edit sheet. The fixture called T3's `setTheme` and `setAppearanceMode` functions. It compared the rendered canvas, sheet and action colors with the resolved T3 tokens. The complete IndexedDB draft, including its ID and revision, matched across all three captures. The interior of the caption preview also matched pixel for pixel, including the text “Pull both ends evenly.” The comparison excluded the rounded corners where the editor surface shows through.

| Appearance | Editor canvas | Primary action | Caption sheet |
| --- | --- | --- | --- |
| T3 standard light | `oklch(0.992 0 0)` | `oklch(0.488 0.217 264)` | [Light](clipper-caption-look.png) |
| T3 standard dark | `rgb(0, 0, 0)` | `oklch(0.571 0.21 264)` | [Dark](clipper-caption-dark.png) |
| T3 Chat dark | `oklch(0.22813 0.020366 307.469)` | `oklch(0.460685 0.185347 4.099)` | [T3 Chat](clipper-caption-t3-chat.png) |

## Stick-figure Video guide

A separate desktop session selected **Stick-figure explainer**, accepted the manual scene and render plan, added a brief starter and wrote a motion direction. After a page reload, the saved storyboard showed the direction and all three authored shots. The text preview preserved their order. The downloaded project JSON retained the brief, motion direction, shots, source-rights note, style ID `stick-figure-explainer`, version 1 and the planned tool IDs `scene-editor` and `hyperframes`. [Style chooser](video-stick-figure-style.png) · [Reopened storyboard](video-stick-figure-storyboard.png)

## What the run checked

- The chooser exposed Blank, Digital product, Video, Clipper, Replica and Day Trader. It used three columns on desktop and one at 390 pixels. The tested chooser and editing steps had no horizontal overflow.
- **Clipper** saved a recording reference, permission notes, timecodes, framing, captions and review notes. The run resumed the review, returned to the edit sheet, revised framing, and checked the revised value in the edit-plan JSON. On the built-in sample frame, the run typed a caption, tried Callout and Headline, applied Headline, undid to Subtitles, and saved Callout. Reopening restored the text and Callout, and both values were present in the export. Publishing prep showed the planned M4C boundary.
- **Replica** resumed a saved sketch and exported the revised design. The default brief contained four original design fields. After explicit selection the second download added the permitted observation. The separate private backup retained the source locator and its terms. The optional prototype sheet showed the planned M6B boundary.
- **Day Trader** saved a synthetic data reference, practice rules, a manual replay decision and a journal. The run resumed and revised the journal, checked the revised value in the practice-journal JSON, and found no agent, replay, broker or order action on the tested screens.
- Clipper, Replica and Day Trader returned through Projects and reopened on their last sheets with saved values. A second reopen confirmed the revised value. At 390 pixels, the first reopen also followed a page reload. Chromium reported offline. The chooser displayed **Local workspace**, the editors displayed **Saved on this device**, and the run recorded zero renderer errors or unexpected requests.

## Layout observations and scope

At 390 by 844, Clipper Edit measured 1305 pixels of content with the caption preview. Clipper Review measured 1064 pixels with Earlier notes expanded. The fields and footer remained reachable by scrolling. At both widths the editor flagged an overlong headline and disabled Apply, then accepted the shorter version. Review displayed the saved caption and Callout look.

The Windows command was `node E:/T3Code/data/scratch/wp08-six-category-smoke/smoke.cjs` with Node 26.13.1. A synthetic HTTPS origin served the fixture HTML, JavaScript and CSS from memory, with service workers blocked and external requests denied. T3 made 19 same-origin environment-discovery GET requests to `/.well-known/t3/environment`. The fixture aborted each one locally. Every screenshot and the silent recording show only the Chromium page viewport. The content and drafts were created for this test. The run exercised the renderer, appearance API, local storage and JSON downloads. T3 Settings navigation, Electron, agent handoff, provider execution, optional still import, media rendering, prototype generation, replay and trading require separate evidence. The earlier Electron capture exercised the integrated 3D showcase guide. [Electron capture](../README.md)

## Source identity

`691f75f0aa27b4ccac39ebc5f983496e1900e954ab84b94255e8ce944bb881b5` identifies the component source snapshot tested before and after capture. For each path below in ordinal order, normalize CRLF to LF and calculate SHA-256. Append each lowercase digest, two ASCII spaces, the path and LF. Then calculate SHA-256 of the concatenated UTF-8 records.

```text
apps/web/src/features/studio/ClipLookPreview.tsx
apps/web/src/features/studio/StudioWorkspace.tsx
apps/web/src/features/studio/clipLook.css
apps/web/src/features/studio/drafts.ts
apps/web/src/features/studio/guide.ts
apps/web/src/features/studio/studio.css
apps/web/src/features/studio/workingDraftGuides.ts
apps/web/src/index.css
apps/web/src/lib/randomUUID.ts
docs/roadmap/project-categories.json
pnpm-lock.yaml
```

The [verification manifest](capture-manifest.json) records SHA-256 for the media, the Studio inputs above, the generated appearance assets, and every repository source contributing bytes to the appearance bundle. Each theme source was checked against its Git blob at `bb234221cefe1dfdc64d754ee14d0456c5d09ec6` before capture.
