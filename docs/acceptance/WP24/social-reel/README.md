# Seven builders in 48 seconds

Studio's social preset fills a 1080 × 1920 canvas. The centered captions highlight the current word; individual word timing is estimated within each spoken phrase. Each shot keeps a source interval, narration and focus. The same project can be rendered square or landscape. [Watch the reel](showcase.mp4) · [Three phone-size frames](phone-frames.jpg)

This cut uses project recordings, the exported garden workbook and storefront, and original motion rendered with Remotion. The motion includes the project's Blender orbit. GPT-6.2 Astra High directed the sequence. GPT-6.2 Sol High authored the motion inserts through T3's Codex provider. The local Codex CLI reported ChatGPT sign-in. Studio rendered the final speech with the local Kokoro Heart voice and mixed a WAV containing Earshot cues and original synthesized music. The separate walkthrough preset retains the landscape lesson layout.

The 20-shot master decoded to 1,455 H.264 frames and 48.5 seconds of AAC audio. Measured integrated loudness was −16.6 LUFS with a true peak of −1.5 dBFS. Master SHA-256 was `c8a0c3163f689a39b574f7a9e6c81ca6b113cfb5f95eda91a2ffb3b325a0f683`. The linked video is a smaller encoding for viewing on a phone. [Renderer setup](../../../../tools/studio-media/README.md)

## Packaged Windows export

On Windows x64, the packaged Studio build at `78dbcaedc2` opened a fresh local Video project, imported the 20 shots, attached four recordings, and displayed the portrait, square and landscape controls. Through the desktop UI, the test paired the local renderer, auditioned Kokoro Heart, attached the soundtrack at Balanced, and rendered the project. Electron downloaded the MP4 and WebVTT. Both matched the CLI exports byte for byte. The MP4 was 11,160,324 bytes. The subtitle SHA-256 was `c37c1dc1c57df039d01a21929e13fc86d885794ce3a279937acc9960dae30545`.

The run used an isolated Windows desktop and synthetic project data. Its network monitor observed only loopback connections. The native download test selected the destination programmatically. Subscription-backed editing inside Studio remains a separate acceptance case.
