# Local tutorial production

Render a Studio tutorial from local screen recordings and an editable scene plan. The render writes a 1920 × 1080, 30 fps H.264/AAC MP4, a WebVTT transcript and a JPEG taken from the finished video. Each scene has a dedicated lower third and timed spoken subtitles beneath the picture. Source audio is muted.

Use Node.js 22 or newer and a local FFmpeg build that includes libx264, libass, zoompan, loudnorm and AAC. The host also needs a font that libass can resolve for Arial. Windows can synthesize an explicitly selected installed System.Speech voice. Other platforms accept a supplied PCM WAV. All rendering and synthesis described here run locally.

## Render from an exported project

### Connect the Studio window

Start the companion from the checkout with Node and the absolute path of your installed FFmpeg. Use the exact origin shown by the open editor. For the installed Studio window on Windows, this launcher also offers an FFmpeg picker when needed.

```powershell
./tools/studio-media/start-renderer.ps1
```

Paste the pairing code into Video → Preview → Render your tutorial. Attach source files, review the shot list, and press **Render narrated MP4**. The download and separate subtitles become available after encoding. On Windows the voice must be installed for the current user. On other hosts attach your recorded WAV. The browser route accepts MP4 or WebM sources with at most 128 MiB of multipart data per request. The CLI below accepts local files directly.

To add motion inserts or subtitles, start the companion with the matching opt-in and the tools already installed. Pass `--work` to select a staging directory on a drive with space for the media. On Windows the launcher accepts `-Motion`, `-WhisperModel`, `-StudioOrigin`, `-Voice`, `-EncoderPath` and `-WorkDirectory`.

```sh
node tools/studio-media/bridge.mjs --origin http://127.0.0.1:3773 --ffmpeg /path/to/ffmpeg --motion --whisper-model /path/to/ggml-model.bin --work /path/to/staging
node tools/studio-media/vendors.mjs doctor --model /path/to/ggml-model.bin
```

| Tool | Where you use it | What you need |
| --- | --- | --- |
| FFmpeg and narration | Video → Preview → Render | An installed encoder, plus an installed Windows voice or a full-length recorded WAV. |
| Remotion, HyperFrames, Blender | Video → Preview → Create a motion insert | Choose one installed renderer. The original compositions produce editable source clips. Browser compositions use a local tool directory and browser. Blender uses a local Blender 4.3+ executable. |
| whisper.cpp | Clipper → Source → Generate subtitles locally | whisper-cli, a compatible GGML model, FFmpeg and a recording with audible speech. Review the generated timings before use. |
| yt-dlp | Media CLI | A permitted public YouTube video, an installed executable and a confirmed download. |
| Clips Kitty | Media CLI | A user-started local engine and an existing video ID for timing proposals. |
| Openverse | Media CLI | Confirm the public metadata search. Inspect the original item's license and attribution before reuse. |
| ElevenLabs | Media CLI | A dedicated credit-capped key and a confirmed request matching the preview. The tutorial renderer accepts recorded WAV as a separate route. |

Run `node tools/studio-media/vendors.mjs --help` for the command forms and environment variables. Browser compositions use HyperFrames 0.9.72 or Remotion 4.0.545 with their matching dependencies in `STUDIO_CREATIVE_NODE_ROOT`. Set `STUDIO_CHROME_BIN` for the local browser, and `STUDIO_FFPROBE_BIN` for HyperFrames. Keep package installations and their license terms with the chosen host. [Builder walkthrough](../../docs/acceptance/tutorial-production-ui.md)

### Connect Ollama 0.9.3 from the Studio desktop window

Start Ollama 0.9.3 on loopback with the model you already installed. Start the relay in a separate terminal from the checkout. Use the port Ollama is actually listening on and a different unused port for Studio.

```sh
node tools/studio-media/ollama-relay.mjs --ollama-port 11434 --port 11435
```

In **Tools and models → Local Ollama model**, set **Ollama port** to `11435`, choose **Find installed models**, and select the installed model. Keep the relay terminal open for drafting. Press Ctrl+C there to stop it. The desktop default is `open-product-studio://app`. For the developer desktop window, pass `--origin open-product-studio-dev://app`. For a local browser window, either connect directly to your qualified Ollama host or pass the exact HTTP loopback origin, for example `--origin http://127.0.0.1:3773`.

