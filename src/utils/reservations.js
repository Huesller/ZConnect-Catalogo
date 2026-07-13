export const RESERVATIONS_ENDPOINT = '/api/reservations';
export const RESERVATION_POLL_MS = 15000;
export const RESERVATION_HEARTBEAT_MS = 120000;
const STORAGE_KEY = 'zconnect:reservation-session:v1';

function safeInteger(value, maximum = 99999) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, maximum);
}

export function getReservationSessionId() {
  try {
    let sessionId = window.localStorage.getItem(STORAGE_KEY);
    if (sessionId && /^[A-Za-z0-9:_-]{6,120}$/.test(sessionId)) return sessionId;

    const random = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    sessionId = `cart_${Date.now().toString(36)}_${random.slice(0, 28)}`;
    window.localStorage.setItem(STORAGE_KEY, sessionId);
    return sessionId;
  } catch {
    return `cart_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
  }
}

export function normalizeReservationSnapshot(items = []) {
  return items.map((item) => ({
    productCode: String(item.code || item.productCode || item.id || '').trim().slice(0, 80),
    productName: String(item.name || item.productName || '').trim().slice(0, 220),
    brand: String(item.displayBrand || item.brand || '').trim().slice(0, 80),
    stockQty: safeInteger(item.stockQty ?? item.stock ?? item.estoque ?? item.saldo, 99999),
    requestedQty: Math.max(1, safeInteger(item.qty ?? item.quantity ?? item.requestedQty, 9999))
  })).filter((item) => item.productCode);
}

export function indexReservationProducts(result) {
  const products = Array.isArray(result?.products) ? result.products : [];
  return products.reduce((index, item) => {
    const productCode = String(item?.productCode || '').trim();
    if (!productCode) return index;
    index[productCode] = {
      ...item,
      stockQty: safeInteger(item.stockQty),
      totalReservedQty: safeInteger(item.totalReservedQty),
      activeCarts: safeInteger(item.activeCarts),
      ownRequestedQty: safeInteger(item.ownRequestedQty),
      ownReservedQty: safeInteger(item.ownReservedQty),
      ownExcessQty: safeInteger(item.ownExcessQty),
      otherReservedQty: safeInteger(item.otherReservedQty),
      availableNow: safeInteger(item.availableNow),
      availableForSession: safeInteger(item.availableForSession)
    };
    return index;
  }, {});
}

export function getReservationAvailability(product = {}, reservation = null) {
  const rawStock = product.stockQty ?? product.stock ?? product.estoque ?? product.saldo;
  const physicalStock = rawStock === null || rawStock === undefined || rawStock === ''
    ? null
    : safeInteger(rawStock);
  const stockQty = physicalStock !== null ? physicalStock : (reservation ? safeInteger(reservation.stockQty) : null);
  const totalReservedQty = safeInteger(reservation?.totalReservedQty);
  const ownReservedQty = safeInteger(reservation?.ownReservedQty);
  const otherReservedQty = reservation
    ? safeInteger(reservation.otherReservedQty)
    : Math.max(0, totalReservedQty - ownReservedQty);
  const ownRequestedQty = safeInteger(reservation?.ownRequestedQty);
  const ownExcessQty = safeInteger(reservation?.ownExcessQty);

  return {
    stockQty,
    totalReservedQty,
    ownRequestedQty,
    ownReservedQty,
    ownExcessQty,
    otherReservedQty,
    activeCarts: safeInteger(reservation?.activeCarts),
    availableNow: stockQty === null ? null : Math.max(0, stockQty - totalReservedQty),
    availableForSession: stockQty === null ? null : Math.max(0, stockQty - otherReservedQty)
  };
}

async function requestReservations(options = {}) {
  const response = await fetch(RESERVATIONS_ENDPOINT, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || 'reservation_request_failed');
  return result;
}

export async function fetchReservationSnapshot(sessionId) {
  const query = new URLSearchParams();
  if (sessionId) query.set('sessionId', sessionId);
  const response = await fetch(`${RESERVATIONS_ENDPOINT}?${query.toString()}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store'
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || 'reservation_request_failed');
  return result;
}

function postReservationAction(action, payload) {
  return requestReservations({
    method: 'POST',
    body: JSON.stringify({ action, ...payload })
  });
}

export function syncReservations(payload) {
  return postReservationAction('sync_reservations', payload);
}

export function quoteReservations(payload) {
  return postReservationAction('quote_reservations', payload);
}

export function releaseReservations(payload) {
  return postReservationAction('release_reservations', payload);
}
