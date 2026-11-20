// @effect-diagnostics nodeBuiltinImport:off -- The desktop pins the downloaded file before extracting or installing any bytes.
import { createHash, randomUUID } from "node:crypto";
import { lstat, open, realpath, rename, unlink, type FileHandle } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { Readable } from "node:stream";
import { createInflateRaw } from "node:zlib";

// imageio-ffmpeg 0.6.0 Windows x64. Studio never installs Python packages or runs wheel contents.
export const sampleEncoderSha256 = "2ce797a0f88d7f067180338fb227f7b1928ea727bd9a4d7a1d022f7c52af71a3";
const encoderSize = 87_638_016;
const wheel = {
  size: 31_246_824,
  sha256: "02fa47c83703c37df6bfe4896aab339013f62bf02c5ebf2dce6da56af04ffc0a",
  entry: "imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
  header: 13_515,
  compressedSize: 31_229_711,
};

/** Only the exact published wheel reaches the inflater. No paths are taken from archive entries. */
async function wheelEncoder(file: FileHandle, signal: AbortSignal): Promise<Readable | undefined> {
  const data = Buffer.allocUnsafe(wheel.size);
  let offset = 0;
  while (offset < data.length) {
    signal.throwIfAborted();
    const { bytesRead } = await file.read(data, offset, Math.min(data.length - offset, 262_144), offset);
    if (!bytesRead) return;
    offset += bytesRead;
  }
  if (createHash("sha256").update(data).digest("hex") !== wheel.sha256) return;
  const h = wheel.header;
  const filename = h + 30;
  const nameEnd = filename + data.readUInt16LE(h + 26);
  const start = nameEnd + data.readUInt16LE(h + 28);
  if (data.readUInt32LE(h) !== 0x04034b50 || data.readUInt16LE(h + 8) !== 8 ||
      data.readUInt32LE(h + 18) !== wheel.compressedSize || data.readUInt32LE(h + 22) !== encoderSize ||
      data.toString("ascii", filename, nameEnd) !== wheel.entry || start + wheel.compressedSize > data.length) return;
  return Readable.from([data.subarray(start, start + wheel.compressedSize)]).pipe(createInflateRaw());
}

export async function installSampleEncoder(selected: string, directory: string, signal: AbortSignal) {
  if (!isAbsolute(selected) || relative(selected, await realpath(selected)) !== "" || !(await lstat(selected)).isFile()) return false;
  const source = await open(selected, "r");
  const temporary = join(directory, randomUUID() + ".part");
  let owned = false;
  let stream: Readable | undefined;
  try {
    const info = await source.stat();
    if (!info.isFile()) return false;
    if (info.size === wheel.size) stream = await wheelEncoder(source, signal);
    if (info.size === encoderSize) stream = source.createReadStream({ start: 0, end: encoderSize - 1, autoClose: false });
    if (!stream) return false;
    signal.throwIfAborted();
    const output = await open(temporary, "wx", 0o600);
    owned = true;
    const digest = createHash("sha256");
    try {
      let bytes = 0;
      for await (const chunk of stream) {
        signal.throwIfAborted();
        if (!Buffer.isBuffer(chunk) || (bytes += chunk.length) > encoderSize) return false;
        digest.update(chunk);
        await output.writeFile(chunk);
      }
      if (bytes !== encoderSize || (await source.stat()).size !== info.size || digest.digest("hex") !== sampleEncoderSha256) return false;
      await output.sync();
    } finally {
      await output.close();
    }
    signal.throwIfAborted();
    await rename(temporary, join(directory, "ffmpeg.exe"));
    owned = false;
    return true;
  } finally {
    stream?.destroy();
    await source.close();
    if (owned) await unlink(temporary).catch(() => {});
  }
}
