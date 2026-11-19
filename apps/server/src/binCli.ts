import { doctorCommand } from "./cli/doctor.ts";
import { policyCommand } from "./cli/policy.ts";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Argument, Command } from "effect/cli";
import * as CliError from "effect/cli/CliError";

import * as NetService from "@t3tools/shared/Net";
import packageJson from "../package.json" with { type: "json" };
import { acpMcpBridgeCommand, acpMcpCallCommand } from "./cli/acpMcpBridge.ts";
import { authCommand } from "./cli/auth.ts";
import { environmentCommand } from "./cli/environment.ts";
import { appCommand } from "./cli/app.ts";
import { browserCommand } from "./cli/browser.ts";
import { pairCommand } from "./cli/pair.ts";
import { hasCloudPublicConfig } from "./cloud/publicConfig.ts";
import { extendConnectionAttemptTimeout, keepOutboundFetchOnHttp1 } from "./outboundHttp.ts";
import { sharedServerCommandFlags } from "./cli/config.ts";
import { projectCommand } from "./cli/project.ts";
import { threadCommand } from "./cli/thread.ts";
import { runDefaultServerCommand, serveCommand, startCommand } from "./cli/server.ts";
import { speechWorkerCommand } from "./cli/speechWorker.ts";
import { claudeHistoryCommand } from "./cli/claudeHistory.ts";
import { sshHelperCommand } from "./cli/sshHelper.ts";
import { themeCommand } from "./cli/theme.ts";
import { traceCommand } from "./cli/trace.ts";
import { triageCommand } from "./cli/triage.ts";
import { connectSubcommands } from "./cli/connect.ts";
import { legacyLifecycleCommands, studioLifecycleGuidance } from "./studioLifecycle.ts";

const layerCliRuntime = Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer);

const connectPublicConfigMissingMessage =
  "T3 Connect commands are unavailable: this build is missing T3 Connect public configuration.";

class ConnectPublicConfigMissingError extends CliError.UserError {
  override get message() {
    return connectPublicConfigMissingMessage;
  }
}

const connectUnavailableCommand = Command.make("connect", {
  command: Argument.String("command").pipe(Argument.variadic),
}).pipe(
  Command.withDescription("T3 Connect is unavailable in builds without public configuration."),
  Command.unlisted,
  Command.withHandler(() =>
    Effect.fail(
      new CliError.ShowHelp({
        commandPath: ["open-product-studio", "connect"],
        errors: [new ConnectPublicConfigMissingError({ cause: connectPublicConfigMissingMessage })],
      }),
    ),
  ),
);

const declineLegacyLifecycle = () =>
  Effect.fail(new CliError.UserError({ cause: studioLifecycleGuidance }));

const unavailableLifecycleCommands = legacyLifecycleCommands.map((name) =>
  Command.make(name, { args: Argument.String("arg").pipe(Argument.variadic) }).pipe(
    Command.unlisted,
    Command.withDescription(studioLifecycleGuidance),
    Command.withHandler(declineLegacyLifecycle),
  ),
);

const hostedConnectCommand = Command.make("connect").pipe(
  Command.withDescription("Access the configured Studio hosting account."),
  Command.withHandler(declineLegacyLifecycle),
  Command.withSubcommands(connectSubcommands),
);

export const makeCli = ({ cloudEnabled = hasCloudPublicConfig } = {}) =>
  Command.make("open-product-studio", { ...sharedServerCommandFlags }).pipe(
    Command.withDescription("Run Open Product Studio in this terminal and open it in your browser."),
    Command.withHandler(runDefaultServerCommand),
    Command.withSubcommands([
      Command.make("help").pipe(
        Command.withDescription("Show command help."),
        Command.withHandler(() =>
          Effect.fail(new CliError.ShowHelp({ commandPath: ["open-product-studio"], errors: [] })),
        ),
      ),
      acpMcpBridgeCommand,
      acpMcpCallCommand,
      startCommand,
      serveCommand,
      appCommand,
      pairCommand,
      authCommand,
      environmentCommand,
      browserCommand,
      projectCommand,
      threadCommand,
      ...unavailableLifecycleCommands,
      claudeHistoryCommand,
      speechWorkerCommand,
      sshHelperCommand,

      themeCommand,
      traceCommand,
      doctorCommand,
      policyCommand,
      triageCommand,
      cloudEnabled ? hostedConnectCommand : connectUnavailableCommand,
    ]),
  );

export const cli = makeCli();

export function runCli() {
  extendConnectionAttemptTimeout();
  keepOutboundFetchOnHttp1();
  Command.run(cli, { version: packageJson.version }).pipe(
    Effect.scoped,
    Effect.provide(layerCliRuntime),
    NodeRuntime.runMain,
  );
}
