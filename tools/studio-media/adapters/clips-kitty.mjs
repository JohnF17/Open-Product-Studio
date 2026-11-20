import { responseBytes } from './shared.mjs';

const engine = 'http://127.0.0.1:8765';

async function getJson(path, maxBytes, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(new URL(path, engine), {
      redirect: 'error', signal: AbortSignal.timeout(6_000), headers: { accept: 'application/json' },
    });
  } catch {
    throw new Error('The local Clips Kitty engine did not respond. Open your selected single-user Clips Kitty app.');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Clips Kitty returned HTTP ${response.status}.`);
  }
  return JSON.parse((await responseBytes(response, maxBytes)).toString('utf8'));
}

export async function readClips(options, { fetchImpl = fetch } = {}) {
  const videoId = options['video-id'];
  if (typeof videoId !== 'string' || !/^(?:[A-Za-z0-9_-]{11}|(?:tw|kick|local)_[A-Za-z0-9_-]{1,64})$/.test(videoId)) {
    throw new Error('Provide one existing Clips Kitty video ID.');
  }
  const path = `/videos/${videoId}/clips`;
  if (!options['approve-read']) return { provider: 'Clips Kitty', status: 'preview', url: `${engine}${path}`, approval: '--approve-read' };
  const health = await getJson('/health', 8 * 1024, fetchImpl);
  if (health?.ok !== true || health.api_version !== 1 || !/^\d+\.\d+\.\d+(?:[-+.][\w.-]{1,30})?$/.test(health.app_version)) {
    throw new Error('The loopback service did not identify itself as a compatible Clips Kitty API v1 engine.');
  }
  const results = await getJson(path, 1024 * 1024, fetchImpl);
  if (!Array.isArray(results) || results.length > 250) throw new Error('Clips Kitty returned an unexpected or oversized result.');
  const proposals = [];
  for (const clip of results) {
    if (!clip || clip.video_id !== videoId || !Number.isSafeInteger(clip.id) || clip.id < 1 ||
      !Number.isFinite(clip.start_s) || !Number.isFinite(clip.end_s) || clip.start_s < 0 || clip.end_s <= clip.start_s) continue;
    const title = typeof clip.title === 'string' ? clip.title.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 250) : '';
    proposals.push({ clipId: clip.id, title, startSeconds: clip.start_s, endSeconds: clip.end_s, status: 'review-required' });
  }
  return { provider: 'Clips Kitty', status: proposals.length ? 'clip-proposals' : 'no-results-or-unknown-video', version: health.app_version, videoId, proposals };
}
