import { expect, it, vi } from "vite-plus/test";
import { isDeviceAssistantAvailable, runDeviceAssistant } from "./builderDeviceAssistant";

function model(parts: string[], status = "available") {
  const session = {
    destroy: vi.fn(),
    promptStreaming: vi.fn(
      () =>
        new ReadableStream<string>({
          start(controller) {
            for (const part of parts) controller.enqueue(part);
            controller.close();
          },
        }),
    ),
  };
  return { availability: vi.fn(async () => status), create: vi.fn(async () => session), session };
}

it("uses already installed inference and destroys its isolated session", async () => {
  const device = model(["hello", " world"]);
  expect(await isDeviceAssistantAvailable(device)).toBe(true);
  expect(await runDeviceAssistant("A reviewed prompt", new AbortController().signal, device)).toBe(
    "hello world",
  );
  expect(device.session.destroy).toHaveBeenCalledOnce();
});

it("never starts a model download or a request after cancellation", async () => {
  const device = model([], "downloadable");
  await expect(runDeviceAssistant("text", new AbortController().signal, device)).rejects.toThrow();
  await expect(runDeviceAssistant("text", AbortSignal.abort(), device)).rejects.toThrow();
  expect(device.create).not.toHaveBeenCalled();
});

it("releases the local model after an excessive response", async () => {
  const device = model(["x".repeat(20_001)]);
  await expect(runDeviceAssistant("text", new AbortController().signal, device)).rejects.toThrow(
    /limit/,
  );
  expect(device.session.destroy).toHaveBeenCalledOnce();
});
