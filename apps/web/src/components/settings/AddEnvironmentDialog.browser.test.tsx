import { AsyncResult } from "effect/reactivity";
import type { AtomCommandResult } from "@t3tools/client-runtime/state/runtime";
import { useState } from "react";
import { page, userEvent } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { render, stubGlobal } from "../../../test/render";
import { AppAtomRegistryProvider } from "../../rpc/atomRegistry";

const mocks = vi.hoisted(() => ({
  connectPairing: vi.fn<() => Promise<AtomCommandResult<void, Error>>>(async () =>
    AsyncResult.success(undefined),
  ),
}));

vi.mock(import("../../state/use-atom-command"), async (original) => ({
  ...(await original()),
  useAtomCommand: ((command: unknown) => command) as never,
}));
vi.mock(import("~/connection/onboarding"), async (original) => ({
  ...(await original()),
  connectPairing: mocks.connectPairing as never,
}));
vi.mock(import("~/state/environments"), async (original) => ({
  ...(await original()),
  useRelayEnvironmentDiscovery: (() => ({ environments: new Map() })) as never,
}));
import { AddEnvironmentDialog } from "./AddEnvironmentDialog";

function Owner() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AppAtomRegistryProvider>
      <AddEnvironmentDialog
        open={open}
        routeTarget={null}
        error={error}
        onOpenChange={setOpen}
        onErrorChange={setError}
      />
    </AppAtomRegistryProvider>
  );
}

describe("AddEnvironmentDialog", () => {
  it("pairs with an existing Studio server without offering managed SSH setup", async () => {
    using _bridge = stubGlobal("desktopBridge", {});
    await using _screen = await render(<Owner />);

    await userEvent.click(page.getByRole("button", { name: "Add environment" }));
    await expect.element(page.getByText(/Managed SSH setup is unavailable/)).toBeInTheDocument();
    await expect
      .element(page.getByPlaceholder("Search hosts or type devbox"))
      .not.toBeInTheDocument();
    await userEvent.fill(page.getByPlaceholder("backend.example.com"), "studio.example.com");
    await userEvent.fill(page.getByPlaceholder("PAIRCODE"), "PAIRCODE");
    await userEvent.click(
      page.getByRole("dialog").getByRole("button", { name: "Add environment" }),
    );
    expect(mocks.connectPairing).toHaveBeenCalledOnce();
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(page.getByRole("button", { name: "Add environment" }));
    await expect.element(page.getByPlaceholder("backend.example.com")).toHaveValue("");
    await expect.element(page.getByPlaceholder("PAIRCODE")).toHaveValue("");
  });
});
