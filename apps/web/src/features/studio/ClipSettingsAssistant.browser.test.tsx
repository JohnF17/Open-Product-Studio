import { useState } from "react";
import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { ClipSettingsAssistant, type ClipSettings } from "./ClipSettingsAssistant";
import "./studio.css";

const before: ClipSettings = { aspect: "9:16", resolution: "720p", captions: "on", placement: "bottom" };
const after: ClipSettings = { aspect: "16:9", resolution: "1080p", captions: "on", placement: "top" };
const reply = {
  schema: "studio-clip-settings/1", scope: "example-cut", base: before, settings: after,
  reason: "Keep the whole row of tools in view and leave the controls at the bottom clear.",
};

function Example({ onAsk, onWrite, assistantReply, onReadReply }: {
  onAsk?: (question: string, scopeId?: string) => void;
  onWrite?: (settings: ClipSettings) => void;
  assistantReply?: string;
  onReadReply?: (scopeId: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState(before);
  return <ClipSettingsAssistant scopeId="example-cut" value={value} onAsk={onAsk}
    assistantReply={assistantReply} onReadReply={onReadReply}
    onChange={(next) => { setValue(next); onWrite?.(next); }} />;
}

it("explains a setting offline with the keyboard and leaves manual controls available", async () => {
  await using screen = await render(<Example />, { router: false });
  const explain = screen.getByText("Explain aspect ratio", { exact: true });
  (explain.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByText(/side by side/)).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Suggest for me" })).toBeDisabled();
  await screen.getByRole("combobox", { name: "Aspect ratio" }).selectOptions("1:1");
  await expect.element(screen.getByRole("combobox", { name: "Aspect ratio" })).toHaveValue("1:1");
});

it("fits a narrow studio panel and follows its light and dark appearance", async () => {
  const panel = (colorScheme: "light" | "dark") => <div className="ops-workspace" style={{ width: 280, colorScheme }}><Example /></div>;
  await using screen = await render(panel("light"), { router: false });
  await screen.getByText("Explain caption placement", { exact: true }).click();
  const frame = screen.container.firstElementChild as HTMLElement;
  const select = screen.getByRole("combobox", { name: "Caption placement" }).element();
  const lightInk = getComputedStyle(select).color;
  expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  await screen.rerender(panel("dark"));
  expect(getComputedStyle(select).color).not.toBe(lightInk);
  expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
});

it("drafts a request using current settings and the scoped response format without writing", async () => {
  const questions: string[] = [];
  const scopes: (string | undefined)[] = [];
  const writes: ClipSettings[] = [];
  await using screen = await render(<Example onAsk={(q, scope) => { questions.push(q); scopes.push(scope); }}
    onWrite={(s) => writes.push(s)} />, { router: false });
  await screen.getByText("Explain resolution", { exact: true }).click();
  await screen.getByRole("button", { name: "Ask AI about resolution" }).click();
  expect(questions[0]).toContain("720p");
  await screen.getByRole("button", { name: "Suggest for me" }).click();
  expect(questions[1]).toContain("studio-clip-settings/1");
  expect(questions[1]).toContain("example-cut");
  expect(scopes).toEqual([undefined, "example-cut"]);
  expect(writes).toEqual([]);
});

it("loads only a completed settings reply on request and ignores an abandoned read", async () => {
  const scopes: string[] = [];
  let complete: ((text: string | null) => void) | undefined;
  const read = (scope: string) => new Promise<string | null>((resolve) => { scopes.push(scope); complete = resolve; });
  await using screen = await render(<Example onReadReply={read} />, { router: false });
  await screen.getByText("Review a settings reply", { exact: true }).click();
  expect(scopes).toEqual([]);
  const load = screen.getByRole("button", { name: "Load AI settings" });
  await load.click();
  await expect.element(load).toBeDisabled();
  await screen.getByRole("button", { name: "Cancel loading" }).click();
  complete?.(JSON.stringify(reply));
  await expect.element(screen.getByRole("button", { name: "Apply settings" })).not.toBeInTheDocument();
  await load.click();
  complete?.(null);
  await expect.element(screen.getByText(/No completed settings reply/)).toBeVisible();
  await load.click();
  complete?.(JSON.stringify(reply));
  await expect.element(screen.getByText(reply.reason)).toBeVisible();
  expect(scopes).toEqual(["example-cut", "example-cut", "example-cut"]);
});

it("keeps a failed T3 read recoverable through pasted replies", async () => {
  await using screen = await render(<Example onReadReply={async () => { throw new Error("synthetic failure"); }} />, { router: false });
  await screen.getByText("Review a settings reply", { exact: true }).click();
  await screen.getByRole("button", { name: "Load AI settings" }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  await screen.getByRole("textbox", { name: "Settings reply" }).fill(JSON.stringify(reply));
  await screen.getByRole("button", { name: "Preview pasted reply" }).click();
  await expect.element(screen.getByRole("button", { name: "Apply settings" })).toBeEnabled();
});

it("previews a reply, applies the changes together, and restores the preceding values in one undo", async () => {
  const writes: ClipSettings[] = [];
  await using screen = await render(<Example assistantReply={JSON.stringify(reply)} onWrite={(s) => writes.push(s)} />, { router: false });
  await screen.getByText("Review a settings reply", { exact: true }).click();
  await screen.getByRole("button", { name: "Preview latest T3 reply" }).click();
  await expect.element(screen.getByText(reply.reason)).toBeVisible();
  expect(writes).toEqual([]);
  await screen.getByRole("button", { name: "Apply settings" }).click();
  expect(writes).toEqual([after]);
  await expect.element(screen.getByRole("combobox", { name: "Caption placement" })).toHaveValue("top");
  await screen.getByRole("button", { name: "Undo settings" }).click();
  expect(writes).toEqual([after, before]);
});

it("rejects unsupported operations and a reply for another cut, and blocks a stale preview", async () => {
  const writes: ClipSettings[] = [];
  await using screen = await render(<Example onWrite={(s) => writes.push(s)} />, { router: false });
  await screen.getByText("Review a settings reply", { exact: true }).click();
  const input = screen.getByRole("textbox", { name: "Settings reply" });
  const preview = screen.getByRole("button", { name: "Preview pasted reply" });
  for (const invalid of [{ ...reply, render: true }, { ...reply, settings: { ...after, resolution: "4k" } },
    { ...reply, scope: "different-cut" }]) {
    await input.fill(JSON.stringify(invalid));
    await preview.click();
    await expect.element(screen.getByRole("alert")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Apply settings" })).not.toBeInTheDocument();
  }
  await input.fill(JSON.stringify(reply));
  await preview.click();
  await screen.getByRole("combobox", { name: "Resolution" }).selectOptions("1080p");
  await expect.element(screen.getByRole("button", { name: "Apply settings" })).toBeDisabled();
  expect(writes).toEqual([{ ...before, resolution: "1080p" }]);
});
