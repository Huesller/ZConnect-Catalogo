import test from 'node:test';
import assert from 'node:assert/strict';
import offerHandler from '../api/offer.js';

const TEST_SIGNING_SECRET = 'teste-ofertas-zconnect-2026-chave-servidor-123456';

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

test('API gera no servidor e resolve somente uma oferta da geração nova', async () => {
  const previousSecret = process.env.OFFER_SIGNING_SECRET;
  const previousGeneration = process.env.OFFER_LINK_GENERATION;
  const originalFetch = globalThis.fetch;
  let storedToken = '';
  const upstreamCalls = [];

  process.env.OFFER_SIGNING_SECRET = TEST_SIGNING_SECRET;
  process.env.OFFER_LINK_GENERATION = 'teste-reset-1';
  globalThis.fetch = async (url, options = {}) => {
    upstreamCalls.push({ url: String(url), options });
    if (options.method === 'POST') {
      const payload = JSON.parse(options.body);
      storedToken = payload.signedToken;
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => ({ ok: true, token: storedToken }) };
  };

  try {
    const createResponse = responseMock();
    await offerHandler({
      method: 'POST',
      headers: { origin: 'null' },
      body: {
        seller: 'huesller',
        clientName: 'Cliente API',
        discount: 5,
        validityDays: 7
      },
      query: {}
    }, createResponse);

    assert.equal(createResponse.statusCode, 201);
    assert.equal(createResponse.body.ok, true);
    assert.match(createResponse.body.offer.shortCode, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(createResponse.body.offer.clientSlug, 'CLIENTE-API');
    assert.ok(storedToken);

    const resolveResponse = responseMock();
    await offerHandler({
      method: 'GET',
      headers: {},
      query: {
        code: createResponse.body.offer.shortCode,
        clientSlug: createResponse.body.offer.clientSlug
      }
    }, resolveResponse);

    assert.equal(resolveResponse.statusCode, 200);
    assert.equal(resolveResponse.body.offer.clientName, 'Cliente API');
    assert.equal(resolveResponse.body.offer.source, 'signed_short_link_v3');

    process.env.OFFER_LINK_GENERATION = 'teste-reset-2';
    const revokedResponse = responseMock();
    await offerHandler({
      method: 'GET',
      headers: {},
      query: {
        code: createResponse.body.offer.shortCode,
        clientSlug: createResponse.body.offer.clientSlug
      }
    }, revokedResponse);

    assert.equal(revokedResponse.statusCode, 404);
    assert.match(revokedResponse.body.error, /revogada/i);
    assert.equal(upstreamCalls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSecret === undefined) delete process.env.OFFER_SIGNING_SECRET;
    else process.env.OFFER_SIGNING_SECRET = previousSecret;
    if (previousGeneration === undefined) delete process.env.OFFER_LINK_GENERATION;
    else process.env.OFFER_LINK_GENERATION = previousGeneration;
  }
});

test('API rejeita criação vinda de um site externo e não registra oferta', async () => {
  const previousSecret = process.env.OFFER_SIGNING_SECRET;
  const originalFetch = globalThis.fetch;
  let called = false;
  process.env.OFFER_SIGNING_SECRET = TEST_SIGNING_SECRET;
  globalThis.fetch = async () => {
    called = true;
    return { ok: true, json: async () => ({ ok: true }) };
  };

  try {
    const response = responseMock();
    await offerHandler({
      method: 'POST',
      headers: { origin: 'https://site-externo.example' },
      body: { seller: 'huesller', clientName: 'Cliente', discount: 5, validityDays: 7 },
      query: {}
    }, response);

    assert.equal(response.statusCode, 403);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSecret === undefined) delete process.env.OFFER_SIGNING_SECRET;
    else process.env.OFFER_SIGNING_SECRET = previousSecret;
  }
});

test('API não aceita token do mecanismo antigo', async () => {
  const previousSecret = process.env.OFFER_SIGNING_SECRET;
  const originalFetch = globalThis.fetch;
  process.env.OFFER_SIGNING_SECRET = TEST_SIGNING_SECRET;
  const oldPayload = Buffer.from(JSON.stringify({
    v: 2,
    i: 'OF-ANTIGA',
    s: 'huesller',
    c: 'Cliente Antigo',
    d: 5,
    a: 1,
    e: 9999999999
  })).toString('base64url');
  const oldToken = `${oldPayload}.${Buffer.alloc(64, 1).toString('base64url')}`;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, token: oldToken }) });

  try {
    const response = responseMock();
    await offerHandler({
      method: 'GET',
      headers: {},
      query: { code: '7K2M9QPX', clientSlug: 'CLIENTE-ANTIGO' }
    }, response);

    assert.equal(response.statusCode, 404);
    assert.match(response.body.error, /antiga|revogada/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSecret === undefined) delete process.env.OFFER_SIGNING_SECRET;
    else process.env.OFFER_SIGNING_SECRET = previousSecret;
  }
});