Use the relay with a trusted local Ollama 0.9.3 server. It verifies that version before forwarding text and checks that the requested model has an installed name and digest. Its listener checks the exact browser origin and loopback Host. Local programs on your computer can supply those headers, so run it within your local account's trust boundary. It serves model inventory, version, runner status, model information and bounded text chat. It supports an empty-message preload and accepts one chat at a time. Pulls, tools, attachments, streaming, remote model routes and prompt logging are outside the relay. Both connections stay on `127.0.0.1`. Newer qualified Ollama releases can use Studio's direct local route. [Ollama 0.9.3 API](https://github.com/ollama/ollama/blob/v0.9.3/docs/api.md)

### Render without a browser

Save the builder's exported JSON as `plan.json`. Create a separate `local-assets.json` mapping each source ID to a recording you selected. Relative paths resolve against the assets file. Supported containers are MP4, MOV, M4V, WebM and MKV.

```json
{
  "editor": "recordings/adding-a-scene.webm"
}
```

Validate the plan and resolve its source IDs.

```sh
node tools/studio-media/cli.mjs validate --project plan.json --assets local-assets.json
```

Render with a full-timeline WAV containing your recorded narration. Alternatively, replace `--audio narration.wav` with `--voice "Microsoft Zira Desktop"` on a Windows machine where that voice is installed. To list installed voices in Windows PowerShell, run `Add-Type -AssemblyName System.Speech` followed by `(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices().VoiceInfo.Name`.

```sh
node tools/studio-media/cli.mjs render --project plan.json --assets local-assets.json --audio narration.wav --output tutorial.mp4
```

FFmpeg resolves through the host PATH by default. Supply `--ffmpeg <absolute-path-to-ffmpeg>` to select a particular executable. The destination directory must already exist and support hard links. The three outputs must be new files. `--preview <new.jpg>` overrides the default `tutorial.jpg` in the same directory. Progress goes to stderr. The final stdout line contains the output paths, frame count and duration as JSON.

## Scene plan

```json
{
  "schema": "studio-tutorial/1",
  "title": "Add a scene",
  "scenes": [
    {
      "id": "choose",
      "source": "editor",
      "start": 0.2,
      "end": 3.4,
      "focus": { "x": 0.7, "y": 0.46, "zoom": 1.65 },
      "hold": 1.6,
      "caption": "Choose a recording",
      "narration": "Select your recording to open its timeline."
    }
  ]
}
```

| Field | Behavior |
| --- | --- |
| `id`, `source` | Use 1–64 ASCII letters, digits, underscores or hyphens. Start with a letter or digit. The reserved names `constructor`, `prototype` and `__proto__` are excluded. Each scene ID is unique. Multiple scenes can select different ranges of the same source. |
| `start`, `end` | Source seconds in the range 0–86400. The start is included and the end is excluded. The renderer rounds each boundary to the nearest 30 fps frame. Each cut must contain at least one frame and may last up to 180 seconds. Rendering checks the actual decoded source length. |
| `hold` | Optional final-frame freeze in seconds, from 0 to 60, rounded to the nearest frame. The next scene starts exactly after the cut and hold. |
| `focus` | Optional center coordinates in the range 0–1 on a centered, contain-fit 16:9 source canvas. The zoom factor ranges from 1 to 3. The camera eases from the wide frame to the requested subject over the first 23 frames or 40% of the scene, whichever is shorter. It clamps to the source bounds. |
| `caption` | A 1–80 character scene heading that remains visible for the shot. |
| `narration` | A 1–900 character transcript. Supply what the narrator actually says. |

A project has a 1–120 character title, 1–120 scenes, and a maximum duration of 20 minutes. Text is single-line Unicode. Control characters, braces and backslashes are rejected. Extra fields are rejected. A project selects local media by source ID. The host supplies the file map, executable, output destination and voice or WAV separately.

## Narration timing

The SAPI route measures speech bookmark positions in the generated audio for each phrase. It keeps longer shots quiet after narration ends. If narration would overrun a scene, the renderer can increase its tempo by up to 40% while preserving pitch. A larger overrun identifies the scene to extend or shorten. Each scene starts on its authored timeline frame.

The WAV route accepts a full-timeline track within one frame of the expected duration. It assigns subtitle phrases proportionally within each scene using the supplied script. It does not perform speech recognition or recover word timestamps. The final mix targets −16 LUFS integrated and −1.5 dBTP through FFmpeg loudnorm and encodes 48 kHz mono AAC.

## Verify locally

Run schema tests without FFmpeg. For the media integration suite, set `STUDIO_MEDIA_FFMPEG` to its absolute path. Optionally set `STUDIO_MEDIA_TEST_DIR` to an existing directory on the desired scratch drive. Set `STUDIO_MEDIA_VOICE` to an exact installed Windows voice name to exercise its native synthesis and subtitle timing.

```sh
node --test tools/studio-media/project.test.mjs tools/studio-media/render.test.mjs
```

The integration suite creates a synthetic color-changing recording, measures the crop and edit boundaries in decoded output pixels, checks the audio channel, verifies burned text and WebVTT cues, and exercises failed and duplicate outputs. Normal failures and cancellation remove the job's temporary files. If the operating system terminates the host process forcibly, an unfinished hidden `.studio-media-*` directory can remain beside the output.

Run `node --test tools/studio-media/ollama-relay.test.mjs` to exercise the relay's origin and Host checks, request and response limits, warm request, concurrency and disconnect behavior with a local fixture.
