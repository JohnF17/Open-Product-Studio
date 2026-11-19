import { wcagContrast } from "culori/fn";
import { expect, it, vi } from "vite-plus/test";
import { commands } from "vite-plus/test/browser";

import "~/index.css";
import { act, render } from "../../../test/render";
import { ThemeLibrary } from "../../components/settings/ThemeSettings";
import { setAppearanceMode, setTheme, useTheme } from "../../hooks/useTheme";
import { randomUUID } from "../../lib/randomUUID";
import { installCustomTheme, parseThemeFile, removeCustomTheme } from "../../themePalette";
import StudioWorkspace from "./StudioWorkspace";

vi.mock("../../hooks/useEnvironmentTheme", () => ({
  useEnvironmentThemeDefinitions: () => [],
}));

function AppearanceMode() {
  const { resolvedTheme, ...theme } = useTheme();
  return (
    <ThemeLibrary
      {...theme}
      customThemes={[]}
      initialAppearance={resolvedTheme}
      isImportOpen={false}
      onImportOpenChange={() => {}}
    />
  );
}

function tokenColor(variable: string, parent: Element) {
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  parent.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

it("repaints Studio from T3's appearance selector and preserves authored caption colors", async () => {
  const customTheme = installCustomTheme(
    parseThemeFile({
      version: 1,
      name: `Studio contrast ${randomUUID().slice(0, 8)}`,
      appearance: "dark",
      canvas: "#111827",
      accent: "#22d3ee",
      colors: { focus: "#facc15" },
    }),
  );
  using _theme = {
    [Symbol.dispose]() {
      setTheme("system");
      setAppearanceMode("system");
      removeCustomTheme(customTheme.id);
    },
  };
  expect(setTheme("system")).toBe(true);
  expect(setAppearanceMode("light")).toBe(true);
  await using screen = await render(
    <>
      <StudioWorkspace workspaceId={randomUUID()} />
      <AppearanceMode />
    </>,
  );

  const clipper = screen.getByRole("button", { name: /^Clipper/ });
  await expect.element(clipper).toBeVisible();
  const chooser = screen.container.querySelector(".ops-workspace")!;
  const lightCanvas = getComputedStyle(chooser).backgroundColor;
  expect(chooser.querySelectorAll(".ops-choice")).toHaveLength(6);
  expect(getComputedStyle(chooser).colorScheme).toBe("light");
  await clipper.click();
  await screen.getByRole("button", { name: "Next", exact: true }).click();
  await screen.getByRole("button", { name: "Next", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Describe the cut" })).toBeVisible();
  await commands.resetPointer();

  const workspace = screen.container.querySelector(".ops-workspace")!;
  const sheet = workspace.querySelector(".ops-sheet")!;
  const primary = workspace.querySelector(".ops-primary")!;
  const caption = workspace.querySelector("figcaption")!;
  const frame = caption.parentElement!;
  const authoredColors = [getComputedStyle(frame).backgroundImage, getComputedStyle(caption).color];
  const selectedLook = workspace.querySelector('.ops-look-presets [aria-pressed="true"]')!;

  const expectThemeColors = () => {
    expect(getComputedStyle(workspace).backgroundColor).toBe(tokenColor("--background", workspace));
    expect(getComputedStyle(sheet).backgroundColor).toBe(tokenColor("--card", sheet));
    expect(getComputedStyle(sheet).color).toBe(tokenColor("--contrast-card-foreground", sheet));
    const action = getComputedStyle(primary);
    expect(action.backgroundColor).toBe(tokenColor("--primary", sheet));
    expect(action.color).toBe(tokenColor("--primary-foreground", sheet));
    expect(getComputedStyle(selectedLook).borderTopColor).toBe(tokenColor("--ring", sheet));
    expect(wcagContrast(action.color, action.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(
      wcagContrast(getComputedStyle(sheet).color, getComputedStyle(sheet).backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect([getComputedStyle(frame).backgroundImage, getComputedStyle(caption).color]).toEqual(
      authoredColors,
    );
  };

  expectThemeColors();
  const lightAction = getComputedStyle(primary).backgroundColor;
  const dark = screen.getByRole("button", { name: "Use dark mode" });
  await dark.click();
  await expect.element(dark).toHaveAttribute("aria-pressed", "true");
  expect(getComputedStyle(workspace).colorScheme).toBe("dark");
  expect(getComputedStyle(workspace).backgroundColor).not.toBe(lightCanvas);
  expect(getComputedStyle(primary).backgroundColor).not.toBe(lightAction);
  expectThemeColors();

  const darkAction = getComputedStyle(primary).backgroundColor;
  expect(await act(() => setTheme(customTheme.id))).toBe(true);
  expect(getComputedStyle(primary).backgroundColor).not.toBe(darkAction);
  expectThemeColors();

  expect(await act(() => setTheme("system"))).toBe(true);
  const light = screen.getByRole("button", { name: "Use light mode" });
  await light.click();
  await expect.element(light).toHaveAttribute("aria-pressed", "true");
  expect(getComputedStyle(workspace).backgroundColor).toBe(lightCanvas);
  expectThemeColors();

  const system = screen.getByRole("button", { name: "Follow the system appearance" });
  await system.click();
  await expect.element(system).toHaveAttribute("aria-pressed", "true");
  expect(getComputedStyle(workspace).colorScheme).toBe(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
});
