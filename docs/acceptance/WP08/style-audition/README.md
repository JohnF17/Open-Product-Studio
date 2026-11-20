# Category entry and Video style audition

Open **Video** from Projects. The chooser illustration moves into the project header, and keyboard focus lands on the first sheet heading. Returning to Projects focuses the saved draft. Resuming it opens the saved step directly. The system's reduced-motion preference skips the artwork transition.

The four illustrated choices compare the same sample action with one caption. A saved storyboard caption takes precedence over the project brief and the built-in example. Preview runs locally for four seconds on request. Reduced motion shows a still. Apply updates the style and compatible tools together. Discard, or leaving before Apply, preserves the saved plan.

[Desktop style sheet](desktop-motion-style.png) · [Phone-width preview](narrow-motion-preview.png) · [Desktop keyboard walkthrough](desktop-motion.webm) · [Capture hashes and dimensions](manifest.json)

## Acceptance

An isolated Windows Chromium renderer exercised the production Studio components with an in-memory fixture origin, a synthetic draft and external network access disabled. At 1240 × 940 in standard light appearance and 390 × 844 in standard dark appearance, keyboard input opened the project, auditioned a treatment, discarded it, applied a second choice, inspected its tool plan and reopened the saved project. Both widths also ran with reduced motion. The harness checked source and destination artwork bounds, heading and project focus, saved draft revisions, and that auditioning alone left the draft intact. Every retained still and recording was decoded and hashed. Captures show only the page viewport.

The local renderer suite covers a short viewport, live reduced-motion changes during playback, focus recovery, and persisted tool preferences. The recorded journey covers the renderer in Chromium. Packaged Electron behavior, media rendering and publishing have separate acceptance gates.
