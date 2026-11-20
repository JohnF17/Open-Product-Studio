import { expect, it } from "vite-plus/test";
import { formatClipTime, parseClipTime, readClipRange } from "./clipTimes";

it("reads the guide's written marks, seconds, and clock times as integer milliseconds", () => {
  expect(parseClipTime("00:12")).toBe(12_000);
  expect(parseClipTime("00:29")).toBe(29_000);
  expect(parseClipTime(" 72.01 ")).toBe(72_010);
  expect(parseClipTime("0.9")).toBe(900);
  expect(parseClipTime("90:01.250")).toBe(5_401_250);
  expect(parseClipTime("1:30:01.250")).toBe(5_401_250);
  expect(parseClipTime("9007199254740.991")).toBe(Number.MAX_SAFE_INTEGER);
});

it("rejects malformed or unrepresentable times without rounding a mark", () => {
  for (const text of [
    "", " ", "-1", "+1", "1e3", "Infinity", ".5", "1.", "1.2345", "2s",
    "00:2", "1:60", "01:60:00", "1:00:60", "1:2:03", "00: 12", "1:02:03:04",
    "9007199254740.992", "9007199254740991000:00:00",
  ]) {
    expect(parseClipTime(text), text).toBeNull();
  }
});

it("writes a compact clock with millisecond precision and round-trips large marks", () => {
  expect(formatClipTime(0)).toBe("00:00");
  expect(formatClipTime(12_000)).toBe("00:12");
  expect(formatClipTime(12_500)).toBe("00:12.500");
  expect(formatClipTime(3_723_004)).toBe("1:02:03.004");
  for (const ms of [1, 59_999, 60_000, 3_599_999, 3_600_000, Number.MAX_SAFE_INTEGER]) {
    expect(parseClipTime(formatClipTime(ms))).toBe(ms);
  }
  for (const ms of [NaN, Infinity, -1, 12.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(formatClipTime(ms)).toBe("");
  }
});

it("measures a half-open interval and bounds it to the supplied recording duration", () => {
  const fields = { markIn: "00:12.999", markOut: "13" };
  const expected = { start: 12_999, end: 13_000, duration: 1 };
  expect(readClipRange(fields)).toEqual(expected);
  expect(readClipRange(fields, 13_000)).toEqual(expected);
  expect(readClipRange(fields, 12_999)).toBeNull();
  expect(readClipRange({})).toBeNull();
  expect(readClipRange({ markIn: "bad", markOut: "1" })).toBeNull();
  expect(readClipRange({ markIn: "1", markOut: "00:01" })).toBeNull();
  expect(readClipRange({ markIn: "1", markOut: "0" })).toBeNull();
  for (const duration of [NaN, Infinity, -1, 13_000.1, Number.MAX_SAFE_INTEGER + 1]) {
    expect(readClipRange(fields, duration)).toBeNull();
  }
});
