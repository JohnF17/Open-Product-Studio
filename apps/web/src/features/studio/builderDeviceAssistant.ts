import { useEffect, useState } from "react";

interface DeviceSession {
  promptStreaming(prompt: string, options: { signal: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

interface DeviceModel {
  availability(options: typeof languageOptions): Promise<string>;
  create(options: typeof languageOptions & { signal: AbortSignal }): Promise<DeviceSession>;
}

const languageOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

function deviceModel(): DeviceModel | undefined {
  return (globalThis as typeof globalThis & { LanguageModel?: DeviceModel }).LanguageModel;
}

export async function isDeviceAssistantAvailable(model = deviceModel()): Promise<boolean> {
  try {
    return (await model?.availability(languageOptions)) === "available";
  } catch {
    return false;
  }
}

export function useDeviceAssistantAvailable() {
  const [available, setAvailable] = useState(false);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- tracks the browser's installed model and rechecks it when the window regains focus
  useEffect(() => {
    let active = true;
    let checkVersion = 0;
    const check = () => {
      const version = ++checkVersion;
      void isDeviceAssistantAvailable().then((value) => {
        if (active && version === checkVersion) setAvailable(value);
      });
    };
    check();
    window.addEventListener("focus", check);
    return () => {
      active = false;
      window.removeEventListener("focus", check);
    };
  }, []);
  return available;
}

export async function runDeviceAssistant(
  prompt: string,
  owner: AbortSignal,
  model = deviceModel(),
): Promise<string> {
  const signal = AbortSignal.any([owner, AbortSignal.timeout(90_000)]);
  signal.throwIfAborted();
  if (prompt.length === 0 || prompt.length > 24_000)
    throw new Error("The request exceeds the on-device input limit.");
  if (!model || !(await isDeviceAssistantAvailable(model)))
    throw new Error("An installed on-device model is unavailable.");
  signal.throwIfAborted();
  const session = await model.create({ ...languageOptions, signal });
  try {
    signal.throwIfAborted();
    const reader = session.promptStreaming(prompt, { signal }).getReader();
    try {
      let output = "";
      while (true) {
        const part = await reader.read();
        signal.throwIfAborted();
        if (part.done) return output;
        if (typeof part.value !== "string" || part.value.length + output.length > 20_000) {
          throw new Error("The model exceeded the response limit.");
        }
        output += part.value;
      }
    } finally {
      reader.releaseLock();
    }
  } finally {
    session.destroy();
  }
}
