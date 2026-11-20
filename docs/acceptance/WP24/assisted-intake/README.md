# Two cuts from reviewed footage

This Windows Chromium run opened Clipper from the Studio project chooser at 1240 × 940 and 390 × 844. The input was a six-second, silent animation of a sunrise and moonrise created for this exercise. Studio sampled six frames, displayed them for review, then validated two proposed cuts against the selected source revision. Both layouts kept the cuts, rendered them locally, played them in the builder and downloaded real WebM files.

| Step | Capture |
| --- | --- |
| Choose the recording and review its six sampled frames | [Source review](source-review.png) · [Phone-width source](narrow-source.png) |
| Check the proposed intervals and citations before keeping them | [Suggested cuts](suggested-cuts.png) |
| Play the two exports and download each result | [Desktop exports](downloads.png) · [Phone-width exports](narrow-downloads.png) |

The [continuous viewport walkthrough](assisted-builder.webm) runs for 13.9 seconds. It contains only the Studio viewport and was re-encoded at 15 fps without cuts. The application outputs are the [vertical sunrise](daybreak.webm) and [square moonrise](nightfall.webm).

| Cut | Reviewed source time | Output | Desktop decoded frames |
| --- | --- | --- | --- |
| Daybreak | 0.250–2.000 seconds | 720 × 1280, silent | 53 |
| Nightfall | 3.250–5.250 seconds | 720 × 720, silent | 60 |

## What ran

The fixture mounted the production StudioWorkspace with its normal project chooser and supplied a scripted assistant reply only after the review callback provided the project and evidence revision. Video import, the contact sheet, citation checks, decisions, render, playback and browser downloads used the production code. The user granted silent-export permission. Every decoded frame of all four desktop and phone-width downloads was compared against a center-cropped source frame within 270 ms of its expected time. A second comparison against the opposite scene checked that a plausible clip from the wrong section could not pass.

The browser used a fresh headless profile and locally fulfilled loopback requests while offline. This test covers the renderer, an emulated phone viewport and a silent WebM input. Live model output, connected chat, screen capture, audio, remote URLs, real mobile hardware and desktop packaging need separate evidence. The [manifest](capture-manifest.json) identifies the base commit and working source hashes, synthetic reply, sample times, decoded frame counts and file hashes.
