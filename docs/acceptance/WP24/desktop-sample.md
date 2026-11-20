# Export a sample clip on Windows

1. Open a **Clipper** project in the Windows x64 desktop app. In **Export clips**, select **Try a sample export**.
2. On first use, download `imageio_ffmpeg-0.6.0-py3-none-win_amd64.whl` from the ImageIO release files, then select **Choose FFmpeg** and open the downloaded file. Studio extracts its qualified encoder directly. A matching standalone executable also works. [ImageIO release files](https://pypi.org/project/imageio-ffmpeg/0.6.0/#files)
3. Choose the frames to include in Studio’s five-second test pattern. The default starts at frame 30 and stops before frame 90. At 24 frames per second this gives 2.5 seconds. Select **Render sample** and use the video controls to inspect the silent 360 × 640 crop.
4. Select **Save As** and choose a new MP4 filename on a fixed local NTFS drive. Cancelling the dialog or selecting an occupied filename leaves the preview available. If Studio reports an uncertain result, check the selected location before making another export.

Rendering works offline after enrollment. The host uses its own source and a copy of the verified encoder in the Studio profile. Rendering and saving do not submit project data to a provider or change the project’s recording marks. Importing arbitrary recordings for this encoder, variable-rate timing, audio and caption burn-in remain open WP24 work.

## Build and recovery evidence

A privately packaged Windows x64 candidate rendered the default excerpt and played it through the Studio window. The saved file matched the reviewed bytes. A separate Chromium player reached 2.500 seconds and FFmpeg decoded 60 H.264 frames at 360 × 640 with no audio. The 203,362-byte MP4 has SHA-256 `9b0027813dcff34b22f8d1d0bd31dea990aaf4c93270724abb047231c886b277`. [Window capture](sample-review/playing.png) · [Playback in Studio](sample-review/playback.webm)

The native overwrite dialog may have received a human click during the candidate run. It provides no unattended overwrite acceptance. The Windows filesystem tests independently exercise collision refusal and preservation of existing bytes. This run used a private packaged candidate with production resources. Installer signing and the final release installer remain separate acceptance steps.

The Windows x64 qualification uses the ImageIO wheel with SHA-256 `02fa47c83703c37df6bfe4896aab339013f62bf02c5ebf2dce6da56af04ffc0a`. Its FFmpeg executable has SHA-256 `2ce797a0f88d7f067180338fb227f7b1928ea727bd9a4d7a1d022f7c52af71a3`. Studio checks the entire wheel before decompressing the single registered file and verifies the executable again before each render. It opens the original download through a native picker. No encoder is bundled with Studio.

Local host tests exercise review-token ownership, mismatched encoder rejection, direct wheel enrollment, cross-volume saving, an occupied filename, duplicate saves and byte-for-byte equality between the preview and the saved MP4. Process-interruption fixtures distinguish a committed file from a different file with matching contents. A destination removed after a save stays removed during recovery. Interrupted operations can retain private journal records and temporary staging files. Sudden power loss and concurrent changes by another process with access to the profile or destination are outside this qualification.

Run `node --test tools/clipper-render/*.test.ts` with `CLIP_RENDER_TEST_FFMPEG` and `CLIP_RENDER_TEST_FFMPEG_SHA256` set to the qualified local executable and fingerprint. Supply `CLIP_SAMPLE_TEST_WHEEL` for the real wheel case and an existing directory on a second local NTFS volume in `CLIP_SAVE_TEST_SECOND_ROOT` for the cross-volume case. The isolated browser tests exercise the sheet with a fixture bridge. [Driver qualification](portrait-driver.md)
