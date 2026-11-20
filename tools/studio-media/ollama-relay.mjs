import * as NodeEvents from 'node:events';
import * as NodeHttp from 'node:http';
import * as NodePath from 'node:path';
import * as NodeURL from 'node:url';
import * as NodeUtil from 'node:util';

const loopback = '127.0.0.1';
const desktopOrigin = 'open-product-studio://app';
const qualifiedVersion = '0.9.3';
const routes = new Map([
  ['/api/tags', 'GET'], ['/api/version', 'GET'], ['/api/ps', 'GET'],
  ['/api/show', 'POST'], ['/api/chat', 'POST'],
]);
const requestLimit = 256 * 1024;
const responseLimit = 1024 * 1024;
const digest = /^[a-f0-9]{64}$/;

class RelayError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
  }
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fields(value, keys) {
  return record(value) && Object.keys(value).every(key => keys.includes(key));
}

function integer(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function validOrigin(origin) {
  if (origin === desktopOrigin || origin === 'open-product-studio-dev://app') return true;
  const local = typeof origin === 'string' && /^http:\/\/(?:127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/.exec(origin);
  return !!local && integer(Number(local[1]), 1, 65535);
}

function modelName(value) {
  return typeof value === 'string' && value.length <= 180 &&
    /^(?:[\w.-]+\/){0,2}[\w.-]+:[\w.-]+$/.test(value) && !value.includes('..') &&
    !/(?:^|[/:._-])cloud(?:$|[/:._-])/i.test(value);
}

function localIdentity(value) {
  return record(value) && modelName(value.name) && typeof value.digest === 'string' && digest.test(value.digest) &&
    !value.remote_host && !value.remote_model;
}

function qualities(value) {
  const level = value?.details?.quantization_level;
  return typeof level === 'string' && /^[\w.-]{1,40}$/.test(level) ? { quantization_level: level } : undefined;
}

function modelList(value, inventory) {
  if (!Array.isArray(value?.models) || value.models.length > 512) throw new RelayError(502, 'Invalid local model inventory.');
  return value.models.filter(localIdentity).flatMap(item => {
    if (!inventory) return [{ name: item.name, digest: item.digest }];
    const details = qualities(item);
    return details ? [{ name: item.name, digest: item.digest, details }] : [];
  });
}

function propertyName(key) {
  return key.length <= 64 && /^[a-zA-Z][\w-]*(?:\.[a-zA-Z][\w-]*)*$/.test(key) &&
    key.split('.').every(part => !['constructor', 'prototype'].includes(part));
}

function schemaNode(value, depth = 0) {
  if (!record(value) || depth > 7) return false;
  if (value.type === 'object') {
    if (!fields(value, ['type', 'properties', 'required', 'additionalProperties']) || !record(value.properties) ||
        value.additionalProperties !== false || !Array.isArray(value.required)) return false;
    const keys = Object.keys(value.properties);
    return keys.length <= 32 && value.required.length <= keys.length && value.required.every(key => keys.includes(key)) &&
      keys.every(key => propertyName(key) && schemaNode(value.properties[key], depth + 1));
  }
  if (value.type === 'array') {
    return fields(value, ['type', 'items', 'minItems', 'maxItems']) &&
      (value.minItems === undefined || integer(value.minItems, 0, 32)) &&
      (value.maxItems === undefined || integer(value.maxItems, value.minItems ?? 0, 32)) &&
      schemaNode(value.items, depth + 1);
  }
  if (value.type === 'string') {
    return fields(value, ['type', 'enum', 'minLength', 'maxLength']) &&
      (value.minLength === undefined || integer(value.minLength, 0, 32_000)) &&
      (value.maxLength === undefined || integer(value.maxLength, value.minLength ?? 0, 32_000)) &&
      (value.enum === undefined || (Array.isArray(value.enum) && value.enum.length > 0 && value.enum.length <= 60 &&
        value.enum.every(item => typeof item === 'string' && item.length <= 180)));
  }
  return ['number', 'integer', 'boolean', 'null'].includes(value.type) && fields(value, ['type']);
}

function validateBody(path, value) {
  if (path === '/api/show') {
    if (fields(value, ['model']) && modelName(value.model)) return value;
  } else if (fields(value, ['model', 'stream', 'messages', 'format', 'options', 'keep_alive']) &&
      modelName(value.model) && value.stream === false && Array.isArray(value.messages) && value.messages.length <= 12 &&
      value.messages.every(message => fields(message, ['role', 'content']) &&
        ['user', 'assistant', 'system'].includes(message.role) && typeof message.content === 'string' && message.content.length <= 32_000) &&
      (value.format === undefined || value.format === 'json' || schemaNode(value.format)) &&
      (value.options === undefined || (fields(value.options, ['temperature', 'num_predict']) &&
        (value.options.temperature === undefined || (Number.isFinite(value.options.temperature) && value.options.temperature >= 0 && value.options.temperature <= 1)) &&
        (value.options.num_predict === undefined || integer(value.options.num_predict, 1, 2048)))) &&
      (value.keep_alive === undefined || value.keep_alive === '2m') &&
      (value.messages.length > 0 || (value.keep_alive === '2m' && value.format === undefined && value.options === undefined))) {
    return value.messages.length ? { ...value, options: { num_predict: 1800, ...value.options }, keep_alive: '2m' } : value;
  }
  throw new RelayError(400, 'Unsupported Ollama request.');
}

async function readJson(message, limit, invalidStatus, overflowStatus) {
  if (Number(message.headers['content-length']) > limit) throw new RelayError(overflowStatus, 'Ollama message is too large.');
  const chunks = [];
  let size = 0;
  for await (const chunk of message.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) throw new RelayError(overflowStatus, 'Ollama message is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)));
  } catch (error) {
    throw new RelayError(invalidStatus, 'Invalid Ollama JSON.', { cause: error });
  }
}

function upstreamJson(port, path, signal, body) {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const headers = serialized ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(serialized) } : {};
    const request = NodeHttp.request({ hostname: loopback, port, path, method: routes.get(path), agent: false, signal, headers }, response => {
      if (response.statusCode !== 200 || !/^application\/json(?:\s*;|$)/i.test(response.headers['content-type'] ?? '')) {
        response.destroy();
        reject(new RelayError(502, 'The local Ollama request failed.'));
        return;
      }
      readJson(response, responseLimit, 502, 502).then(resolve, error => {
        response.destroy();
        reject(error);
      });
    });
    request.once('error', reject);
    request.end(serialized);
  });
}

