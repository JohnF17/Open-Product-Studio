# Qualifying the local portrait renderer

Maintainers can exercise the silent portrait preset with a generated test pattern. The command checks the selected FFmpeg executable against a trusted SHA-256 digest, generates a five-second VP9 recording, renders a marked interval, checks the MP4 track timing and decodes the complete output. It writes a playable file and a machine-readable receipt to a new directory.

## Run the qualification

Use the repository's pinned Node version. Select an FFmpeg build with the lavfi test source, libvpx-vp9 and libx264 available. Obtain the expected executable digest from the build qualification record or another trusted source. Keep the executable, its runtime dependencies and the output parent under local control for the duration of the run. The command accepts a synthetic fixture only.

```powershell
node tools/clipper-render/qualify.ts --ffmpeg 'C:\tools\ffmpeg.exe' --sha256 '<trusted SHA-256>' --out 'C:\studio-tests\portrait-run-01'
```

Supply absolute paths and an existing output parent on a local filesystem supporting hard links. Each run requires an unused destination name. All media and receipt processing takes place locally. Encoding and decoding use the selected executable with fixed arguments and bounded subprocess lifetimes.

- Open `portrait.mp4` in a video player to inspect the center crop. The 800 × 450, 24 fps synthetic source is cropped to 252 × 448 and scaled to 360 × 640. Source frames 30 through 89 become output frames 0 through 59.
- Read `receipt.json` for the host platform, preset, executable and source digests, measured source frame count, selected interval, audio policy, dimensions, duration and exact artifact hash. Qualification requires all 120 source frames to decode even when an earlier cut could render from a shorter recording. Compare the saved file's SHA-256 to `artifact.sha256`.
- Temporary work stays in an OS temporary directory. After validation, Studio reserves a new output directory and flushes the MP4 and receipt before publishing the receipt. Ordinary failures clean up the run's partial outputs. A hard interruption can leave a directory without a committed receipt. An unconfirmed process termination retains private scratch for inspection.
- Once `receipt.json` appears, the result is committed. A cleanup warning gives the local path of any retained temporary data. Use the saved receipt to verify the MP4 in that directory.

## Verification on Windows

On Windows x64 with Node 26.13.1, the selected encoder hash was `2ce797a0f88d7f067180338fb227f7b1928ea727bd9a4d7a1d022f7c52af71a3`. One run rendered 60 silent frames, with 30,720 track ticks at 12,288 ticks per second. The MP4 measured 203,362 bytes and its SHA-256 was `9b0027813dcff34b22f8d1d0bd31dea990aaf4c93270724abb047231c886b277`. The decoder read all 60 frames.

Run the tests with the trusted executable and digest in `CLIP_RENDER_TEST_FFMPEG` and `CLIP_RENDER_TEST_FFMPEG_SHA256`. They exercise the cut's first and last images, distinct markers at each crop edge, a shortened source, cancellation with a staged MP4, an occupied destination, and cleanup failures after the receipt commits. The output also played to completion in Chromium on Windows.

```text
node --test tools/clipper-render/*.test.ts
```

This qualifies the component on synthetic, constant-rate, zero-origin input. Desktop source enrollment, untrusted-input decoder containment, user destination finalization, installed-app playback, audio, captions and variable-rate input each require additional evidence. The command performs its MP4 timing checks using a local track parser and a full FFmpeg decode. An independent FFprobe comparison remains open. [Clipper roadmap](../../CLIPPER.md) · [WP24 acceptance contracts](../../WORK-PACKAGES.md)
