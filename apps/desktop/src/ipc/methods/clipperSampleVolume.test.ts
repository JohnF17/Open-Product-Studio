// @effect-diagnostics nodeBuiltinImport:off -- The Win32 fixture needs the native junction type and its explicit removal.
import { mkdtemp, rmdir, symlink } from "node:fs/promises";
import { arch, platform, tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vite-plus/test";

import { isAllowedVolume, isFixedNtfsDirectory } from "./clipperSampleVolume.ts";

function windowsVolume() {
  return {
    queryDevice: vi.fn(() => "\\Device\\HarddiskVolume4"),
    driveType: vi.fn(() => 3),
    attributes: vi.fn(() => 0x10),
    volumePath: vi.fn(() => "C:\\"),
    fileSystem: vi.fn(() => "NTFS"),
  };
}

it("qualifies the destination directory, including every ancestor", () => {
  const volume = windowsVolume();
  const directory = "C:\\Users\\Studio\\Videos";
  expect(isFixedNtfsDirectory(directory, volume)).toBe(true);
  expect(volume.attributes.mock.calls).toEqual([
    ["C:\\"],
    ["C:\\Users"],
    ["C:\\Users\\Studio"],
    [directory],
  ]);
  expect(volume.volumePath).toHaveBeenCalledWith(directory);
});

it("fails closed for mounts, reparses, aliases and ambiguous or unavailable paths", () => {
  const directory = "C:\\Users\\Studio\\Videos";
  const volume = windowsVolume();
  volume.attributes.mockReturnValueOnce(0x10).mockReturnValueOnce(0x410);
  expect(isFixedNtfsDirectory(directory, volume)).toBe(false);
  expect(volume.volumePath).not.toHaveBeenCalled();
  expect(isFixedNtfsDirectory(directory, { ...volume, attributes: () => 0xffffffff })).toBe(false);
  expect(isFixedNtfsDirectory(directory, { ...volume, attributes: () => 0x20 })).toBe(false);
  expect(isFixedNtfsDirectory(directory, { ...volume, volumePath: () => "C:\\Users\\" })).toBe(
    false,
  );
  expect(isFixedNtfsDirectory(directory, { ...volume, fileSystem: () => "exFAT" })).toBe(false);
  expect(isFixedNtfsDirectory(directory, { ...volume, driveType: () => 4 })).toBe(false);
  expect(isFixedNtfsDirectory(directory, { ...volume, queryDevice: () => "\\??\\C:\\Users" })).toBe(
    false,
  );
  for (const path of [
    "\\\\server\\share",
    "\\\\?\\C:\\Users",
    "C:\\Users\\..\\Videos",
    "C:\\Users\\Videos.",
    "C:\\Users\\Videos:stream",
    "C:\\Users\\NUL",
  ]) {
    expect(isFixedNtfsDirectory(path, volume)).toBe(false);
  }
});

it.skipIf(platform() !== "win32" || arch() !== "x64")(
  "accepts a real NTFS directory and rejects a real junction through ffi-rs",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "studio-clipper-volume-"));
    const junction = join(directory, "junction");
    try {
      await symlink(directory, junction, "junction");
      try {
        await expect(isAllowedVolume(directory)).resolves.toBe(true);
        await expect(isAllowedVolume(junction)).resolves.toBe(false);
        await expect(isAllowedVolume(join(directory, "missing"))).resolves.toBe(false);
      } finally {
        await rmdir(junction);
      }
    } finally {
      await rmdir(directory);
    }
  },
);
