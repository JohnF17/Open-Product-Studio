# Windows source baseline

The first downstream commit joins the T3 Code application and the original Studio plan. WP01 is in progress. Use the [machine-readable manifest](upstream/manifest.json) for the exact source, toolchain and lockfile, and the [WP01 evidence record](acceptance/WP01.md) for the status of individual checks.

## Reproduce the source check

Run these read-only commands at the project root. The first command prints the two parent revisions in upstream and planning order. The second exits successfully when the checkout contains the pinned upstream ancestry. The third reports the full delta against an already-fetched candidate.

```powershell
git log -1 --format=%P 8d14fde6896b3636915e38849416e1fedbec4b6c
git merge-base --is-ancestor 7d71f852a8edd298ffde67c295760c286a71a27c HEAD
python -B scripts/upstream_intake.py 7d71f852a8edd298ffde67c295760c286a71a27c
```

To inspect a newer official revision, fetch it explicitly from the configured upstream, then run `python -B scripts/upstream_intake.py upstream/main --json`. The report uses local Git objects and shows additions, modifications and removals. It groups a rename as a removal and an addition. Maintain adoption and backport decisions in the [patch ledger](PATCHES.md).

## Windows build environment

The inherited workspace specifies Node 26.12.1 and pnpm 12.14.0. Build against the frozen root lockfile in a separate checkout. Use a disposable Windows user or VM with synthetic home, AppData, CLI state and engine state. Upstream development helpers can seed from an existing T3 installation, link environment files or migrate Chromium state. An existing everyday T3 profile is unsuitable for this baseline.

The desktop build entry point is `pnpm run build:desktop`. The x64 installer entry point is `pnpm run dist:desktop:win:x64`. The normal Windows packager preflight checks for Visual C++ x64 Spectre-mitigated libraries. The upstream release pipeline also supports `T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR=true` with a genuine prebuilt resource monitor at the expected architecture-specific path. The baseline built that input from the pin. Each remaining native dependency, packaged graph and installed-app smoke test still needs its own evidence.

WP02 will isolate the app identity, vault, data directories, update feed and telemetry. The first downloadable Studio build requires a synthetic Windows install, account-free launch, restart and uninstall. See the [desktop contract](WORK-PACKAGES.md).
