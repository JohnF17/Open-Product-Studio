# Studio builder window capture

On 2026-11-19 a fresh Windows x64 profile opened the project chooser on the local Electron home route. The build used the integrated T3 revision `bb234221cefe1dfdc64d754ee14d0456c5d09ec6`, Node 26.13.1, pnpm 12.14.0 and Electron 44.10.1. The frozen desktop and web dependency graph passed its supply-chain check. All five tasks in `pnpm run build:desktop` succeeded. Playwright launched the unpackaged production build without an account.

| Asset | Scope | SHA-256 |
| --- | --- | --- |
| [Project chooser](studio-window.png) | 1240 by 830 PNG, 293,657 bytes | `19c02d38471f634f07ad467d41d67e5e7272b5c67c5c309a84c53686081acbcd` |
| [Video builder walkthrough](builder-window.mp4) | 1240 by 830 H.264 MP4, 24 fps, 8.5 seconds, 6,168,745 bytes | `55d60b55dc13b620e5334abda26fa05731f9b9922742e95f3b426887b59374cd` |

Both files contain the entire Electron renderer content area, including its sidebar. Playwright captured the PNG directly. Chromium DevTools captured 104 timestamped frames from that same renderer target. The clip holds each frame until its successor, ends with a brief hold, and has one video stream. All 204 encoded frames decoded successfully. The project and its content are synthetic.

The clip follows the **Video** category from its **3D showcase** style through tool selection, the brief and the storyboard, including a return to the tool plan. The run verified that Next and Back animate in opposite directions, outgoing sheets become inert, the selected tool and typed text survive navigation, and a 390-pixel viewport accommodates the builder with reduced motion. After the clip, the automated run reloaded the project, opened a recommendation as an unsent T3 composer draft, returned through Studio home, and reopened saved work in a second Electron process using the same profile. The provider received no prompt.

The application source identity for this capture is `405266c13dc06139004ec9490848446a828acea8ffab26c8f0185d15af503be9`. To reproduce it, sort the following repository paths by ordinal value. For each file, normalize CRLF to LF, compute its SHA-256 and append the lowercase digest, two ASCII spaces, the path and LF. SHA-256 of these concatenated UTF-8 records is the source identity.

```text
apps/web/src/components/StudioLanding.tsx
apps/web/src/components/sidebar/SidebarChrome.tsx
apps/web/src/features/studio/StudioWorkspace.tsx
apps/web/src/features/studio/drafts.ts
apps/web/src/features/studio/guide.ts
apps/web/src/features/studio/studio.css
apps/web/src/hooks/useHandleNewThread.ts
apps/web/src/routes/__root.tsx
apps/web/src/routes/_chat.index.tsx
docs/roadmap/project-categories.json
```
