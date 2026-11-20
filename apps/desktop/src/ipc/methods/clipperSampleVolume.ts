import { arch, platform } from "node:os";

interface WindowsVolumeApi {
  readonly queryDevice: (drive: string) => string | undefined;
  readonly driveType: (root: string) => number;
  readonly attributes: (path: string) => number;
  readonly volumePath: (directory: string) => string | undefined;
  readonly fileSystem: (root: string) => string | undefined;
}

const DRIVE_FIXED = 3;
const FILE_ATTRIBUTE_DIRECTORY = 0x10;
const FILE_ATTRIBUTE_REPARSE_POINT = 0x400;
const INVALID_FILE_ATTRIBUTES = 0xffffffff;
const MAX_PATH = 260;

/** Qualifies the existing directory on the actual destination volume. */
export function isFixedNtfsDirectory(directory: string, api: WindowsVolumeApi): boolean {
  if (directory.length >= MAX_PATH || !/^[a-z]:\\/i.test(directory)) return false;
  const root = directory.slice(0, 3);
  const parts = directory === root ? [] : directory.slice(3).split("\\");
  if (
    parts.some(
      (part) =>
        part === "" ||
        /[<>:"/|?*\u0000-\u001f]/.test(part) ||
        /[. ]$/.test(part) ||
        /^(?:con|conin\$|conout\$|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/i.test(part),
    )
  ) {
    return false;
  }

  // Reject mapped and substituted drives before touching a directory beneath the root.
  const device = api.queryDevice(root.slice(0, 2));
  if (!device || !/^\\Device\\HarddiskVolume\d+$/i.test(device)) return false;
  if (api.driveType(root) !== DRIVE_FIXED) return false;

  let current = root;
  for (const part of ["", ...parts]) {
    if (part !== "") current += current === root ? part : "\\" + part;
    const attributes = api.attributes(current);
    if (
      attributes === INVALID_FILE_ATTRIBUTES ||
      (attributes & FILE_ATTRIBUTE_DIRECTORY) === 0 ||
      (attributes & FILE_ATTRIBUTE_REPARSE_POINT) !== 0
    ) {
      return false;
    }
  }

  const volume = api.volumePath(directory);
  return volume?.toUpperCase() === root.toUpperCase() && api.fileSystem(volume) === "NTFS";
}

const wide = (value: string) => Buffer.from(value + "\0", "utf16le");

function readWide(buffer: Buffer): string | undefined {
  for (let i = 0; i < buffer.length; i += 2) {
    if (buffer.readUInt16LE(i) === 0) return i === 0 ? undefined : buffer.toString("utf16le", 0, i);
  }
  return undefined;
}

let windowsVolumeApi: Promise<WindowsVolumeApi> | undefined;

function loadWindowsVolumeApi(): Promise<WindowsVolumeApi> {
  windowsVolumeApi ??= import("ffi-rs").then(({ DataType, load, open }) => {
    const library = "studio-clipper-kernel32";
    open({ library, path: "kernel32.dll" });
    return {
      queryDevice: (drive) => {
        const output = Buffer.alloc(32_768 * 2);
        const written = load({
          library,
          funcName: "QueryDosDeviceW",
          retType: DataType.U32,
          paramsType: [DataType.U8Array, DataType.U8Array, DataType.U32],
          paramsValue: [wide(drive), output, output.length / 2],
        });
        // QueryDosDevice returns the current mapping first, followed by prior mappings.
        return written > 0 ? readWide(output.subarray(0, written * 2)) : undefined;
      },
      driveType: (root) =>
        load({
          library,
          funcName: "GetDriveTypeW",
          retType: DataType.U32,
          paramsType: [DataType.U8Array],
          paramsValue: [wide(root)],
        }),
      attributes: (path) =>
        load({
          library,
          funcName: "GetFileAttributesW",
          retType: DataType.U32,
          paramsType: [DataType.U8Array],
          paramsValue: [wide(path)],
        }),
      volumePath: (directory) => {
        const output = Buffer.alloc(MAX_PATH * 2);
        const ok = load({
          library,
          funcName: "GetVolumePathNameW",
          retType: DataType.I32,
          paramsType: [DataType.U8Array, DataType.U8Array, DataType.U32],
          paramsValue: [wide(directory), output, output.length / 2],
        });
        return ok === 1 ? readWide(output) : undefined;
      },
      fileSystem: (root) => {
        const output = Buffer.alloc(MAX_PATH * 2);
        const ok = load({
          library,
          funcName: "GetVolumeInformationW",
          retType: DataType.I32,
          paramsType: [
            DataType.U8Array, // root path
            DataType.BigInt, // optional volume label
            DataType.U32, // label capacity
            DataType.BigInt, // optional volume serial number
            DataType.BigInt, // optional maximum component length
            DataType.BigInt, // optional filesystem flags
            DataType.U8Array, // filesystem name
            DataType.U32, // name capacity
          ],
          paramsValue: [wide(root), 0n, 0, 0n, 0n, 0n, output, output.length / 2],
        });
        return ok === 1 ? readWide(output) : undefined;
      },
    };
  });
  return windowsVolumeApi;
}

export async function isAllowedVolume(directory: string): Promise<boolean> {
  if (platform() !== "win32" || arch() !== "x64") return false;
  try {
    return isFixedNtfsDirectory(directory, await loadWindowsVolumeApi());
  } catch {
    return false;
  }
}
