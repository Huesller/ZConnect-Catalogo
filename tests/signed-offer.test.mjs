import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { verifySignedOfferToken } from '../src/utils/signedOffer.js';

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function createFixture() {
  const keys = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const now = Date.UTC(2026, 6, 13, 12, 0, 0);
  const payload = {
    v: 2,
    i: 'OFERTA123',
    s: 'ivoney',
    c: 'Auto Peças Silva',
    d: 5,
    a: Math.floor(now / 1000),
    e: Math.floor((now + 7 * 24 * 60 * 60 * 1000) / 1000)
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    new TextEncoder().encode(encodedPayload)
  );

  return {
    now,
    token: `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`,
    publicJwk: await webcrypto.subtle.exportKey('jwk', keys.publicKey)
  };
}

test('valida oferta assinada e normaliza Ivoney para Ney', async () => {
  const fixture = await createFixture();
  const offer = await verifySignedOfferToken(fixture.token, {
    cryptoApi: webcrypto,
    publicJwk: fixture.publicJwk,
    now: fixture.now
  });

  assert.equal(offer.active, true);
  assert.equal(offer.seller, 'ney');
  assert.equal(offer.clientName, 'Auto Peças Silva');
  assert.equal(offer.discount, 5);
  assert.equal(offer.signed, true);
});

test('rejeita qualquer alteração no conteúdo do token', async () => {
  const fixture = await createFixture();
  const [payload, signature] = fixture.token.split('.');
  const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}`;
  const offer = await verifySignedOfferToken(`${tamperedPayload}.${signature}`, {
    cryptoApi: webcrypto,
    publicJwk: fixture.publicJwk,
    now: fixture.now
  });

  assert.equal(offer, null);
});

test('mantém a assinatura válida, mas marca a oferta vencida', async () => {
  const fixture = await createFixture();
  const offer = await verifySignedOfferToken(fixture.token, {
    cryptoApi: webcrypto,
    publicJwk: fixture.publicJwk,
    now: fixture.now + 8 * 24 * 60 * 60 * 1000
  });

  assert.equal(offer.active, false);
  assert.equal(offer.expired, true);
});
