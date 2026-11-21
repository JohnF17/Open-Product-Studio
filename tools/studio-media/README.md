# Local tutorial production

Render a Studio tutorial from local screen recordings and an editable scene plan. The render writes a 30 fps H.264/AAC MP4, a WebVTT transcript and a JPEG from the finished video. Source audio is muted.

Use Node.js 22 or newer and a local FFmpeg build with libx264, libass, zoompan, loudnorm and AAC. A soundtrack also uses sidechaincompress and amix. The host needs a font that libass can resolve for Arial. Choose configured Kokoro narration, an installed Windows System.Speech voice, or a supplied full-timeline PCM WAV. Rendering and synthesis run locally.

## Render from an exported project

### Connect the Studio window

Start the companion from the checkout with Node and the absolute path of your installed FFmpeg. Use the exact origin shown by the open editor. For the installed Studio window on Windows, this launcher also offers an FFmpeg picker when needed.

```powershell
./tools/studio-media/start-renderer.ps1
```

Paste the pairing code into Video → Preview → Render your tutorial. Attach source files, review the shot list, and press **Render narrated MP4**. The download and separate subtitles become available after encoding. The browser route accepts MP4 or WebM sources with at most 128 MiB of multipart data per request, including audio attachments. The CLI below accepts local files directly.

To add motion inserts or subtitles, start the companion with the matching opt-in and the tools already installed. Pass `--work` to select a staging directory on a drive with space for the media. On Windows the launcher accepts `-Motion`, `-WhisperModel`, `-StudioOrigin`, `-Voice`, `-EncoderPath` and `-WorkDirectory`.

```sh
node tools/studio-media/bridge.mjs --origin http://127.0.0.1:3773 --ffmpeg /path/to/ffmpeg --motion --whisper-model /path/to/ggml-model.bin --work /path/to/staging
node tools/studio-media/vendors.mjs doctor --model /path/to/ggml-model.bin
```

| Tool | Where you use it | What you need |
| --- | --- | --- |
| FFmpeg and narration | Video → Preview → Render | An installed encoder and a configured Kokoro voice, installed Windows voice, or full-length recorded WAV. |
| Earshot | Media CLI, then Video → Preview | Leon Lin’s Earshot with the local `sfx` command and a destination for the cue WAV. |
| Remotion, HyperFrames, Blender | Video → Preview → Create a motion insert | Choose one installed renderer. The original compositions produce editable source clips. Browser compositions use a local tool directory and browser. Blender uses a local Blender 4.3+ executable. |
| whisper.cpp | Clipper → Source → Generate subtitles locally | whisper-cli, a compatible GGML model, FFmpeg and a recording with audible speech. Review the generated timings before use. |
| yt-dlp | Media CLI | A permitted public YouTube video, an installed executable and a confirmed download. |
| Clips Kitty | Media CLI | A user-started local engine and an existing video ID for timing proposals. |
| Openverse | Media CLI | Confirm the public metadata search. Inspect the original item's license and attribution before reuse. |
| ElevenLabs | Media CLI | A dedicated credit-capped key and a confirmed request matching the preview. The tutorial renderer accepts recorded WAV as a separate route. |

Run `node tools/studio-media/vendors.mjs --help` for the command forms and environment variables. Browser compositions use HyperFrames 0.9.72 or Remotion 4.0.545 with their matching dependencies in `STUDIO_CREATIVE_NODE_ROOT`. Set `STUDIO_CHROME_BIN` for the local browser, and `STUDIO_FFPROBE_BIN` for HyperFrames. Keep package installations and their license terms with the chosen host. [Builder walkthrough](../../docs/acceptance/tutorial-production-ui.md)

### Choose a reel layout and soundtrack

In **Video → Preview → Presentation**, select **Social reel** for a full-frame crop, gradual camera motion and highlighted words. It defaults to **9:16 Portrait** with centered subtitles. **Walkthrough** defaults to **16:9 Landscape** with the full picture and a label below. Either style can use **9:16 Portrait** (1080 × 1920), **1:1 Square** (1080 × 1080), or **16:9 Landscape** (1920 × 1080). Choose **Center**, **Lower**, or **Off in video** for subtitles. The separate WebVTT is available with all three settings. Preview each crop before reviewing the plan because a different ratio can move a subject out of frame.

Once paired, attach an optional WAV under **Music or sound effects** and choose **Subtle**, **Balanced**, or **More prominent**. The renderer lowers the bed under narration and fits it to the timeline, padding short files with silence and trimming long ones. To time multiple effects, arrange them in a single WAV before attaching it. The soundtrack file is a local attachment. An exported plan carries the layout, subtitle and scene settings.

