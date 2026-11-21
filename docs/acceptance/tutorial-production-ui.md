# Tutorial production in Video

Use a local MP4 or WebM that you have permission to edit. A short recording with two visible actions and a readable menu makes the zoom and caption checks easy to reproduce.

1. Start a **Video** project in Studio and open **Preview** using the step selector.
2. Choose a file for the `screen` source or add a different source ID. Add a shot and select its source. Enter the start and end in seconds, a short line of narration, and an on-screen label. Add a second shot from the same recording or a different source.
3. Turn on **Zoom into the recording** and move the focus sliders to the action. Press **Play preview** to check the cut, crop, and on-screen text. The shot preview plays without narration. To extend a shot after the recording ends, set **Freeze last frame (seconds)**.
4. To use the step assistant, expand **Share source ranges with the step assistant**. Copy the inspected ranges into its context along with the tutorial goal and the actions visible in the footage. Review the assistant's suggestion, then select the shots you want under **Review proposed shots** and add them to the timeline. **Import production plan** opens the same shot review for a `studio-tutorial/1` JSON file.
5. Move to **Materials** and back to **Preview**. The recordings are still attached. Reopen the project from **Projects** and check that the shot order, timings, labels, narration, and focus edits are saved. Reattach local recordings after reopening.
6. Check **I reviewed this production plan**. Download `tutorial.json` and inspect the source IDs and edits. Local file bindings and renderer credentials stay in the open session. Change a shot and verify that a new review is required.
7. For a finished file, expand **Start the local renderer** and run its command in the source checkout with the installed FFmpeg path. Enter the pairing code, attach a full-timeline WAV if needed, and choose **Render narrated MP4**. Play the result in Studio, download the MP4 and subtitles, and play the MP4 outside Studio. The **Render with the local CLI** disclosure gives the standalone handoff using the same plan and a separately prepared local asset mapping.

While **Preview** stays open, **Last completed render** remains downloadable after a failed retry. Editing the plan or changing its source files cancels a pending render and requires a fresh review.

With an eligible motion tool installed, **Create a motion insert** renders an original animation and attaches the resulting MP4 as a new source ID. Select that ID in a shot and review its timing like any other recording.

## Social reel, layout and audio

1. In **Video → Preview → Presentation**, choose **Social reel**. Confirm it opens in **9:16 Portrait** with centered subtitles. Play a shot and check that the subject stays in frame and the preview highlights spoken words. Try **1:1 Square** and **16:9 Landscape**, and check **Lower** and **Off in video**. Select **Walkthrough** to see the full picture and the label below.
2. Review and download the plan. Confirm the exported JSON contains the chosen `presentation` values. Change the aspect ratio and confirm a fresh review is required.
3. Start the [local renderer with Kokoro configured](../../tools/studio-media/README.md#use-local-kokoro-narration). Pair it, choose an installed Kokoro **Narrator**, then play **Preview this voice**. Attach a local WAV under **Music or sound effects**, choose a **Soundtrack level**, and render. Listen to the result around a spoken phrase and a pause. Download the WebVTT, including after a render with **Off in video**.

Use a renderer and Studio build that include the Social reel feature.

## Local subtitles in Clipper

Attach a recording on **Source** and expand **Generate subtitles locally**. Its setup command starts the paired renderer with the selected local whisper.cpp model. Enter the pairing code and choose **Create subtitles on this computer**. Read the timed cues before choosing **Use reviewed subtitles**. Starting a manual caption import or switching recordings during transcription cancels the pending request.

## Browser regression

Run from `apps/web` on a configured checkout with Chromium installed.

```powershell
pnpm exec vp test run --project browser src/features/studio/TutorialProduction.browser.test.tsx src/features/studio/VideoCueSheet.browser.test.tsx src/features/studio/ClipperSource.browser.test.tsx
```

The Windows source qualification ran with Node 26.13.1, Chromium, and the isolated checkout's `--config combined.browser.config.ts --maxWorkers=1`. All 14 tests passed across the three files. The run used a two-second synthetic WebM, a stored assistant proposal, and fixture responses from the render and speech endpoints. Actual local MP4 synthesis, speech recognition, voice selection, and assistant provider calls have separate integration evidence.
