// @effect-diagnostics nodeBuiltinImport:off - Build bootstrap reads optional root env files before an Effect runtime exists.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeUtil from "node:util";

export interface T3CodePublicConfig {
  readonly clerkPublishableKey: string | undefined;
  readonly clerkJwtTemplate: string | undefined;
  readonly clerkCliOAuthClientId: string | undefined;
  readonly relayUrl: string | undefined;
  readonly mobileOtlpTracesUrl: string | undefined;
  readonly mobileOtlpTracesDataset: string | undefined;
  readonly mobileOtlpTracesToken: string | undefined;
  readonly relayClientOtlpTracesUrl: string | undefined;
  readonly relayClientOtlpTracesDataset: string | undefined;
  readonly relayClientOtlpTracesToken: string | undefined;
}

type Environment = Readonly<Record<string, string | undefined>>;

const REPO_ROOT = NodePath.resolve(NodeURL.fileURLToPath(import.meta.url), "../../..");

export function loadRepoEnv({
  baseEnv = process.env,
  repoRoot = REPO_ROOT,
}: {
  readonly baseEnv?: Environment;
  readonly repoRoot?: string;
} = {}): Record<string, string | undefined> {
  const rootEnv = readEnvFile(NodePath.join(repoRoot, ".env"));
  const localEnv = readEnvFile(NodePath.join(repoRoot, ".env.local"));
  const sources = [baseEnv, localEnv, rootEnv];
  const result: Record<string, string | undefined> = { ...rootEnv, ...localEnv, ...baseEnv };
  for (const [flag, groups] of Object.entries(publicConfigGroups)) {
    // Only an explicit Studio launch/build option enables inherited provider aliases.
    const enabled = baseEnv[flag] === "1";
    if (!enabled && flag in result) result[flag] = "0";
    for (const names of groups) {
      const selected = enabled ? firstNonEmpty(sources, ...names) : undefined;
      for (const name of names) {
        if (selected !== undefined) result[name] = selected;
        // Some launchers merge into process.env. Erase a supplied alias there as well.
        else if (!enabled && name in result) result[name] = "";
      }
    }
  }
  return result;
}

const publicConfigGroups = {
  STUDIO_ENABLE_HOSTED_CONNECTIONS: [
    ["T3CODE_CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    ["T3CODE_CLERK_JWT_TEMPLATE", "VITE_CLERK_JWT_TEMPLATE", "EXPO_PUBLIC_CLERK_JWT_TEMPLATE"],
    ["T3CODE_CLERK_CLI_OAUTH_CLIENT_ID", "VITE_CLERK_CLI_OAUTH_CLIENT_ID"],
    ["T3CODE_RELAY_URL", "VITE_T3CODE_RELAY_URL"],
  ],
  STUDIO_USE_OTLP_ENV: [
    ["T3CODE_MOBILE_OTLP_TRACES_URL", "EXPO_PUBLIC_OTLP_TRACES_URL"],
    ["T3CODE_MOBILE_OTLP_TRACES_DATASET", "EXPO_PUBLIC_OTLP_TRACES_DATASET"],
    ["T3CODE_MOBILE_OTLP_TRACES_TOKEN", "EXPO_PUBLIC_OTLP_TRACES_TOKEN"],
    ["T3CODE_RELAY_CLIENT_OTLP_TRACES_URL", "VITE_RELAY_OTLP_TRACES_URL"],
    ["T3CODE_RELAY_CLIENT_OTLP_TRACES_DATASET", "VITE_RELAY_OTLP_TRACES_DATASET"],
    ["T3CODE_RELAY_CLIENT_OTLP_TRACES_TOKEN", "VITE_RELAY_OTLP_TRACES_TOKEN"],
  ],
} as const;

function firstNonEmpty(sources: readonly Environment[], ...names: readonly string[]) {
  for (const source of sources) {
    for (const name of names) {
      const value = source[name]?.trim();
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}

function readEnvFile(path: string): Record<string, string | undefined> {
  const file = NodeFS.lstatSync(path, { throwIfNoEntry: false });
  return file?.isFile() ? NodeUtil.parseEnv(NodeFS.readFileSync(path, "utf8")) : {};
}
