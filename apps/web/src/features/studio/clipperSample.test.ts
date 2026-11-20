import { expect, it } from "vite-plus/test";
import { readSampleRange, sampleRangeSummary } from "./clipperSample";

it("reads the default as 60 frames starting at 1.25 seconds and stopping before 3.75 seconds", () => {
  const range = readSampleRange("30", "90");
  expect(range).toEqual({ startFrame: 30, endFrameExclusive: 90 });
  expect(sampleRangeSummary(range!)).toBe(
    "Starts at frame 30 (1.25 seconds) and stops before frame 90 (3.75 seconds). 60 frames, 2.5 seconds.",
  );
});

it("accepts the full five-second source and the final single frame", () => {
  expect(readSampleRange("0", "120")).toEqual({ startFrame: 0, endFrameExclusive: 120 });
  expect(readSampleRange("119", "120")).toEqual({ startFrame: 119, endFrameExclusive: 120 });
});

it.each([
  ["", "90"],
  ["0", ""],
  ["-1", "90"],
  ["1.5", "90"],
  ["1e1", "90"],
  ["30", "30"],
  ["30", "29"],
  ["30", "121"],
  ["120", "120"],
])("rejects invalid frame boundaries %s and %s", (start, end) => {
  expect(readSampleRange(start, end)).toBeNull();
});
