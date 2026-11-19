# Clipper projects

Clipper starts with a moment in an existing recording. A teacher can take one explanation from a lesson, and a developer can turn the few seconds where a feature works into a captioned walkthrough. Each project keeps the original recording, its marked moments and independently editable versions of each clip. The first release target is a portrait clip you can play outside Studio and reopen for another edit, working offline with a recording you have permission to use.

Clipper is the fourth **planned** project category. The 19 November Windows capture shows the three choices its build supports, Blank, Digital product and Video. The chooser source still defines those three. Video starts by choosing a style and reviewing its tool checklist, then moves to the brief and storyboard. Both media categories share the Library, editor revisions, render jobs and export review. A rendered Video can become a Clipper source when the user selects that specific revision. [Current Windows build evidence](acceptance/WP08.md) · [Category catalog](roadmap/project-categories.json)

## The first clip

| Builder step | What someone sees and controls |
| --- | --- |
| **Source** | Create an empty Clipper project. Choose an owned local recording or an authorized Library revision. Show its duration, audio tracks and a preview. Save the source permissions and permitted uses. A pasted reference link can remain a note until the user supplies eligible media. |
| **Moments** | Mark a start and end while playing the recording. Give the moment a name and play the surrounding context. With an eligible assistant, ask “Where does the guest explain the first repair?” or “Show the checkout working without sound.” Each suggestion opens at the cited interval. Keep, trim or dismiss it. |
| **Edit** | Drag a portrait crop while watching the actual subject, or adjust it with the keyboard. Enter captions directly, import timed captions, or correct a proposed transcript. Preview caption placement and line breaks over the clip. Compare an original style preset or a permitted reference on this exact moment. Duplicate the variant to try another framing while keeping the first version. |
| **Review** | Play the selected cut with sound and then muted. Check the opening and closing frames, caption timing, crop, credits and permissions for voices, music or people visible in the shot. A corrected caption or cut reopens review for the affected variant. |
| **Export** | Save the reviewed 9:16 video locally with an optional caption sidecar and an editable project manifest. The manifest identifies the source by revision and digest. It can prompt for a matching file on a different device. Including authorized source media in a portable bundle is a separate choice. |
| **Publish, optional** | For an eligible connector, choose the destination account, preview the selected revision with its caption and visibility, and approve that one post. Show the confirmed post reference or an unresolved result. Local export completes the project independently. |

Use the existing horizontal builder. Next slides the current sheet left and Back slides it right. Return focus to the incoming heading, offer a reduced-motion transition, and keep timeline controls operable by keyboard. On a narrow window the preview and controls stack. Home resumes the last moment, variant and step after a restart. A missing source offers relink by digest and keeps prior marks available.

Video and Clipper share the optional style board. The next design records selectable examples, reference analysis, recipe-specific tools and the Clips Kitty integration candidate. [Media workflows and style references](MEDIA-WORKFLOWS.md)

## Tool decisions

