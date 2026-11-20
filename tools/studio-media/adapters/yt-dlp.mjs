import * as NodeFSP from 'node:fs/promises';
import { executable, outputFile, runTool, writeOutput } from './shared.mjs';

const maxBytes = 100 * 1024 * 1024;
const maxSeconds = 600;

export function canonicalYouTubeUrl(value) {
  let url;
  try { url = new URL(value); } catch { /* invalid URL */ }
  const error = new Error('Provide an HTTPS URL for a single public YouTube video.');
  if (url?.protocol !== 'https:' || url.username || url.password || url.port) throw error;
  let id;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v');
    if (url.pathname.startsWith('/shorts/')) id = url.pathname.slice('/shorts/'.length);
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? '')) throw error;
  return `https://www.youtube.com/watch?v=${id}`;
}

export const ytdlpStartup = ['--ignore-config', '--no-plugin-dirs', '--no-cache-dir', '--no-js-runtimes', '--no-remote-components'];

export async function ytdlpBinary() {
  return executable('yt-dlp', 'STUDIO_YTDLP_BIN');
}

export async function download(options) {
  const url = canonicalYouTubeUrl(options.url);
  const target = await outputFile(options.output, '.mp4');
  if (!options['approve-download']) {
    return { provider: 'yt-dlp', status: 'preview', url, output: target, maxBytes, maxSeconds, approval: '--approve-download' };
  }
  const binary = await ytdlpBinary();
  return writeOutput(target, '.mp4', async (staged, directory) => {
    try {
      await runTool(binary, [
        // One canonical watch URL and the video-only extractor constrain this job to one item.
        // yt-dlp's --max-downloads exits 101 even after successfully writing that last item.
        ...ytdlpStartup, '--no-playlist', '--use-extractors', 'youtube$',
        '--match-filter', `availability=public & duration <= ${maxSeconds} & !is_live`,
        '--format', `b[ext=mp4][height<=720][protocol=https][filesize<=?${maxBytes}]`,
        '--max-filesize', String(maxBytes), '--limit-rate', '2M', '--socket-timeout', '15',
        '--retries', '0', '--fragment-retries', '0', '--extractor-retries', '0', '--no-overwrites',
        '--no-progress', '--output', staged.replaceAll('%', '%%'), '--', url,
      ], { cwd: directory, timeout: 240_000, capFile: staged, capBytes: maxBytes });
      const { size } = await NodeFSP.stat(staged);
      if (size < 12 || size > maxBytes) throw new Error('The downloaded file was outside the size limit.');
      const output = await NodeFSP.open(staged, 'r');
      try {
        const header = Buffer.alloc(12);
        await output.read(header, 0, 12, 0);
        if (header.toString('ascii', 4, 8) !== 'ftyp') throw new Error('The downloaded file was not MP4.');
      } finally {
        await output.close();
      }
      return { provider: 'yt-dlp', status: 'downloaded', url, bytes: size };
    } catch (error) {
      if (error.code !== 'ENOENT' && !error.message.includes('exited with code')) throw error;
      throw new Error('No eligible public MP4 was returned. Use the platform export or a permitted local file.', { cause: error });
    }
  });
}
