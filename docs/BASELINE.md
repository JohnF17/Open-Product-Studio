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

Build the candidate with Node 26.13.1 and pnpm 12.14.0 against the new frozen lockfile. At this merge, the development runner defaults to seeding a new worktree database from a small existing T3 database, and the worktree setup helper links environment files from the main checkout. Use a disposable OS profile with synthetic home and environment during qualification. The upstream server state root, OS identity, updater, credential namespaces and cloud defaults still require independent Studio isolation before distribution. The older Windows install, smoke tests and native artifact hashes below describe the earlier pin. The current Windows installer and release gates require fresh evidence.

## Initial Windows qualification

The [initial manifest](upstream/baseline-7d71f852.json) and [WP01 record](acceptance/WP01.md) preserve the original build evidence. The initial baseline specified Node 26.12.1 and pnpm 12.14.0. Build against the frozen root lockfile in a separate checkout. Use a disposable Windows user or VM with synthetic home, AppData, CLI state and engine state. Upstream development helpers can seed from an existing T3 installation, link environment files or migrate Chromium state. An existing everyday T3 profile is unsuitable for this baseline.

The desktop build entry point is `pnpm run build:desktop`. The x64 installer entry point is `pnpm run dist:desktop:win:x64`. The normal Windows packager preflight checks for Visual C++ x64 Spectre-mitigated libraries. The upstream release pipeline also supports `T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR=true` with a genuine prebuilt resource monitor at the expected architecture-specific path. The baseline built that input from the pin. Each remaining native dependency, packaged graph and installed-app smoke test still needs its own evidence.

WP02 will isolate the app identity, vault, data directories, update feed and telemetry. The first downloadable Studio build requires a synthetic Windows install, account-free launch, restart and uninstall. See the [desktop contract](WORK-PACKAGES.md).
