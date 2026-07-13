export const SIGNED_OFFER_QUERY_KEY = 's';
export const SHORT_OFFER_PATH_PREFIX = 'o';
export const SHORT_OFFER_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export const OFFER_PUBLIC_KEY_JWK = Object.freeze({
  key_ops: ['verify'],
  ext: true,
  kty: 'EC',
  x: 'ZO1Zs56p0ajqfCIpZ6gEa7ckQ5Hqzr1qlp9iNz5kc4M',
  y: 'BVoESZjC1ShNIKiqZUpc_rS1Ivh_VgdPmMVONJtvMf4',
  crv: 'P-256'
});

const ALLOWED_SELLERS = new Set(['huesller', 'ney', 'francisco', 'representante']);

function base64UrlToBytes(value) {
  const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(padded, 'base64'));
  }

  throw new Error('Decodificador base64 indisponível.');
}

function decodePayload(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

function canonicalSeller(value) {
  const seller = String(value || '').trim().toLowerCase();
  return seller === 'ivoney' ? 'ney' : seller;
}

function formatExpiresLabel(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function normalizeVerifiedPayload(payload, now) {
  if (!payload || Number(payload.v) !== 2) return null;

  const id = String(payload.i || '').trim();
  const seller = canonicalSeller(payload.s);
  const clientName = String(payload.c || '').trim().replace(/\s+/g, ' ');
  const discount = Number(payload.d);
  const expiresAtMs = Number(payload.e) * 1000;
  const createdAtMs = Number(payload.a || 0) * 1000;

  if (!id || !ALLOWED_SELLERS.has(seller) || !clientName) return null;
  if (!Number.isFinite(discount) || discount <= 0 || discount > 95) return null;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) return null;
  if (createdAtMs && expiresAtMs <= createdAtMs) return null;
  if (createdAtMs && expiresAtMs - createdAtMs > 31 * 24 * 60 * 60 * 1000) return null;

  const expired = now > expiresAtMs;

  return {
    active: !expired,
    expired,
    signed: true,
    id,
    seller,
    clientName,
    discount,
    factor: Math.max(0.05, Math.min(0.9999, (100 - discount) / 100)),
    mode: 'discount',
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : '',
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresLabel: formatExpiresLabel(expiresAtMs),
    source: 'signed_local_panel_v2'
  };
}

export function getSignedOfferTokenFromUrl(search = window.location.search) {
  return new URLSearchParams(search).get(SIGNED_OFFER_QUERY_KEY) || '';
}

export function getShortOfferReferenceFromUrl(pathname = window.location.pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts.length !== 3 || parts[0].toLowerCase() !== SHORT_OFFER_PATH_PREFIX) return null;

  const clientSlug = decodeURIComponent(parts[1] || '').trim().toUpperCase();
  const code = decodeURIComponent(parts[2] || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{0,39}$/.test(clientSlug) || !SHORT_OFFER_CODE_PATTERN.test(code)) return null;
  return { clientSlug, code };
}

export async function resolveShortOfferToken(reference, options = {}) {
  if (!reference?.code || !SHORT_OFFER_CODE_PATTERN.test(reference.code)) return '';

  const fetchApi = options.fetchApi || globalThis.fetch;
  if (typeof fetchApi !== 'function') return '';

  try {
    const endpoint = options.endpoint || '/api/offer';
    const url = new URL(endpoint, options.baseUrl || globalThis.location?.origin || 'https://localhost');
    url.searchParams.set('code', reference.code);
    const response = await fetchApi(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) return '';
    const result = await response.json();
    return result?.ok && typeof result.token === 'string' ? result.token : '';
  } catch {
    return '';
  }
}

export async function verifySignedOfferToken(token, options = {}) {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const cryptoApi = options.cryptoApi || globalThis.crypto;
  if (!cryptoApi?.subtle) return null;

  try {
    const publicKey = await cryptoApi.subtle.importKey(
      'jwk',
      options.publicJwk || OFFER_PUBLIC_KEY_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const verified = await cryptoApi.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      base64UrlToBytes(parts[1]),
      new TextEncoder().encode(parts[0])
    );

    if (!verified) return null;
    return normalizeVerifiedPayload(decodePayload(parts[0]), Number(options.now ?? Date.now()));
  } catch {
    return null;
  }
}
