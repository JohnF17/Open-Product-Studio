import "~/index.css";
import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { randomUUID } from "../../lib/randomUUID";
import { BuilderToolSettings } from "./BuilderToolSettings";
import { setBuilderDraftRoute, useBuilderDraftRoute } from "./builderToolPreferences";

function DraftRoute({
  workspaceId,
  category,
  label,
}: {
  workspaceId: string;
  category: "video" | "digital-product";
  label: string;
}) {
  const route = useBuilderDraftRoute(workspaceId, category);
  return <output aria-label={label}>{route}</output>;
}

it("shares changes with an open builder and restores a category's preference when reopened", async () => {
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  {
    await using ui = await render(
      <>
        <BuilderToolSettings workspaceId={workspaceId} t3Available />
        <DraftRoute workspaceId={workspaceId} category="video" label="video route" />
        <DraftRoute
          workspaceId={workspaceId}
          category="digital-product"
          label="digital-product route"
        />
        <DraftRoute
          workspaceId={otherWorkspaceId}
          category="video"
          label="other workspace video route"
        />
      </>,
      { router: false },
    );
    await ui.getByRole("combobox", { name: "Project category" }).selectOptions("video");
    await expect.element(ui.getByRole("radio", { name: "T3 chat" })).toBeChecked();
    await ui.getByRole("radio", { name: "T3 chat" }).click();
    await expect.element(ui.getByRole("status", { name: "video route" })).toHaveTextContent("t3");
    await expect
      .element(ui.getByRole("status", { name: "digital-product route" }))
      .toHaveTextContent("local");
    await expect
      .element(ui.getByRole("status", { name: "other workspace video route" }))
      .toHaveTextContent("local");
    await ui.getByRole("combobox", { name: "Project category" }).selectOptions("digital-product");
    await expect.element(ui.getByRole("radio", { name: "T3 chat" })).toBeChecked();
  }

  await using ui = await render(
    <BuilderToolSettings
      workspaceId={workspaceId}
      category="video"
      stage="storyboard"
      deviceAvailable
      t3Available
    />,
    { router: false },
  );
  await ui.getByText("Tools and drafting preferences", { exact: true }).click();
  await expect.element(ui.getByRole("radio", { name: "T3 chat" })).toBeChecked();
});

it("preserves an unavailable preference until a user explicitly changes it", async () => {
  const workspaceId = randomUUID();
  expect(setBuilderDraftRoute(workspaceId, "clipper", "t3")).toBe(true);
  await using ui = await render(
    <BuilderToolSettings
      workspaceId={workspaceId}
      category="clipper"
      stage="edit"
      deviceAvailable
    />,
    { router: false },
  );
  await ui.getByText("Tools and drafting preferences", { exact: true }).click();
  await expect.element(ui.getByRole("radio", { name: "T3 chat" })).toBeChecked();
  await expect.element(ui.getByRole("radio", { name: "T3 chat" })).toBeDisabled();
  await ui.getByRole("radio", { name: "On-device AI" }).click();
  await expect.element(ui.getByRole("radio", { name: "On-device AI" })).toBeChecked();
});

it("allows an installed device model and keeps Day Trader offline", async () => {
  const workspaceId = randomUUID();
  expect(setBuilderDraftRoute(workspaceId, "day-trader", "t3")).toBe(false);
  await using ui = await render(
    <BuilderToolSettings
      workspaceId={workspaceId}
      category="day-trader"
      stage="journal"
      expanded
      t3Available
      deviceAvailable
    />,
    { router: false },
  );
  await expect.element(ui.getByRole("radio", { name: "On-device AI" })).toBeChecked();
  await expect.element(ui.getByRole("radio", { name: "T3 chat" })).not.toBeInTheDocument();
  await expect.element(ui.getByRole("term").filter({ hasText: "Practice journal" })).toBeVisible();
  await userEvent.tab();
  await expect.element(ui.getByRole("radio", { name: "On-device AI" })).toHaveFocus();
  await userEvent.keyboard("{ArrowUp}");
  await expect.element(ui.getByRole("radio", { name: "Local starter" })).toBeChecked();
});

it("shows what works in the Video preview step without overflowing a narrow panel", async () => {
  const container = document.createElement("div");
  container.style.width = "290px";
  await using ui = await render(
    <BuilderToolSettings workspaceId={randomUUID()} category="video" stage="render" />,
    { router: false, container },
  );

  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  await expect
    .element(
      ui
        .getByRole("term")
        .filter({ hasText: "Storyboard preview" })
        .getByText("Built in", { exact: true }),
    )
    .toBeVisible();
  await expect
    .element(
      ui
        .getByRole("term")
        .filter({ hasText: "Video renderer" })
        .getByText("Unqualified", { exact: true }),
    )
    .toBeVisible();
  expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
});

it("shows registered skill names for an available T3 account and expands the remaining list", async () => {
  const workspace = randomUUID();
  const skills = ["Scene planner", ...Array.from({ length: 10 }, (_, i) => "Tool " + i)];
  await using ui = await render(
    <BuilderToolSettings
      workspaceId={workspace}
      category="video"
      expanded
      t3Available
      availableSkills={skills}
    />,
    { router: false },
  );

  await expect.element(ui.getByText("Scene planner", { exact: true })).toBeVisible();
  await expect.element(ui.getByText("Tool 9", { exact: true })).not.toBeVisible();
  await ui.getByText("Show 1 more skill", { exact: true }).click();
  await expect.element(ui.getByText("Tool 9", { exact: true })).toBeVisible();

  await ui.rerender(
    <BuilderToolSettings
      workspaceId={workspace}
      category="day-trader"
      expanded
      t3Available
      availableSkills={skills}
    />,
  );
  await expect.element(ui.getByText("Scene planner", { exact: true })).not.toBeInTheDocument();
});

it("resets an unavailable pin to automatic availability without affecting other scopes", async () => {
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  expect(setBuilderDraftRoute(workspaceId, "video", "t3")).toBe(true);
  expect(setBuilderDraftRoute(workspaceId, "digital-product", "t3")).toBe(true);
  expect(setBuilderDraftRoute(otherWorkspaceId, "video", "t3")).toBe(true);

  const view = (deviceAvailable: boolean, t3Available: boolean) => (
    <>
      <BuilderToolSettings
        workspaceId={workspaceId}
        category="video"
        expanded
        deviceAvailable={deviceAvailable}
        t3Available={t3Available}
      />
      <DraftRoute
        workspaceId={workspaceId}
        category="digital-product"
        label="other category route"
      />
      <DraftRoute workspaceId={otherWorkspaceId} category="video" label="other workspace route" />
    </>
  );
  await using ui = await render(view(true, false), { router: false });
  const t3 = ui.getByRole("radio", { name: "T3 chat" });
  const device = ui.getByRole("radio", { name: "On-device AI" });
  const reset = ui.getByRole("button", { name: "Reset to default" });
  await expect.element(t3).toBeChecked();
  await expect.element(t3).toBeDisabled();

  await reset.click();
  await expect.element(device).toBeChecked();
  await expect.element(device).toHaveFocus();
  await expect.element(reset).not.toBeInTheDocument();

  await ui.rerender(view(false, true));
  await expect.element(t3).toBeChecked();
  await ui.rerender(view(false, false));
  await expect.element(ui.getByRole("radio", { name: "Local starter" })).toBeChecked();
  await expect.element(reset).not.toBeInTheDocument();

  await expect
    .element(ui.getByRole("status", { name: "other category route" }))
    .toHaveTextContent("t3");
  await expect
    .element(ui.getByRole("status", { name: "other workspace route" }))
    .toHaveTextContent("t3");
});