async function relayJson(port, path, signal, body) {
  const metadataSignal = () => AbortSignal.any([signal, AbortSignal.timeout(5000)]);
  const { version } = await upstreamJson(port, '/api/version', metadataSignal()) ?? {};
  if (version !== qualifiedVersion) throw new RelayError(502, 'The relay requires Ollama 0.9.3 on its selected port.');
  if (path === '/api/version') return { version };
  if (path === '/api/tags' || path === '/api/ps') {
    return { models: modelList(await upstreamJson(port, path, metadataSignal()), path === '/api/tags') };
  }
  const models = modelList(await upstreamJson(port, '/api/tags', metadataSignal()), true);
  if (models.filter(item => item.name === body.model).length !== 1) throw new RelayError(403, 'Choose an installed local model.');
  const value = await upstreamJson(port, path, path === '/api/chat' ? signal : metadataSignal(), body);
  if (path === '/api/show') {
    const details = qualities(value);
    if (!details || value.remote_host || value.remote_model) throw new RelayError(502, 'Unable to verify the installed local model.');
    const capabilities = Array.isArray(value.capabilities) ? value.capabilities.filter(x => typeof x === 'string' && /^[\w-]{1,40}$/.test(x)).slice(0, 20) : [];
    return { details, capabilities };
  }
  const preload = !body.messages.length && value?.done_reason === 'load';
  const message = value?.message ?? (preload ? { role: 'assistant', content: '' } : undefined);
  if (value?.model !== body.model || value.done !== true || value.remote_host || value.remote_model ||
      (value.done_reason !== undefined && !['stop', 'length', 'load'].includes(value.done_reason)) ||
      message?.role !== 'assistant' || typeof message.content !== 'string' || message.content.length > 12_000 ||
      (message.tool_calls && (!Array.isArray(message.tool_calls) || message.tool_calls.length))) {
    throw new RelayError(502, 'Unexpected response from the installed model.');
  }
  return { model: value.model, done: true, done_reason: value.done_reason, message: { role: 'assistant', content: message.content } };
}

