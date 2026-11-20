# Production tutorial evidence

[Watch How Studio made this tutorial](tutorial.mp4). This smaller viewing copy keeps the original voice, edits, and burned subtitles. The table below describes the 1080p master.

On a 390 × 844 viewport the editor fit the available width. Tab reached the visible Play preview control, Enter began playback and Space paused it. Reduced motion suppressed animated transitions. [Phone-width capture](phone.png)

A Windows x64 browser session created a Video project, imported the 17-shot edit for **How Studio made this tutorial**, attached seven local sources, played the preview and approved the plan. **Render narrated MP4** called the paired local media process. The finished MP4 played in Studio and downloaded with its subtitles. A separate render from the project CLI produced byte-identical MP4 and WebVTT files.

| Measurement | Result |
| --- | --- |
| Video | 2,150 decoded H.264 frames, 1920 × 1080, 30 fps, 71.67 seconds of picture |
| Sound | Microsoft Zira Desktop, mono AAC at 48 kHz, −16.19 LUFS integrated, −1.34 dBTP |
| Subtitles | 26 timed WebVTT cues and burned subtitles, final cue ending at 71.1 seconds |
| MP4 SHA-256 | `7c1e34436274e64cd4a893521e005bcd7494c14784031fe97e877e74f8362918` |
| VTT SHA-256 | `30e8a3904292cbecc1d9fa4e66c7b7ee68db5dcb8d57fde03606f65b5ab9c7a1` |

**Model-assisted edit.** From Tools and models the creator selected an installed `qwen2.5:0.5b` on an isolated Ollama 0.9.3 host. The step assistant received a description and a reviewed interval. Its first proposal put a camera direction into the voiceover. The creator applied the cut, edited the narration, changed the freeze duration and rendered the result. The contact-sheet and transcript path in Clipper is a separate workflow. [Window-only recording](director-window.webm) · [Editor still](builder.png)

**Creative tools.** Real HyperFrames 0.9.72 and Remotion 4.0.545 executions created the original three-second transitions in the walkthrough. A separate 11-shot lesson was approved, rendered and downloaded in Studio at 1080p with voice and timed captions. The command-line interfaces for optional paid and network tools have separate acceptance boundaries. [Local setup and commands](../../../../tools/studio-media/README.md)

In separate headless sessions, Video attached the H.264 output of both motion engines and played each result. Clipper ran whisper.cpp on a 3.818-second voiced MP4. The model's terminal timestamp overran the source. Studio bounded the final cue to the available audio, showed the corrected subtitle for review and applied it only after confirmation. Openverse returned HTTP 500 in a live query. A permitted public YouTube test returned no eligible MP4. ElevenLabs and Clips Kitty were exercised with controlled responses and require a separately configured account or running engine for a live result.

The original Blender Orbit composition rendered in 198 seconds on the qualified Windows CPU route with Blender 4.5.16. All 72 frames decoded at 640 × 360 and 24 fps. The file SHA-256 was `530d294650c0c7344d57cc6415439acbbb092ba3712ab3ef7ef237576d988988`.

Additional real requests sent a synthetic writing task through each of the six eligible category recipes to the same installed Qwen model. The response validator accepted suggestions for Blank, Digital product, Video, Clipper, Replica and Affiliate Storefront. Writable stages produced proposed edits. Read-only stages returned guidance. The trial did not establish usefulness for every prompt, and the offline Day Trader path uses its separate on-device route.

**Reproduction.** Follow the Video builder walkthrough, using a local recording you are permitted to edit. The qualification used Node 26.13.1, a Windows FFmpeg build and a real speech installation. Capture used an isolated full application renderer on loopback, with desktop-only entry visibility enabled in that disposable browser fixture. Production operations used the real model, media bridge, source files, renderer and download controls. Packaged Electron distribution and native installer behavior require a separate installed run. [Builder walkthrough](../../tutorial-production-ui.md)

A separate hidden Electron 44.10.1 window registered the desktop's secure custom scheme. Chromium preflighted and reached the paired media process and model relay from `open-product-studio://app`. A real Affiliate drafting request returned structured copy from the selected local Qwen model, with the same active runner digest after generation. No pairing token or prompt was stored in the transport receipt.
