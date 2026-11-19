// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it.skipIf(process.platform === "win32")("ignores a linked environment file from a different checkout", () => {
    const repoRoot = makeTemporaryDirectory();
    const external = NodePath.join(makeTemporaryDirectory(), ".env");
    NodeFS.writeFileSync(external, "STUDIO_TEST_SENTINEL=other-checkout\n");
    NodeFS.symlinkSync(external, NodePath.join(repoRoot, ".env"));
    expect(loadRepoEnv({ baseEnv: {}, repoRoot })).not.toHaveProperty("STUDIO_TEST_SENTINEL");
  });

  it("reads only regular configuration files", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.mkdirSync(NodePath.join(repoRoot, ".env.local"));
    expect(loadRepoEnv({ baseEnv: {}, repoRoot })).toEqual({});
  });

  it("keeps hosted and diagnostic destinations disabled in a local build", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(NodePath.join(repoRoot, ".env"), "STUDIO_ENABLE_HOSTED_CONNECTIONS=1\nVITE_CLERK_JWT_TEMPLATE=test-template\n");
    const baseEnv = {
      T3CODE_CLERK_PUBLISHABLE_KEY: "pk_fixture",
      T3CODE_RELAY_URL: "https://relay.example.test",
      VITE_RELAY_OTLP_TRACES_URL: "https://traces.example.test",
    };
    const local = loadRepoEnv({ baseEnv, repoRoot });
    expect(local).toMatchObject({
      T3CODE_CLERK_PUBLISHABLE_KEY: "", VITE_CLERK_JWT_TEMPLATE: "", T3CODE_RELAY_URL: "",
      STUDIO_ENABLE_HOSTED_CONNECTIONS: "0", VITE_RELAY_OTLP_TRACES_URL: "",
    });
    const hosted = loadRepoEnv({ baseEnv: { ...baseEnv, STUDIO_ENABLE_HOSTED_CONNECTIONS: "1" }, repoRoot });
    expect(hosted.VITE_T3CODE_RELAY_URL).toBe(baseEnv.T3CODE_RELAY_URL);
    expect(hosted.VITE_RELAY_OTLP_TRACES_URL).toBe("");
    const diagnostics = loadRepoEnv({ baseEnv: { ...baseEnv, STUDIO_USE_OTLP_ENV: "1" }, repoRoot });
    expect(diagnostics.T3CODE_RELAY_CLIENT_OTLP_TRACES_URL).toBe(baseEnv.VITE_RELAY_OTLP_TRACES_URL);
    expect(diagnostics.T3CODE_RELAY_URL).toBe("");
  });

  it("applies process, root local, and root precedence in that order after opt-in", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env"),
      "T3CODE_CLERK_PUBLISHABLE_KEY=pk_root\nT3CODE_CLERK_JWT_TEMPLATE=template_root\nT3CODE_CLERK_CLI_OAUTH_CLIENT_ID=oauth_root\nT3CODE_RELAY_URL=https://root.example.test\n",
    );
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env.local"),
      "T3CODE_CLERK_PUBLISHABLE_KEY=pk_local\nT3CODE_CLERK_JWT_TEMPLATE=template_local\nT3CODE_CLERK_CLI_OAUTH_CLIENT_ID=oauth_local\nT3CODE_RELAY_URL=https://local.example.test\n",
    );

    expect(loadRepoEnv({ baseEnv: { STUDIO_ENABLE_HOSTED_CONNECTIONS: "1" }, repoRoot }).T3CODE_RELAY_URL).toBe(
      "https://local.example.test",
    );
    expect(
      loadRepoEnv({
        baseEnv: {
          STUDIO_ENABLE_HOSTED_CONNECTIONS: "1",
          T3CODE_CLERK_PUBLISHABLE_KEY: "pk_ci",
          T3CODE_CLERK_JWT_TEMPLATE: "template_ci",
          T3CODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_ci",
          T3CODE_RELAY_URL: "https://ci.example.test",
        },
        repoRoot,
      }),
    ).toMatchObject({
      T3CODE_CLERK_PUBLISHABLE_KEY: "pk_ci",
      T3CODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_ci",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_ci",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_ci",
      T3CODE_CLERK_JWT_TEMPLATE: "template_ci",
      VITE_CLERK_JWT_TEMPLATE: "template_ci",
      EXPO_PUBLIC_CLERK_JWT_TEMPLATE: "template_ci",
      T3CODE_RELAY_URL: "https://ci.example.test",
      VITE_T3CODE_RELAY_URL: "https://ci.example.test",
    });
  });
});

function makeTemporaryDirectory() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3code-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}
