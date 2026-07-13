import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import offerHandler from '../api/offer.js';

function panelPrivateKey() {
  const html = fs.readFileSync(new URL('../PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html', import.meta.url), 'utf8');
  const read = (name) => html.match(new RegExp(`\\n\\s*${name}: '([^']+)'`))?.[1] || '';
  return { key_ops: ['sign'], ext: true, kty: 'EC', x: read('x'), y: read('y'), crv: read('crv'), d: read('d') };
}

async function signedToken() {
  const now = Date.now();
  const payload = {
    v: 2,
    i: 'OF-API-TESTE',
    s: 'huesller',
    c: 'Cliente API',
    d: 5,
    a: Math.floor(now / 1000),
    e: Math.floor((now + 86400000) / 1000)
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await webcrypto.subtle.importKey('jwk', panelPrivateKey(), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(encoded));
  return `${encoded}.${Buffer.from(signature).toString('base64url')}`;
}

function responseMock() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

test('API aceita cadastro e resolução apenas de token assinado válido', async () => {
  const token = await signedToken();
  const originalFetch = globalThis.fetch;
  const upstreamCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    upstreamCalls.push({ url: String(url), options });
    if (options.method === 'POST') return { ok: true, json: async () => ({ ok: true }) };
    return { ok: true, json: async () => ({ ok: true, token }) };
  };

  try {
    const createResponse = responseMock();
    await offerHandler({
      method: 'POST',
      headers: { origin: 'null' },
      body: { shortCode: '7K2M9QPX', clientSlug: 'CLIENTE-API', signedToken: token },
      query: {}
    }, createResponse);
    assert.equal(createResponse.statusCode, 201);
    assert.equal(createResponse.body.ok, true);

    const resolveResponse = responseMock();
    await offerHandler({ method: 'GET', headers: {}, query: { code: '7K2M9QPX' } }, resolveResponse);
    assert.equal(resolveResponse.statusCode, 200);
    assert.equal(resolveResponse.body.token, token);
    assert.equal(upstreamCalls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
