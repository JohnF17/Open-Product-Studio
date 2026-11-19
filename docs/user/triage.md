# Triage an issue

Triage lets your own coding agent investigate an Open Product Studio problem. The agent
reads local Studio logs and checks the source for the affected build. It can
find related Studio issues or help you prepare a report. It asks
before it applies a fix or posts anything.

## In the app

Open the command palette and choose **Triage an issue**. A new thread with no
project opens, with the triage playbook linked in the message. Choose any
provider, describe what went wrong after the link, and send. Open Product Studio gets the
source from the Studio repository while you write. For development builds, match
its commit to the source receipt included with your installer.

Triage runs on the machine of the thread or draft that you have open. With
nothing open, it uses your primary machine if that supports triage, or else the
first connected machine that does. The new thread shows the machine name, and on
mobile the palette row shows it before you start. If you change the machine
before you send, triage moves to that machine. The agent runs inside that Studio
server, so it gives you any restart steps and does not do them itself.

## In a terminal

Open a terminal on the machine that runs Studio. If you installed the Studio
launcher on PATH, run the following command. The desktop startup error screen
also shows its quoted launcher path when available.

```sh
open-product-studio triage
```

It starts Claude Code, Codex, or Antigravity in your terminal with the same
instructions. If more than one is installed, it asks which to use. You can also
choose explicitly:

```sh
open-product-studio triage --agent antigravity
open-product-studio triage --agent codex
```

Antigravity needs Google's standalone `agy` CLI on your `PATH` and its own sign-in.
The ACP runtime installed through Open Product Studio does not include this terminal CLI.
Install it using [Google's CLI setup guide](https://antigravity.google/docs/cli-getting-started).
Pass `--model <model-id>` to choose a model, or leave it out to use the CLI's default.
