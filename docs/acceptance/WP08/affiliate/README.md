# WP08 Affiliate storefront

[Desktop recording](builder-window.webm) · [Private comparison](compare-desktop.png) · [Desktop review](review-desktop.png) · [Phone review](review-phone.png)

Customer view from the downloaded HTML file on [desktop](storefront-desktop.png) and at a [phone viewport](storefront-phone.png).

The synthetic Weekend field kit project compares three candidates and pins two. The public catalog shows each selected product with independently authored copy and a disclosure before its outbound link. The iframe HTML excludes the project name, candidate labels, private source URLs, buyer-fit notes, evidence notes and dates, and the unpinned candidate. The HTTPS validation rejected an HTTP destination. The browser inspected the reserved example-domain link destinations and attributes without activating them.

After approval and a page reload, reopening the draft restored Export and downloaded `Weekend field kit.html`. The 3,998-byte file matched the approved iframe HTML byte for byte at both viewport sizes. The private candidate and its evidence were still editable in the draft. Changing the public title invalidated approval and disabled another download. Opening the file from disk showed two cards side by side at 1240 × 940 and stacked at 390 × 844 with touch and mobile emulation. Both customer views fit without horizontal scrolling.

## Capture and verification

On November 19, 2026, `node E:/T3Code/data/scratch/wp08-affiliate-smoke/capture.cjs` ran on Windows x64 with Node v24.14.0, Playwright 1.64.1 and HeadlessChrome/156.0.8078.4. The existing isolated WP08 harness pattern bundled a frozen snapshot of `StudioWorkspace` with the compiled T3 stylesheet and pinned appearance functions. Chromium used fresh profiles, offline mode, blocked service workers and in-memory assets at a synthetic origin. The preview used an empty sandbox and a no-referrer policy. Neither preview frame initiated an HTTP(S) request. The harness blocked 7 known main-frame environment discovery requests and recorded zero unexpected requests and zero uncaught page errors.

The recording contains a continuous desktop Chromium content-window capture with no cuts and no audio track. FFmpeg 7.1 remuxed the video stream and decoded all 274 frames of the 10.96-second clip at 1240 × 940 and 25 fps. The screenshots are original Chromium viewport captures. The [manifest](capture-manifest.json) records the commands, capture hashes and measured results. The frozen Studio source SHA-256 is `00c1fc3855d2dfc9d0050a7baf9c16e399a56a5ad9f561e571e7d2e6d82a4976`. To reproduce it, normalize the source files to LF, sort the paths in ordinal order and hash the UTF-8 records formed by each lowercase file digest, two spaces, the path and LF.

The phone-viewport run also downloaded the Shopify section and JSON handoff. The section matched the reviewed public markup and the locally checked helper output. The helper emitted a section preset and kept authored template delimiters inert. Both downloads excluded the private research data. The capture covers the isolated renderer and static HTML delivery. Native Electron, physical phones, affiliate program enrollment, merchant landing pages and Shopify theme installation or rendering fall outside the verification scope.
