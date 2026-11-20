import * as NodeAssert from 'node:assert/strict';
import * as NodeEvents from 'node:events';
import * as NodeHttp from 'node:http';
import * as NodeTest from 'node:test';
import { startOllamaRelay } from './ollama-relay.mjs';

const origin = 'open-product-studio://app';
const model = 'qwen2.5:0.5b';
const digest = 'a'.repeat(64);
const modelEntry = { name: model, digest, details: { quantization_level: 'Q4_K_M' } };
const textChat = {
  model, stream: false, messages: [{ role: 'user', content: 'Give the demo a title.' }],
  format: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false },
  options: { temperature: 0.2, num_predict: 1800 }, keep_alive: '2m',
};

// Mirrors the generated affiliate fieldReplySchema in builderOllama.ts.
const affiliateKeys = ['affiliate.title', 'affiliate.intro'];
const affiliateReply = {
  type: 'object', required: ['summary', 'nextStep', 'fields'], additionalProperties: false,
  properties: {
    summary: { type: 'string', minLength: 5, maxLength: 1000 },
    nextStep: { type: 'string', minLength: 5, maxLength: 1000 },
    fields: { type: 'object', required: affiliateKeys, additionalProperties: false,
      properties: Object.fromEntries(affiliateKeys.map(key => [key, { type: 'string' }])) },
  },
};

async function fixture(t, overrides = {}) {
  const calls = [];
  const upstream = NodeHttp.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const call = { path: request.url, headers: request.headers, body: chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined };
    calls.push(call);
    const value = {
      '/api/version': { version: overrides.version ?? '0.9.3' },
      '/api/tags': { models: overrides.models ?? [modelEntry, { ...modelEntry, name: 'cloud:latest', remote_host: 'https://example.invalid' }] },
      '/api/ps': { models: [modelEntry] },
      '/api/show': { ...modelEntry, modelfile: 'private path', capabilities: ['completion'] },
      '/api/chat': { model, done: true, done_reason: call.body?.messages?.length ? 'stop' : 'load', message: { role: 'assistant', content: call.body?.messages?.length ? 'Example' : '' } },
    }[call.path];
    if (overrides.handle?.(call, response)) return;
    response.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'private=test' });
    response.end(JSON.stringify(value));
  });
  upstream.listen(0, '127.0.0.1');
  await NodeEvents.once(upstream, 'listening');
  t.after(() => { upstream.close(); upstream.closeAllConnections(); });
  const ollamaPort = upstream.address().port;
  const relay = await startOllamaRelay({ port: 0, ollamaPort, origin: overrides.origin ?? origin });
  t.after(() => relay.close());
  const call = (path, options = {}) => fetch(relay.endpoint + path, {
    ...options, headers: { Origin: overrides.origin ?? origin, ...options.headers },
  });
  const post = (path, body, headers = {}) => call(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  return { calls, call, post, relay, ollamaPort };
}

NodeTest.test('an exact desktop origin discovers, preflights, drafts, and warms an installed model', async t => {
  const f = await fixture(t);
  const inventory = await f.call('/api/tags');
  NodeAssert.deepEqual(await inventory.json(), { models: [modelEntry] });
  NodeAssert.equal(inventory.headers.get('access-control-allow-origin'), origin);
  NodeAssert.equal(inventory.headers.get('set-cookie'), null);
  const cors = await f.call('/api/chat', { method: 'OPTIONS', headers: {
    'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type',
    'Access-Control-Request-Private-Network': 'true',
  } });
  NodeAssert.equal(cors.status, 204);
  NodeAssert.equal(cors.headers.get('access-control-allow-private-network'), 'true');
  const show = await f.post('/api/show', { model });
  NodeAssert.deepEqual(await show.json(), { details: modelEntry.details, capabilities: ['completion'] });
  const chat = await f.post('/api/chat', textChat, { Authorization: 'fixture', Cookie: 'fixture', Referer: 'https://example.invalid/' });
  NodeAssert.equal(chat.status, 200);
  NodeAssert.equal((await chat.json()).message.content, 'Example');
  const loaded = await f.post('/api/chat', { model, stream: false, messages: [], keep_alive: '2m' });
  NodeAssert.equal(loaded.status, 200);
  NodeAssert.equal((await loaded.json()).done_reason, 'load');
  NodeAssert.deepEqual((await (await f.call('/api/ps')).json()).models, [{ name: model, digest }]);
  NodeAssert.deepEqual(f.calls.find(item => item.path === '/api/chat').body, textChat);
  for (const { headers } of f.calls) {
    NodeAssert.equal(headers.origin, undefined);
    NodeAssert.equal(headers.authorization, undefined);
    NodeAssert.equal(headers.cookie, undefined);
    NodeAssert.equal(headers.referer, undefined);
  }
});

