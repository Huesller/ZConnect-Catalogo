import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import {
  OFFER_PUBLIC_KEY_JWK,
  verifySignedOfferToken
} from '../src/utils/signedOffer.js';

function readPanelPrivateKey() {
  const html = fs.readFileSync(new URL('../PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html', import.meta.url), 'utf8');
  const read = (name) => html.match(new RegExp(`\\n\\s*${name}: '([^']+)'`))?.[1] || '';

  return {
    key_ops: ['sign'],
    ext: true,
    kty: 'EC',
    x: read('x'),
    y: read('y'),
    crv: read('crv'),
    d: read('d')
  };
}

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

test('painel local assina tokens aceitos pela chave pública do catálogo', async () => {
  const now = Date.UTC(2026, 6, 13, 12, 0, 0);
  const payload = {
    v: 2,
    i: 'OF-INTEGRACAO',
    s: 'huesller',
    c: 'Cliente de Integração',
    d: 5,
    a: Math.floor(now / 1000),
    e: Math.floor((now + 24 * 60 * 60 * 1000) / 1000)
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const privateKey = await webcrypto.subtle.importKey(
    'jwk',
    readPanelPrivateKey(),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(encodedPayload)
  );
  const token = `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
  const offer = await verifySignedOfferToken(token, {
    cryptoApi: webcrypto,
    publicJwk: OFFER_PUBLIC_KEY_JWK,
    now
  });

  assert.equal(offer?.active, true);
  assert.equal(offer?.id, 'OF-INTEGRACAO');
  assert.equal(offer?.discount, 5);
});