Generate an individual cue with Leon Lin’s MIT-licensed Earshot. Use a local executable that supports `earshot sfx list` and `earshot sfx render`, such as version 0.4.1. Put it on PATH or set `STUDIO_EARSHOT_BIN` to its absolute executable path. The Studio command renders the selected preset offline to a new WAV in an existing directory. [Earshot 0.4.1 source](https://github.com/Leonxlnx/earshot/tree/4ac3d2ac2b151e1c23376f9ce7f3047a17050013)

```sh
earshot sfx list
node tools/studio-media/vendors.mjs earshot --id whoosh_fast/crisp --output whoosh.wav
```

### Use local Kokoro narration

Install `kokoro-onnx==0.6.1` in a Python virtual environment and stage a compatible Kokoro v1.0 ONNX model and NumPy voice archive locally. Set `STUDIO_KOKORO_PYTHON` to the environment’s Python executable, `STUDIO_KOKORO_MODEL` to the ONNX model, and `STUDIO_KOKORO_VOICES` to the voice archive. Use absolute paths. Choose installed English voice IDs such as `af_heart` or `af_bella`, then run the check for each ID you intend to offer. The renderer loads the selected model locally on CPU. [Kokoro ONNX setup and model links](https://github.com/thewh1teagle/kokoro-onnx#setup)

```powershell
node tools/studio-media/kokoro.mjs --voice af_heart --check
node tools/studio-media/kokoro.mjs --voice af_bella --check
./tools/studio-media/start-renderer.ps1 -KokoroVoice af_heart,af_bella
```

For the direct bridge command, add `--kokoro-voice af_heart --kokoro-voice af_bella` with the same environment. Pair Studio, choose a voice under **Narrator** and use **Preview this voice** to hear it before rendering. You can also provide recorded WAV narration or choose the configured Windows voice.

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

For Kokoro, use `--voice "kokoro:af_heart"` with the same host configuration. Add `--soundtrack bed.wav --soundtrack-level balanced` to mix an optional bed. The accepted levels are `subtle`, `balanced` and `present`. The exported project's `presentation` controls the output format.

FFmpeg resolves through the host PATH by default. Supply `--ffmpeg <absolute-path-to-ffmpeg>` to select a particular executable. The destination directory must already exist and support hard links. The three outputs must be new files. `--preview <new.jpg>` overrides the default `tutorial.jpg` in the same directory. Progress goes to stderr. The final stdout line contains the output paths, frame count and duration as JSON.

## Scene plan

```json
{
  "schema": "studio-tutorial/1",
  "title": "Add a scene",
  "presentation": { "aspect": "9:16", "style": "social-reel", "captions": "center" },
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
| `focus` | Optional center coordinates in the range 0–1 and a zoom factor from 1 to 3. Walkthrough eases from a wide, contain-fit view toward the requested subject. Social reel fills the selected aspect ratio, uses these coordinates to frame the crop, and adds a gentle push-in when zoom is 1. |
| `caption` | A 1–80 character scene heading. Walkthrough displays the heading for the shot. |
| `narration` | A 1–900 character transcript. Supply what the narrator actually says. |

The optional `presentation` object contains `aspect` (`9:16`, `1:1`, or `16:9`), `style` (`social-reel` or `studio-lesson`), and `captions` (`center`, `lower`, or `off`). Plans saved before this setting was introduced render with the standard landscape Walkthrough layout.

A project has a 1–120 character title, 1–120 scenes, and a maximum duration of 20 minutes. Text is single-line Unicode. Control characters, braces and backslashes are rejected. Extra fields are rejected. A project selects local media by source ID. The host supplies the file map, executable, output destination and voice or WAV separately.

## Narration timing

Kokoro measures the start of each synthesized phrase. The SAPI route measures speech bookmark positions in the generated audio. Longer shots stay quiet after narration ends. If narration would overrun a scene, the renderer can increase its tempo by up to 40% while preserving pitch. A larger overrun identifies the scene to extend or shorten. Each scene starts on its authored timeline frame.

The WAV route accepts a full-timeline track within one frame of the expected duration. It assigns subtitle phrases proportionally within each scene using the supplied script. It does not perform speech recognition or recover word timestamps. The final mix targets −16 LUFS integrated and −1.5 dBTP through FFmpeg loudnorm and encodes 48 kHz mono AAC.

## Verify locally

Run schema tests without FFmpeg. For the media integration suite, set `STUDIO_MEDIA_FFMPEG` to its absolute path. Optionally set `STUDIO_MEDIA_TEST_DIR` to an existing directory on the desired scratch drive. Set `STUDIO_MEDIA_VOICE` to an exact installed Windows voice name to exercise its native synthesis and subtitle timing.

```sh
node --test tools/studio-media/project.test.mjs tools/studio-media/render.test.mjs
```

The integration suite creates a synthetic color-changing recording, measures the crop and edit boundaries in decoded output pixels, checks the audio channel, verifies burned text and WebVTT cues, and exercises failed and duplicate outputs. Normal failures and cancellation remove the job's temporary files. If the operating system terminates the host process forcibly, an unfinished hidden `.studio-media-*` directory can remain beside the output.

Run `node --test tools/studio-media/ollama-relay.test.mjs` to exercise the relay's origin and Host checks, request and response limits, warm request, concurrency and disconnect behavior with a local fixture.
