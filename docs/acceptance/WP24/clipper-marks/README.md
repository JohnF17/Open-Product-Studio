# Mark a moment in a local recording

Open **Clipper → Moment** and choose a recording you have permission to use. Scrub to the start and choose **Set mark in**. Scrub to the end and choose **Set mark out**. The buttons beside the marks seek to their saved positions. **Preview selection** plays the interval.

The fixture used an original six-second pendulum animation with a visible time readout. In Chromium, the native player opened the local WebM and reported its duration and dimensions. The test sought the playhead to 1.250 and 3.750 seconds, then used the builder controls to set and revisit both marks. Playback started at the selection. Pausing and resuming through the native media element preserved the automatic stop near mark out. The recorded event times are in the [verification manifest](manifest.json).

Under **Edit notes**, the test entered a caption for the swing. **Edit-plan export** downloaded a JSON plan and two WebVTT files. Chromium's native text-track reader loaded each download as one cue. It ran from 0.000 to 2.500 seconds for the trimmed clip and from 1.250 to 3.750 seconds for the original recording. The plan contained both marks and the caption. The test checked the download's size and contents for source bytes, filename, path and media URL.

Leaving Moment released the recording URL. The measured six-second duration carried across sheets. Setting mark out to seven seconds disabled caption download and identified the change needed on Moment. The test restored the 3.750-second mark before reloading.

Reopening the project restored the written marks with the recording detached. The IndexedDB project contained no file, binary buffer, source filename, or media URL. Export marked the recording duration as unverified. Selecting the source again required **Use saved marks for this recording**. Pressing Enter on that control moved keyboard focus to **Preview selection**.

| Captured view | Desktop light · 1240 × 940 | Phone width dark · 390 × 844 |
| --- | --- | --- |
| Marked recording | [Moment on desktop](desktop-moment.png) | [Moment at phone width](narrow-moment.png) |
| Source-relative caption | [Caption on desktop](desktop-caption.png) | [Caption at phone width](narrow-caption.png) |

[Silent desktop walkthrough](desktop-marks.webm)

## Verification scope

Both runs used production Studio components in an isolated Windows Chromium renderer with synthetic data, fresh storage, and external network access blocked. The phone-width run emulated touch and reduced motion. The fixture controlled the video element's native seek position programmatically, then used the visible mark, seek, preview and download controls. FFmpeg decoded the recording, both viewport sizes' stills and the viewport-only walkthrough.

These checks cover local browser playback, written marks, and edit-plan and caption downloads. Packaged Electron codec support, physical devices, frame-accurate rendering and playable clip export have separate acceptance gates.
