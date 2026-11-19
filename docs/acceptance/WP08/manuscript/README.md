# Review a manuscript, export a reader copy and restore a private draft

[Studio review](review.png), [downloaded reader page](reader.png) and [continuous window recording](delivery-window.webm).

On Windows, the isolated Chromium renderer opened a synthetic Digital product project and approved a manuscript with a distinct public title. The downloaded HTML matched the sandboxed preview byte for byte. The text and HTML excluded the private project name. Chromium opened the file from disk and printed it to an A4 PDF. An independent PDF read recovered the public title and expected closing text on one page. Importing the private backup created a new editable project with approval cleared. The original still opened with its reviewed manuscript.

Source revision `0ad6d49f69965ee488687068febbe62c31bf95b5`. Node v24.14.0, Playwright 1.64.1, HeadlessChrome/156.0.8078.4. The capture used a synthetic offline browser profile. It observed zero uncaught errors or unexpected network requests. The recording is the Studio window content at 1240 by 940, with 166 decoded frames over 6.64 seconds and no audio. Recording SHA-256 `1a0af0974ec0d0d8f39185486493b71543f652623982d1ecd807b97130c60a29`. Interactive operating-system print dialogs and signed distribution have separate acceptance gates.