function send(response, status, body) {
  if (response.destroyed) return;
  if (status >= 400) response.setHeader('Connection', 'close');
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

export async function startOllamaRelay({ port, ollamaPort, origin = desktopOrigin }) {
  if (!integer(port, 0, 65535) || !integer(ollamaPort, 1, 65535)) throw new Error('Choose valid loopback ports.');
  if (port === ollamaPort) throw new Error('The relay and Ollama must use different ports.');
  if (!validOrigin(origin)) throw new Error('Choose an exact Studio origin or an explicit HTTP loopback origin.');
  const arrivals = [];
  let active = 0;
  let chatting = false;
  const server = NodeHttp.createServer({ maxHeaderSize: 8192, headersTimeout: 5000, requestTimeout: 8000, connectionsCheckingInterval: 1000 },
    async (request, response) => {
      if (request.headersDistinct.host?.length !== 1 || request.headers.host !== `${loopback}:${server.address().port}` ||
          request.headersDistinct.origin?.length !== 1 || request.headers.origin !== origin) {
        send(response, 403, { error: 'This relay accepts requests from its configured Studio origin.' });
        return;
      }
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      const path = request.url;
      const method = routes.get(path);
      if (!method) return send(response, 404, { error: 'Unknown Ollama relay route.' });
      if (request.method === 'OPTIONS') {
        const headers = request.headers['access-control-request-headers']?.toLowerCase().trim();
        if (request.headers['access-control-request-method'] !== method || (headers && (method !== 'POST' || headers !== 'content-type'))) {
          return send(response, 403, { error: 'Unsupported Ollama preflight.' });
        }
        response.setHeader('Access-Control-Allow-Methods', method);
        if (method === 'POST') response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (request.headers['access-control-request-private-network'] === 'true') response.setHeader('Access-Control-Allow-Private-Network', 'true');
        return send(response, 204);
      }
      if (request.method !== method) return send(response, 405, { error: 'Unsupported method.' });
      const chat = path === '/api/chat';
      const now = Date.now();
      while (arrivals.length && arrivals[0] < now - 60_000) arrivals.shift();
      if (active >= 4 || (chat && chatting) || arrivals.length >= 60) return send(response, 429, { error: 'The local model relay is busy.' });
      arrivals.push(now);
      active++;
      if (chat) chatting = true;
      const controller = new AbortController();
      response.once('close', () => controller.abort());
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(140_000)]);
      try {
        let body;
        if (method === 'POST') {
          if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '') || request.headers['content-encoding']) {
            throw new RelayError(415, 'Send plain UTF-8 Ollama JSON.');
          }
          const timer = setTimeout(() => request.destroy(), 8000);
          try { body = validateBody(path, await readJson(request, requestLimit, 400, 413)); }
          finally { clearTimeout(timer); }
        } else if ((Number(request.headers['content-length']) || 0) !== 0 || request.headers['transfer-encoding']) {
          throw new RelayError(400, 'This read route does not accept a request body.');
        }
        send(response, 200, await relayJson(ollamaPort, path, signal, body));
      } catch (error) {
        if (error instanceof RelayError) send(response, error.status, { error: error.message });
        else send(response, signal.aborted ? 504 : 502, { error: 'The local Ollama connection failed or timed out.' });
      } finally {
        active--;
        if (chat) chatting = false;
      }
    });
  server.maxConnections = 16;
  server.on('upgrade', (_request, socket) => socket.destroy());
  server.on('connect', (_request, socket) => socket.destroy());
  server.on('checkContinue', (_request, response) => send(response, 417, { error: 'Unsupported HTTP expectation.' }));
  server.listen(port, loopback);
  await NodeEvents.once(server, 'listening');
  return {
    endpoint: `http://${loopback}:${server.address().port}`,
    close() {
      return new Promise(resolve => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    },
  };
}

async function main(args) {
  const { values, tokens } = NodeUtil.parseArgs({ args, tokens: true, options: {
    port: { type: 'string', default: '11435' }, 'ollama-port': { type: 'string', default: '11434' },
    origin: { type: 'string', default: desktopOrigin }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('node tools/studio-media/ollama-relay.mjs [--port 11435] [--ollama-port 11434] [--origin open-product-studio://app]');
    return;
  }
  if (new Set(tokens.map(token => token.name)).size !== tokens.length ||
      !/^[1-9][0-9]{0,4}$/.test(values.port) || !/^[1-9][0-9]{0,4}$/.test(values['ollama-port'])) throw new Error('Use one value per option and valid numeric ports.');
  const relay = await startOllamaRelay({ port: Number(values.port), ollamaPort: Number(values['ollama-port']), origin: values.origin });
  console.log(`Studio Ollama relay at ${relay.endpoint} for ${values.origin}.`);
  process.once('SIGINT', () => { void relay.close(); });
  process.once('SIGTERM', () => { void relay.close(); });
}

if (process.argv[1] && NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
