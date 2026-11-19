# Windows source baseline

The Studio foundation now includes official T3 Code main at `bb234221cefe1dfdc64d754ee14d0456c5d09ec6`, sampled on November 19, 2026. The merge keeps the original Studio history and both license scopes. The [active manifest](upstream/manifest.json) records the integration commit, Node and pnpm versions, lockfile digest and target.

## Reproduce the current pin

```powershell
git log -1 --format=%P 186646ba1cb99e01a8ce8b3fe4e073e11145d86e
git merge-base --is-ancestor bb234221cefe1dfdc64d754ee14d0456c5d09ec6 HEAD
python -B scripts/upstream_intake.py bb234221cefe1dfdc64d754ee14d0456c5d09ec6
```

The merge parents are the previous Studio tip and the official upstream commit, in that order. An inventory of the active pin against itself reports zero changes. To inspect a newer official revision, fetch it explicitly from the configured upstream and run `python -B scripts/upstream_intake.py upstream/main --json`. The report uses local Git objects and treats renames as removals and additions. Record adoption and backport decisions in the [patch ledger](PATCHES.md).

## November 19 intake

The import reconciles 2,006 upstream commits and 4,154 changed paths since the first baseline. The 27 upstream workflow blobs are archived under `.upstream/workflows`. At the merge commit, Studio's documentation and read-only upstream intake workflows are the two active workflows. Desktop startup still uses Studio-specific Electron profile paths, skips legacy profile migration and leaves CLI installation to an explicit action.

Build the candidate with Node 26.13.1 and pnpm 12.14.0 against the new frozen lockfile. At this merge, the development runner defaults to seeding a new worktree database from a small existing T3 database, and the worktree setup helper links environment files from the main checkout. Use a disposable OS profile with synthetic home and environment during qualification. The upstream server state root, OS identity, updater, credential namespaces and cloud defaults still require independent Studio isolation before distribution. The earlier Windows dependency installation, source smoke test, installer-build results and native artifact hashes below describe the original pin. The current Windows installer and release gates require fresh evidence.

## Studio development startup

The Studio runner supplies a dedicated engine directory to the desktop and its child server. A linked worktree uses its own `.t3/studio`. In a regular checkout the default is `~/.open-product-studio/dev`. Set `OPEN_PRODUCT_STUDIO_DEV_HOME` in a regular checkout, or pass `--home-dir` to choose a directory explicitly. Worktree setup leaves other checkouts' environment files alone. Database seeding requires an explicit `--seed` and takes its source from the Studio development directory.

The focused Windows bootstrap suite ran under a synthetic profile with the current lockfile and Node 26.13.1. At `3c5d16edb7`, 46 bootstrap and public-configuration tests passed, and one Unix file-symlink case was skipped. Separate suites passed five home-selection tests, 33 pairing tests, eight updater-link tests and both selected worktree cleanup scenarios. Cleanup reported a native Windows path for the removed or retained worktree. The migration suite passed all 12 cases at `481c9a6c0c`; a repeat at `3c5d16edb7` recorded 11 passes and a 120-second timeout. The hosted runtime workflow repeats the migration and cleanup checks on disposable runners.

## Initial Windows qualification

The [initial manifest](upstream/baseline-7d71f852.json) and [WP01 record](acceptance/WP01.md) preserve the original build evidence. The initial baseline specified Node 26.12.1 and pnpm 12.14.0. Build against the frozen root lockfile in a separate checkout. Use a disposable Windows user or VM with synthetic home, AppData, CLI state and engine state. Upstream development helpers can seed from an existing T3 installation, link environment files or migrate Chromium state. An existing everyday T3 profile is unsuitable for this baseline.

The desktop build entry point is `pnpm run build:desktop`. The x64 installer entry point is `pnpm run dist:desktop:win:x64`. The normal Windows packager preflight checks for Visual C++ x64 Spectre-mitigated libraries. The upstream release pipeline also supports `T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR=true` with a genuine prebuilt resource monitor at the expected architecture-specific path. The baseline built that input from the pin. Each remaining native dependency, packaged graph and installed-app smoke test still needs its own evidence.

WP02 has source and fixture evidence for app identity, engine and renderer paths, update settings, CLI boundaries and telemetry. The first local packaged probe at `3dd629697edf` reached the chooser and exited during shutdown before its second launch. A fresh hosted machine later installed the branded build at `c16b4f42f8`, reopened its saved project after restart and verified a clean uninstall. The workflow qualifies each affected PR revision separately. Signing and populated upgrade/restore remain release gates. [WP02 receipt](acceptance/WP02.md), [hosted Windows qualification](https://github.com/JohnF17/Open-Product-Studio/actions/runs/44519224673).
