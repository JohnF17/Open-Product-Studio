# Resumable project walkthrough

[Desktop](desktop-tour.png) and [phone viewport](phone-tour.png) show the current tip beside the highlighted sheet selector. The [window-only recording](tour-window.webm) covers pause, reload, project reopen, resume and finish on a synthetic Digital product project.

The isolated Windows Chromium renderer used Studio source from `aea3c5a4d6`, Node v24.14.0, Playwright 1.64.1 and HeadlessChrome/156.0.8078.4. Each viewport kept the same project on Format. The browser was offline with local test assets, and recorded zero unexpected requests and zero uncaught errors. Desktop used 1240 by 940 pixels and phone used 390 by 844. This capture exercises the renderer. Installed-process restart has a separate Windows qualification.

The continuous VP9 video contains 181 decoded frames over 7.24 seconds at 25 fps and has no audio track. SHA-256 is `5867cafe75701d13d2472d35e6fcd15c5d9a6626acd8dd61a80f5b61a5ab922f`. The component browser test additionally checks keyboard focus, Escape, the blank-project variant, unchanged draft data and zero agent handoffs.
