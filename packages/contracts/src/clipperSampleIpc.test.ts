import * as Schema from "effect/Schema";
import { expect, it } from "vite-plus/test";

import { ClipperSampleRequestSchema, ClipperSampleResultSchema } from "./ipc.ts";

const uuid = "95f0d888-b490-4393-a125-99bdc73d5146";
const decodeRequest = Schema.decodeUnknownSync(ClipperSampleRequestSchema, {
  onExcessProperty: "error",
});
const decodeResult = Schema.decodeUnknownSync(ClipperSampleResultSchema, {
  onExcessProperty: "error",
});

it("accepts only bounded sample actions and their declared fields", () => {
  const render = { action: "render", projectId: uuid, startFrame: 0, endFrameExclusive: 120 };
  expect(decodeRequest(render)).toEqual(render);
  expect(decodeRequest({ action: "save", projectId: uuid, token: uuid })).toEqual({
    action: "save",
    projectId: uuid,
    token: uuid,
  });
  for (const invalid of [
    { action: "enroll", path: "encoder.exe" },
    { action: "save", projectId: uuid, token: "short" },
    { ...render, projectId: uuid + "\n" },
    { ...render, startFrame: -1 },
    { ...render, startFrame: 0.5 },
    { ...render, endFrameExclusive: 121 },
    { ...render, endFrameExclusive: 0 },
  ]) {
    expect(() => decodeRequest(invalid)).toThrow();
  }
});

it("bounds review by decoded bytes, including at the base64 padding boundary", () => {
  const review = { status: "review", token: uuid, startFrame: 0, endFrameExclusive: 120 };
  const atLimit = "A".repeat(4 * Math.ceil((2 * 1024 * 1024) / 3) - 1) + "=";
  expect(decodeResult({ ...review, base64: atLimit })).toEqual({ ...review, base64: atLimit });
  expect(() => decodeResult({ ...review, base64: atLimit.replace(/=$/, "A") })).toThrow();
  for (const base64 of ["", "AA=A", "AAA", "data:video/mp4;base64,AAAA", "AAAA\n"]) {
    expect(() => decodeResult({ ...review, base64 })).toThrow();
  }
  expect(() => decodeResult({ status: "failed", path: "private" })).toThrow();
});
