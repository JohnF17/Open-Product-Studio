import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import StudioWorkspace, { type StudioAgentRequest } from "./StudioWorkspace";
import { listDrafts } from "./drafts";

it("preserves an editable video brief through forward, backward and project navigation", async () => {
  await using screen = await render(<StudioWorkspace workspaceId={crypto.randomUUID()} />, {
    router: false,
  });
  const button = (name: string | RegExp) =>
    screen.getByRole("button", { name, exact: typeof name === "string" });
  const name = screen.getByRole("textbox", { name: "Project name", exact: true });
  const brief = screen.getByRole("textbox", { name: "What will you make?", exact: true });
  const note = "Show the hinge assembly from three angles.";
  await button(/^Video/).click();
  await name.fill("Hinge study");
  await button(/^3D showcase/).click();
  await button("Next").click();
  await expect
    .element(screen.getByRole("combobox", { name: "3D shot", exact: true }))
    .toBeVisible();
  await button("Next").click();
  await brief.fill(note);
  await button("Back").click();
  await button("Next").click();
  await expect.element(brief).toHaveValue(note);
  await button("Projects").click();
  await button(/^Hinge study/).click();
  await expect.element(brief).toHaveValue(note);
});

it("hands saved context to the agent and cancels requests on step changes and project exit", async () => {
  const workspace = crypto.randomUUID();
  const requests: StudioAgentRequest[] = [];
  const handoff = async (request: StudioAgentRequest) => {
    requests.push(request);
    await new Promise<void>((resolve) =>
      request.signal.addEventListener("abort", () => resolve(), { once: true }),
    );
  };
  await using screen = await render(
    <StudioWorkspace workspaceId={workspace} onAskAgent={handoff} />,
    { router: false },
  );
  await screen.getByRole("button", { name: /^Video/ }).click();
  await screen.getByRole("textbox", { name: "Project name" }).fill("Final cut");
  const ask = screen.getByRole("button", { name: "Ask agent for options" });
  await ask.click();
  await expect.poll(() => requests.length).toBe(1);
  expect((await listDrafts(workspace))[0]).toMatchObject({
    id: requests[0]!.projectId,
    title: "Final cut",
    stage: "style",
  });
  expect(requests[0]!.prompt).toContain("Final cut");
  await screen.getByRole("button", { name: "Next", exact: true }).click();
  expect(requests[0]!.signal.aborted).toBe(true);
  await ask.click();
  await expect.poll(() => requests.length).toBe(2);
  await screen.getByRole("button", { name: "Projects", exact: true }).click();
  expect(requests[1]!.signal.aborted).toBe(true);
});
