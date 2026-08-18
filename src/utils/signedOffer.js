export const SHORT_OFFER_PATH_PREFIX = 'oferta';
export const SHORT_OFFER_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

const ALLOWED_SELLERS = new Set(['huesller', 'ney', 'almir', 'gabriel', 'junior', 'francisco', 'representante']);

function canonicalSeller(value) {
  const seller = String(value || '').trim().toLowerCase();
  return seller === 'ivoney' ? 'ney' : seller;
}

function normalizeResolvedOffer(value, now) {
  if (!value || value.signed !== true) return null;

  const id = String(value.id || '').trim();
  const seller = canonicalSeller(value.seller);
  const clientName = String(value.clientName || '').trim().replace(/\s+/g, ' ');
  const discount = Number(value.discount);
  const createdAtMs = Date.parse(value.createdAt || '');
  const permanent = value.permanent === true;
  const expiresAtMs = permanent ? null : Date.parse(value.expiresAt || '');
  const shortCode = String(value.shortCode || '').trim().toUpperCase();
  const clientSlug = String(value.clientSlug || '').trim().toUpperCase();

  if (!id || !ALLOWED_SELLERS.has(seller) || !clientName) return null;
  if (!Number.isFinite(discount) || discount <= 0 || discount > 95) return null;
  if (!Number.isFinite(createdAtMs)) return null;
  if (!permanent && (!Number.isFinite(expiresAtMs) || expiresAtMs <= createdAtMs)) return null;
  if (!SHORT_OFFER_CODE_PATTERN.test(shortCode) || !/^[A-Z0-9][A-Z0-9-]{0,39}$/.test(clientSlug)) return null;

  const expired = permanent ? false : now > expiresAtMs;
  return {
    active: !expired,
    expired,
    signed: true,
    id,
    seller,
    clientName,
    discount,
    factor: Math.max(0.05, Math.min(0.9999, Number(value.factor) || (100 - discount) / 100)),
    mode: 'discount',
    permanent,
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: permanent ? '' : new Date(expiresAtMs).toISOString(),
    expiresLabel: permanent ? 'Sem vencimento automático' : String(value.expiresLabel || ''),
    shortCode,
    clientSlug,
    source: 'signed_short_link_v3'
  };
}

export function getShortOfferReferenceFromUrl(pathname = window.location.pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts.length !== 3 || parts[0].toLowerCase() !== SHORT_OFFER_PATH_PREFIX) return null;

  const clientSlug = decodeURIComponent(parts[1] || '').trim().toUpperCase();
  const code = decodeURIComponent(parts[2] || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{0,39}$/.test(clientSlug) || !SHORT_OFFER_CODE_PATTERN.test(code)) return null;
  return { clientSlug, code };
}

export async function resolveShortOffer(reference, options = {}) {
  if (!reference?.code || !SHORT_OFFER_CODE_PATTERN.test(reference.code)) return null;
  if (!/^[A-Z0-9][A-Z0-9-]{0,39}$/.test(String(reference.clientSlug || ''))) return null;

  const fetchApi = options.fetchApi || globalThis.fetch;
  if (typeof fetchApi !== 'function') return null;

  try {
    const endpoint = options.endpoint || '/api/offer';
    const url = new URL(endpoint, options.baseUrl || globalThis.location?.origin || 'https://localhost');
    url.searchParams.set('code', reference.code);
    url.searchParams.set('clientSlug', reference.clientSlug);
    const response = await fetchApi(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const result = await response.json();
    return result?.ok ? normalizeResolvedOffer(result.offer, Number(options.now ?? Date.now())) : null;
  } catch {
    return null;
  }
}
