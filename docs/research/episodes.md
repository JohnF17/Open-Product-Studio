# Challenge recordings: recovered coverage and design implications

Research date: 12 November 2026. Raw transcripts, audio and video remain outside this repository. This document contains original analysis and source locators. No paid application was operated.

## Recovery result

Complete available public mirror transcript bodies were recovered for the four released main-session replays: **1,692 timestamped rows and 65,157 words**. The parent independently checked all 54 recorded artifact sizes/hashes, canonical video IDs, row/word counts, ordering and joined-text hashes against the mirror's export data. These checks establish faithful retrieval from that source, not speech-level accuracy or completeness of the original live event.

| Episode / date | Canonical replay | Mirror body | Native text and coverage limits |
| --- | --- | --- | --- |
| 1 / Nov 7 | [WJ7FVoLgPN0](https://www.youtube.com/watch?v=WJ7FVoLgPN0) | 395 rows; 15,389 words; final row 82:53 | Mirror only; replay ends before after-hours |
| 2 / Nov 8 | [jDgMGSAP0PQ](https://www.youtube.com/watch?v=jDgMGSAP0PQ) | 454 rows; 17,546 words; final row 97:04 | Mirror omits most native-language testimonial speech near 15:58-18:28; alternate video ID is not substituted |
| 3 / Nov 9 | [wfSFaxHuU7Q](https://www.youtube.com/watch?v=wfSFaxHuU7Q) | 435 rows; 17,086 words; final row 90:03 | Earlier Agent Reach English auto-caption-derived text also preserved; its wrapper has no timestamps |
| 4 / Nov 10 | [6TZs6Ctq8LE](https://www.youtube.com/watch?v=6TZs6Ctq8LE) | 408 rows; 15,136 words; final row 93:36 | Sparse/missing demo text around 67 minutes, unreliable speaker labels and compressed refund speech |
| 5 / Nov 15 | [SFZYaN7TEX8](https://www.youtube.com/watch?v=SFZYaN7TEX8) | No episode transcript | Upcoming Nov 15 at 18:00 UTC on the research date; trailer excluded |

Public mirror sources: [Episode 1](https://sozai.app/transcript/start-side-hustle-together-live/), [Episode 2](https://sozai.app/transcript/ai-side-hustle-makes-11290-month-live/), [Episode 3](https://sozai.app/transcript/build-373-day-side-hustle-live/), [Episode 4](https://sozai.app/transcript/easiest-way-make-money-online-beginners-live/). Generated chapter offsets were rejected as exact navigation evidence; some extend beyond their recordings. Export intervals are coarse/overlapping and rounded endpoints differ from official durations by one or two seconds.

The prior caption 429 was respected; no account/proxy/backend rotation or new native-caption attempt followed. Rendered mirror rows and their public export data supplied a distinct already-published source. Episode 3 mirror/native similarity may reflect common caption ancestry; they are not independent accuracy confirmations.

## What changes the product design

**Episode 1:** the develop/distribute/deliver framework around 59:36-62:02 supports one project graph spanning product creation and customer delivery. It does not establish that buyer research, expertise or commercial risk disappear. Near 22:57 the 888 restriction concerns an implementation workshop; it is not independent evidence of scarcity or a cap on all software buyers. [Replay](https://www.youtube.com/watch?v=WJ7FVoLgPN0&t=3596s).

**Episode 2:** around 36:54-40:39 the recorded authoring flow supplies the clearest product requirements: idea-free start, ranked alternatives, ebook selection, editable before/after map, charter/outline, section states, branding and exports. Earlier inspected frames corroborate controls and a rendered PDF. At 39:24-39:38 the narration expressly mentions editing out a generation wait; replay duration cannot be our speed benchmark. The spoken five-format claim does not reveal the three hidden format names. [Demo](https://www.youtube.com/watch?v=jDgMGSAP0PQ&t=2214s), [frame observations](demo-observations.md).

**Episode 3:** 29:11-33:11 gives creator-selection heuristics; those become editable criteria with evidence, not proven conversion rules. Around 37:16 an inserted ListKit sequence starts with creators already loaded, so it does not prove the sourcing step or successful delivery. Around 44:13-48:45 a recorded creator-conditioned authoring flow narrates social profile inputs, audience/themes/voice, opportunity, outline and branding. WP19 must preserve permitted source/profile fields and confidence rather than invent inaccessible data. WP20-22 link rights, proposal and campaign versions. Payment/delivery/revenue-split infrastructure remains external, as WP27-30/47 already specify. [Creator demonstration](https://www.youtube.com/watch?v=wfSFaxHuU7Q&t=2653s).

**Episode 4:** a complementary launch-copy tool is introduced around 65:24 and a demonstration around 66:27-68:53. Speech retrieval supplies little detail in its central interval. It does not expose the full agent catalog, prompts or a tested current generation lifecycle. Original workflow categories and acceptance cases remain the basis for WP21-22; matching a private agent count is not a quality criterion. [Demonstration locator](https://www.youtube.com/watch?v=6TZs6Ctq8LE&t=3987s).

Across the recordings, numerical revenue illustrations, training/source counts, prepaid/unlimited wording, testimonials and presented payments remain promotional assertions. A transcript establishes that words were said; it does not audit the underlying facts. Exact purchase/refund rights require the operative written terms and recording, not a machine transcript.

## Audio and remaining gaps

Two short non-silent audio captures were locally decoded and checked. An isolated pinned `faster-whisper==1.2.1` environment and pinned SYSTRAN multilingual-small model ran offline CPU recognition/translation. Episode 2 produced incomplete, unreliable Arabic/English drafts with roughly 30-second omissions; they are not a dependable testimonial reconstruction. Episode 4 recovered surrounding narration, with unreliable timing over a long central non-speech interval; it adds no dependable detailed spoken software walkthrough. These three supplements are not full-episode ASR and were not merged into mirror/native text.

No full after-hours session was recovered. The presentations explicitly describe those segments as cut from replays. Longer official broadcast windows do not measure exact after-hours duration because waiting and editing also contribute. Searches and the public event portal yielded no attributable accessible full archive. That is a bounded retrieval result, not proof that no organizer or authorized attendee has a copy.

Episode 5 had not happened on the research date. No future transcript, trailer substitute, private VIP content, registration-gated archive, new paid transcription or cloud inference is claimed. The completed [current-demo follow-up](current-demos.md) adds creator analysis/configuration/approval requirements and classifies Episode 4's UI insert as a marketing montage. Its fourteen frames remain recorded/promotional evidence, not researcher-operated application tests.
