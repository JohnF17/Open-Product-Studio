import { wcagContrast } from "culori/fn";
import { expect, it, vi } from "vite-plus/test";

import "~/index.css";
import { render } from "../../../test/render";
import { setAppearanceMode, setTheme } from "../../hooks/useTheme";
import { randomUUID } from "../../lib/randomUUID";
import StudioWorkspace from "./StudioWorkspace";

it("keeps unfinished cue timing editable and exports only the remaining timed cues", async () => {
  using _appearance = {
    [Symbol.dispose]() {
      setAppearanceMode("system");
    },
  };
  expect(setTheme("system")).toBe(true);
  expect(setAppearanceMode("light")).toBe(true);
  await using screen = await render(<StudioWorkspace workspaceId={randomUUID()} />, {
    router: false,
  });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const field = (cue: number, name: string) =>
    screen.getByRole("group", { name: `Cue ${cue}`, exact: true }).getByRole("textbox", {
      name,
      exact: true,
    });
  const goTo = async (label: string) => {
    const select = screen.getByRole("combobox", { name: "Go to step" });
    const option = Array.from((select.element() as HTMLSelectElement).options).find(
      (option) => option.label === label,
    );
    expect(option).toBeDefined();
    await select.selectOptions(option!.value);
  };

  await button(/^Video/).click();
  await screen.getByRole("textbox", { name: "Project name", exact: true }).fill("Paper lantern");
  await goTo("Storyboard");
  const disclosure = screen.getByText("Shot cue sheet (optional)", { exact: true });
  await expect.element(disclosure, { timeout: 5000 }).toBeVisible();
  await disclosure.click();
  await button("Add cue").click();
  await expect.element(field(1, "Start time")).toHaveFocus();
  await field(1, "Start time").fill("0:02.500");
  await field(1, "Action").fill("Fold the paper");
  await field(1, "Narration").fill("Start at the marked edge.");

  const action = field(1, "Action").element();
  const lightBackground = getComputedStyle(action).backgroundColor;
  expect(getComputedStyle(action).colorScheme).toBe("light");
  expect(wcagContrast(getComputedStyle(action).color, lightBackground)).toBeGreaterThanOrEqual(4.5);
  expect(setAppearanceMode("dark")).toBe(true);
  const darkStyle = getComputedStyle(action);
  expect(darkStyle.colorScheme).toBe("dark");
  expect(darkStyle.backgroundColor).not.toBe(lightBackground);
  expect(wcagContrast(darkStyle.color, darkStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);

  await button("Add cue").click();
  await field(2, "Start time").fill("0:01");
  await field(2, "Caption").fill("Add a light");
  const timingError = screen.getByText(/start time later than the preceding cues/i);
  await expect.element(timingError).toBeVisible();
  await expect.element(field(2, "Start time")).toHaveAttribute("aria-invalid", "true");
  await expect
    .element(field(2, "Start time"))
    .toHaveAccessibleDescription("Choose a start time later than the preceding cues.");
  const readyTiming = screen.getByText("Cue times are in order.", { exact: true });
  await expect.element(readyTiming).not.toBeInTheDocument();

  await button("Projects").click();
  await button(/^Paper lantern/).click();
  await disclosure.click();
  await expect.element(field(2, "Start time")).toHaveValue("0:01");
  await expect.element(field(2, "Caption")).toHaveValue("Add a light");
  await expect.element(timingError).toBeVisible();

  const createUrl = vi.spyOn(URL, "createObjectURL");
  const clickLink = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const exportDraft = async () => {
    await goTo("Export");
    await button("Download draft").click();
    const blob = createUrl.mock.calls.at(-1)?.[0];
    expect(blob).toBeInstanceOf(Blob);
    return JSON.parse(await (blob as Blob).text());
  };

  try {
    await goTo("Preview");
    await expect.element(screen.getByText("Cue times need review.", { exact: true })).toBeVisible();
    await expect.element(readyTiming).not.toBeInTheDocument();
    expect(await exportDraft()).toMatchObject({
      cueSheet: {
        timing: "draft",
        cues: [
          { timestamp: "0:02.500", startMs: 2500, action: "Fold the paper" },
          { timestamp: "0:01", caption: "Add a light" },
        ],
      },
    });

    await goTo("Storyboard");
    await disclosure.click();
    await field(2, "Start time").fill("0:08");
    await field(2, "Sound").fill("Paper rustles");
    await expect.element(readyTiming).toBeVisible();
    await button("Remove cue 1").click();
    await expect.element(field(1, "Start time")).toHaveFocus();

    await goTo("Preview");
    await expect.element(screen.getByRole("heading", { name: "Shot cue sheet" })).toBeVisible();
    await expect.element(screen.getByText("Add a light", { exact: false })).toBeVisible();
    await expect
      .element(screen.getByText("Fold the paper", { exact: false }))
      .not.toBeInTheDocument();
    expect(await exportDraft()).toMatchObject({
      cueSheet: {
        timing: "ready",
        cues: [
          { timestamp: "0:08", startMs: 8000, caption: "Add a light", sound: "Paper rustles" },
        ],
      },
    });
    expect(clickLink).toHaveBeenCalledTimes(2);
  } finally {
    createUrl.mockRestore();
    clickLink.mockRestore();
  }

  await button("Projects").click();
  await button("New project").click();
  await button(/^Video/).click();
  await goTo("Storyboard");
  await disclosure.click();
  await expect.element(button("Add cue")).toBeVisible();
  await expect
    .element(screen.getByRole("group", { name: "Cue 1", exact: true }))
    .not.toBeInTheDocument();
}, 30_000);