| Tool | Decision and evidence |
| --- | --- |
| **FFmpeg and ffprobe** | First candidates for a Windows local renderer and media inspection. Probe the selected local file and qualify an exact encoder build, configuration and export preset before distribution. Seeking between keyframes needs a decoded-frame acceptance test. Build options and linked libraries affect redistribution obligations. [FFmpeg manual](https://ffmpeg.org/ffmpeg.html) · [ffprobe manual](https://ffmpeg.org/ffprobe.html) · [Build licensing](https://ffmpeg.org/legal.html) |
| **whisper.cpp** | Candidate for optional on-device speech transcription. Show the model, download size and disk requirement before preparation. Keep machine timings editable and save corrections as revisions. Test speech, silence and background noise before enabling the action. [Project documentation](https://github.com/ggml-org/whisper.cpp) |
| **PySceneDetect** | Candidate for optional visual navigation. Its shot-change detector returns time ranges. A user can inspect a transition or use those frames to ground a suggestion. A static screen recording can still contain an excellent manual clip. [Detection and export documentation](https://www.scenedetect.com/docs/latest/) |
| **OpusClip and OpenClipper** | Product references for prompt-based moment selection, caption editing and reframing. OpenClipper also describes a local desktop workflow and batch export. Use these as comparisons when testing how quickly someone can find, correct and export one good clip. [OpusClip tutorials](https://www.opus.pro/learning-center) · [OpenClipper repository](https://github.com/GrepCut/OpenClipper) |
| **Vizard** | Candidate only if users later need hosted processing. Its API uses paid upload minutes and returns a project ID before results are available. Show the files leaving the device, account and bounded charge before upload. Reconcile that ID on interruption. Adoption requires a separate provider decision and live qualification. [Billing](https://docs.vizard.ai/docs/pricing) · [Job response](https://docs.vizard.ai/docs/response) |

The basic tool checklist contains a local media reader and renderer. Transcription, scene detection and model-assisted selection appear only for the actions that use them. A creator can inspect what each action reads, where it runs, whether anything leaves the device and what it costs. No additional hosted service is required for the first export.

## Editing and agent contracts

- Save each cut as a half-open interval `[in, out)` in the source presentation timeline. Store integer timestamps with their rational time base, chosen tracks and source revision. Map preview proxies, audio and caption cues to that timeline. Preserve rotation and pixel aspect ratio when translating a crop from preview to output.
- An agent proposes an interval, a brief reason and the evidence a person can open. A quoted line requires a span in the identified transcript revision. A visual suggestion requires observed frames at source times. Reject nonexistent revisions, out-of-range marks and unsupported quotes. Allow an empty result. The user can tighten both handles before saving.
- Run suggestions through the existing T3-backed harness and exact provider, account, model and supported settings. Show the excerpts or frames that will leave the device even when the CLI runs locally. Source metadata, filenames and transcript text enter as data. A proposal cannot approve an upload, spend, render or post. [Harness contracts](AGENT-HARNESS.md)
- Carry permissions from source to derivatives. Check the intended audience and destination again before export or publication. Bind each render to source, edit, preset and renderer revisions. Write to a temporary destination, validate the output, and promote it atomically. Cancellation or low disk space leaves the last good export intact. Retention applies to proxies, transcripts and temporary renders as well as library assets.
- Bind publishing approval to the rendered bytes, destination account and post settings. Changing a cut invalidates approval for that variant. A timeout after submission preserves the original operation for reconciliation. A project change, app restart or batch retry must never retarget or duplicate a post. [Publication and service boundaries](PLATFORM-BOUNDARIES.md)

## Delivery and acceptance

| Gate | Owner and evidence required to call it ready |
| --- | --- |
| **M0B · Category and navigation** | WP03 persists the stable `clipper` category. WP08 opens its dedicated route with an empty project. Update the runtime draft types, chooser, stage validation and restore together. Reopen an empty Clipper draft and an older Video draft in their original categories. Unknown category IDs still round-trip through the generic workspace. |
| **M1 · Recommendations** | WP11 defines the source-grounded suggestion contract on the qualified WP05/WP09/WP53/WP55 route. Test invalid intervals, stale transcripts and unsupported quotes against fixtures. Enable a real media action only once its source and evidence capabilities exist. |
| **M2 · Sources and edits** | WP17 owns rights-aware source references and WP14 owns edits. Reopen two variants, correct one caption, and verify its sibling and original keep their revisions. Removing the source from the device must lead to relink rather than substitution. |
| **M3 · Optional transcription** | WP19 qualifies the local transcript with corrected spans and provenance. The offline manual flow also works with silent footage, a human-authored caption and transcription disabled. |
| **M4A · Usable local export** | WP24 owns the Clipper integration case alongside the existing standalone Video case. With networking and AI disabled, import an authorized synthetic recording, cut it between keyframes, choose a 9:16 crop and add captions. Export and open the actual file in an external player, then reopen the editable project and change the cut. Record the exact Windows build, renderer, crop, first/last visible frames and audio/caption sync against a fixture with variable frame rate, nonzero start time and delayed audio. Interrupt a second render and recover the first output. Capture only the Studio window for PR evidence. |
| **M4C · Optional social post** | WP27 qualifies each destination and WP28 owns account-bound approval, dispatch and reconciliation. A real authorized receipt is required to advertise publication for that destination. A failed or missing connector leaves the reviewed clip available to export. |

## Evidence for the reference reel

On 19 November 2026, the supplied URL identified Instagram shortcode `Df4VktwN5Sm`. The offline video-evidence helper normalized the locator. A search of prior local research found no matching capture. Agent Reach listed an Instagram channel. The public page fetch reported throttling, so retrieval on that route stopped. An independent exact-shortcode search located no attributable recording or transcript. Author, publication date, duration, footage, speech and tools shown remain unknown. The tool decisions above come from the linked primary documentation and the Studio design review. [Supplied reel](https://www.instagram.com/reel/Df4VktwN5Sm/)
