import { responseBytes } from './shared.mjs';

const licenses = ['cc0', 'pdm', 'by'];

function displayText(value, maxLength = 1024) {
  return typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, maxLength) : '';
}

function sourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
}

export async function searchOpenverse(options, { fetchImpl = fetch } = {}) {
  const kind = options.type ?? 'image';
  if (kind !== 'image' && kind !== 'audio') throw new Error('Openverse type must be image or audio.');
  const query = displayText(options.query, 161);
  if (!query || query.length > 160) throw new Error('Use 1–160 characters for the Openverse search.');
  const url = new URL(kind === 'image' ? '/v1/images/' : '/v1/audio/', 'https://api.openverse.org');
  url.search = new URLSearchParams({ q: query, page_size: '8', license: licenses.join(',') });
  if (!options['approve-network']) return { provider: 'Openverse', status: 'preview', url: url.href, approval: '--approve-network' };
  let response;
  try {
    response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { accept: 'application/json' } });
  } catch {
    throw new Error('Could not reach the Openverse API.');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`The Openverse API returned HTTP ${response.status}. Try the Openverse website or a licensed local asset.`);
  }
  const data = JSON.parse((await responseBytes(response, 512 * 1024)).toString('utf8'));
  if (!Array.isArray(data?.results) || data.results.length > 8) throw new Error('Openverse returned an unexpected search response.');
  const candidates = [];
  for (const item of data.results) {
    if (!item || !licenses.includes(item.license) || item.mature === true) continue;
    const source = sourceUrl(item.foreign_landing_url);
    const license = sourceUrl(item.license_url);
    if (!source || !license) continue;
    const candidate = {
      id: displayText(item.id, 100), title: displayText(item.title), creator: displayText(item.creator),
      license: item.license, licenseVersion: displayText(item.license_version, 32), licenseUrl: license,
      sourceUrl: source, attribution: displayText(item.attribution), rightsStatus: 'review-required',
    };
    if (candidate.id) candidates.push(candidate);
  }
  return { provider: 'Openverse', status: 'search-results', kind, query, candidates };
}