NodeTest.test('the relay refuses other origins, forged Host, URL variants, methods and arbitrary paths', async t => {
  const f = await fixture(t);
  NodeAssert.equal((await fetch(f.relay.endpoint + '/api/tags')).status, 403);
  const hostile = await f.call('/api/tags', { headers: { Origin: 'https://example.invalid' } });
  NodeAssert.equal(hostile.status, 403);
  NodeAssert.equal(hostile.headers.has('access-control-allow-origin'), false);
  const forged = await new Promise((resolve, reject) => {
    const req = NodeHttp.get(f.relay.endpoint + '/api/tags', { headers: { Host: 'example.invalid', Origin: origin } }, resolve);
    req.on('error', reject);
  });
  NodeAssert.equal(forged.statusCode, 403);
  forged.resume();
  NodeAssert.equal((await f.call('/api/tags?anything')).status, 404);
  NodeAssert.equal((await f.post('/api/pull', { model })).status, 404);
  NodeAssert.equal((await f.call('/api/chat')).status, 405);
  NodeAssert.equal((await f.call('/api/chat', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'GET' } })).status, 403);
  NodeAssert.equal(f.calls.length, 0);
});

NodeTest.test('the generated Affiliate reply schema preserves length constraints and literal dotted fields', async t => {
  const f = await fixture(t);
  const accepted = await f.post('/api/chat', { ...textChat, format: affiliateReply });
  NodeAssert.equal(accepted.status, 200);
  NodeAssert.deepEqual(f.calls.find(item => item.path === '/api/chat').body.format, affiliateReply);

  for (const bad of [
    { type: 'string', minLength: 10, maxLength: 9 }, { type: 'string', maxLength: 32_001 },
    { type: 'string', minLength: 0.25 },
    { type: 'object', required: ['affiliate.constructor'], additionalProperties: false,
      properties: { 'affiliate.constructor': { type: 'string' } } },
  ]) {
    NodeAssert.equal((await f.post('/api/chat', { ...textChat, format: bad })).status, 400);
  }
});

NodeTest.test('the relay rejects tool calls, attachments, streaming, remote model aliases and oversized input', async t => {
  const f = await fixture(t);
  for (const change of [
    { tools: [] }, { functions: [] }, { messages: [{ role: 'user', content: 'x', images: ['x'] }] },
    { messages: [{ role: 'tool', content: 'x' }] }, { format: { $ref: 'https://example.invalid/schema' } },
    { stream: true }, { options: { num_predict: -1 } }, { keep_alive: -1 },
  ]) {
    NodeAssert.equal((await f.post('/api/chat', { ...textChat, ...change })).status, 400);
  }
  NodeAssert.equal((await f.post('/api/chat', { ...textChat, model: 'missing:latest' })).status, 403);
  NodeAssert.equal((await f.post('/api/chat', { ...textChat, model: 'cloud:latest' })).status, 400);
  NodeAssert.equal((await f.post('/api/chat', { ...textChat, messages: [{ role: 'user', content: 'x'.repeat(300_000) }] })).status, 413);
  NodeAssert.ok(f.calls.every(item => item.path !== '/api/chat'));
});

NodeTest.test('an explicit local web origin works with the qualified version and rejects other upstreams', async t => {
  const qualified = await fixture(t, { origin: 'http://127.0.0.1:3773' });
  const local = await qualified.call('/api/version');
  NodeAssert.equal(local.status, 200);
  NodeAssert.equal(local.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3773');
  const f = await fixture(t, { origin: 'http://127.0.0.1:3773', version: '0.40.0' });
  NodeAssert.equal((await f.call('/api/version')).status, 502);
  NodeAssert.equal((await f.post('/api/chat', textChat)).status, 502);
  NodeAssert.ok(f.calls.every(item => item.path === '/api/version'));
  await NodeAssert.rejects(startOllamaRelay({ port: f.ollamaPort, ollamaPort: f.ollamaPort }), /different/);
  await NodeAssert.rejects(startOllamaRelay({ port: 0, ollamaPort: f.ollamaPort, origin: 'https://example.invalid' }), /origin/i);
});

NodeTest.test('an active chat caps concurrency and disconnecting Studio closes its upstream request', async t => {
  const entered = Promise.withResolvers();
  const closed = Promise.withResolvers();
  const f = await fixture(t, { handle(call, response) {
    if (call.path !== '/api/chat') return false;
    response.once('close', closed.resolve);
    entered.resolve();
    return true;
  } });
  const owner = new AbortController();
  const pending = f.call('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(textChat), signal: owner.signal,
  });
  const stopped = NodeAssert.rejects(pending, { name: 'AbortError' });
  try {
    await entered.promise;
    NodeAssert.equal((await f.post('/api/chat', textChat)).status, 429);
  } finally {
    owner.abort();
  }
  await stopped;
  await closed.promise;
  NodeAssert.equal(f.calls.filter(call => call.path === '/api/chat').length, 1);
});

NodeTest.test('the rate budget bounds upstream forwarding', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 60; i++) {
    const result = await f.call('/api/version');
    NodeAssert.equal(result.status, 200);
    await result.arrayBuffer();
  }
  NodeAssert.equal((await f.call('/api/version')).status, 429);
  NodeAssert.equal(f.calls.length, 60);
});

NodeTest.test('the relay drops an oversized upstream response and omits upstream headers', async t => {
  const f = await fixture(t, { handle(call, response) {
    if (call.path !== '/api/tags') return false;
    response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': 2 ** 21, 'X-Private': 'fixture' });
    response.end();
    return true;
  } });
  const result = await f.call('/api/tags');
  NodeAssert.equal(result.status, 502);
  NodeAssert.equal(result.headers.has('x-private'), false);
  NodeAssert.deepEqual(await result.json(), { error: 'Ollama message is too large.' });
});
