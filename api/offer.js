import crypto from "node:crypto";

const DEFAULT_TARGET_URL =
  "https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_OFFER_GENERATION = "2026-08-18-reset-1";
const OFFER_VERSION = 3;
const MIN_ADMIN_SECRET_LENGTH = 32;
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const SLUG_PATTERN = /^[A-Z0-9][A-Z0-9-]{0,39}$/;
const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ALLOWED_VALIDITY_DAYS = new Set([1, 3, 7, 15, 30]);
const SELLER_POLICIES = new Map([
  ["huesller", 45],
  ["ney", 45],
  ["almir", 45],
  ["gabriel", 45],
  ["junior", 45],
  ["francisco", 50],
  ["representante", 50]
]);

function setCorsHeaders(request, response) {
  const origin = String(request.headers.origin || "");
  if (origin === "null") response.setHeader("Access-Control-Allow-Origin", "null");
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Offer-Admin-Secret");
  response.setHeader("Cache-Control", "no-store");
}

function parseJsonBody(request) {
  if (!request.body) return null;
  if (typeof request.body === "object") return request.body;
  try {
    return JSON.parse(String(request.body));
  } catch {
    return null;
  }
}

function getRequestHeader(request, name) {
  const normalizedName = String(name || "").toLowerCase();
  if (typeof request.headers?.get === "function") return String(request.headers.get(normalizedName) || "");
  return String(request.headers?.[normalizedName] || request.headers?.[name] || "");
}

function getAdminSecret() {
  return String(process.env.OFFER_ADMIN_SECRET || "").trim();
}

function getOfferGeneration() {
  const generation = String(process.env.OFFER_LINK_GENERATION || DEFAULT_OFFER_GENERATION).trim();
  return generation.slice(0, 64) || DEFAULT_OFFER_GENERATION;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length
    && leftBuffer.length > 0
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signingKey(secret) {
  return crypto.createHash("sha256").update(`zconnect-offer-v3:${secret}`).digest();
}

function signEncodedPayload(encodedPayload, secret) {
  return crypto.createHmac("sha256", signingKey(secret)).update(encodedPayload).digest("base64url");
}

function signPayload(payload, secret) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signEncodedPayload(encodedPayload, secret)}`;
}

function canonicalSeller(value) {
  const seller = String(value || "").trim().toLowerCase();
  return seller === "ivoney" ? "ney" : seller;
}

function normalizeClientName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}

function slugifyClient(value) {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "CLIENTE";
}

function createShortCode() {
  return Array.from(crypto.randomBytes(8), (byte) => SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length]).join("");
}

function createOfferId() {
  return `OF-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

function formatExpiresLabel(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function normalizeVerifiedPayload(payload, now = Date.now()) {
  if (!payload || Number(payload.v) !== OFFER_VERSION) return null;
  if (String(payload.g || "") !== getOfferGeneration()) return null;

  const id = String(payload.i || "").trim();
  const seller = canonicalSeller(payload.s);
  const clientName = normalizeClientName(payload.c);
  const discount = Number(payload.d);
  const createdAtMs = Number(payload.a) * 1000;
  const expiresAtMs = Number(payload.e) * 1000;
  const clientSlug = String(payload.l || "").trim().toUpperCase();
  const shortCode = String(payload.k || "").trim().toUpperCase();
  const baseDiscount = SELLER_POLICIES.get(seller);

  if (!id || !baseDiscount || clientName.length < 2) return null;
  if (!SLUG_PATTERN.test(clientSlug) || !CODE_PATTERN.test(shortCode)) return null;
  if (!Number.isFinite(discount) || discount <= 0 || baseDiscount + discount > 95) return null;
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(expiresAtMs)) return null;
  if (createdAtMs > now + 5 * 60 * 1000 || expiresAtMs <= createdAtMs) return null;
  if (expiresAtMs - createdAtMs > 31 * 24 * 60 * 60 * 1000) return null;

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
    mode: "discount",
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresLabel: formatExpiresLabel(expiresAtMs),
    clientSlug,
    shortCode,
    source: "signed_short_link_v3"
  };
}

function verifySignedToken(token, secret) {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  try {
    const expectedSignature = signEncodedPayload(parts[0], secret);
    if (!safeEqual(parts[1], expectedSignature)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return normalizeVerifiedPayload(payload);
  } catch {
    return null;
  }
}

async function upstreamFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const result = await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
    if (!result.ok) throw new Error(`upstream_${result.status}`);
    return await result.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getTargetUrl() {
  return new URL(process.env.ZCONNECT_ANALYTICS_TARGET_URL || DEFAULT_TARGET_URL);
}

async function registerOffer({ secret, seller, clientName, discount, validityDays }) {
  const createdAt = Date.now();
  const expiresAt = createdAt + validityDays * 24 * 60 * 60 * 1000;
  const offerId = createOfferId();
  const clientSlug = slugifyClient(clientName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortCode = createShortCode();
    const signedToken = signPayload({
      v: OFFER_VERSION,
      g: getOfferGeneration(),
      i: offerId,
      s: seller,
      c: clientName,
      d: discount,
      a: Math.floor(createdAt / 1000),
      e: Math.floor(expiresAt / 1000),
      l: clientSlug,
      k: shortCode
    }, secret);

    const target = getTargetUrl();
    target.searchParams.set("action", "create_offer_short");
    const result = await upstreamFetch(target.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({
        action: "create_offer_short",
        shortCode,
        clientSlug,
        signedToken,
        offerId,
        clientName,
        seller,
        expiresAt: new Date(expiresAt).toISOString()
      })
    });

    if (result?.ok) {
      return {
        id: offerId,
        seller,
        clientName,
        discount,
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        clientSlug,
        shortCode
      };
    }
    if (result?.error !== "short_code_collision") {
      const error = new Error(result?.error || "offer_registration_failed");
      error.result = result;
      throw error;
    }
  }

  throw new Error("short_code_collision");
}

export default async function handler(request, response) {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const secret = getAdminSecret();
  if (secret.length < MIN_ADMIN_SECRET_LENGTH) {
    response.status(503).json({ ok: false, error: "Geração de ofertas ainda não configurada no servidor." });
    return;
  }

  if (request.method === "GET") {
    const code = String(request.query?.code || "").trim().toUpperCase();
    const clientSlug = String(request.query?.clientSlug || "").trim().toUpperCase();
    if (!CODE_PATTERN.test(code) || !SLUG_PATTERN.test(clientSlug)) {
      response.status(400).json({ ok: false, error: "Referência de oferta inválida." });
      return;
    }

    const target = getTargetUrl();
    target.searchParams.set("action", "resolve_offer_short");
    target.searchParams.set("code", code);

    try {
      const result = await upstreamFetch(target.toString());
      const offer = result?.ok ? verifySignedToken(result.token, secret) : null;
      if (!offer || offer.shortCode !== code || offer.clientSlug !== clientSlug) {
        response.status(404).json({ ok: false, error: "Oferta antiga, revogada ou inexistente." });
        return;
      }
      response.status(200).json({ ok: true, offer });
    } catch {
      response.status(502).json({ ok: false, error: "Não foi possível consultar a oferta." });
    }
    return;
  }

  if (request.method === "POST") {
    if (request.headers.origin && request.headers.origin !== "null") {
      response.status(403).json({ ok: false, error: "Origem não permitida." });
      return;
    }

    const providedSecret = getRequestHeader(request, "x-offer-admin-secret");
    if (!safeEqual(providedSecret, secret)) {
      response.status(401).json({ ok: false, error: "Chave de acesso do painel incorreta." });
      return;
    }

    const data = parseJsonBody(request);
    const seller = canonicalSeller(data?.seller);
    const clientName = normalizeClientName(data?.clientName);
    const discount = Number(data?.discount);
    const validityDays = Number(data?.validityDays);
    const baseDiscount = SELLER_POLICIES.get(seller);

    if (!baseDiscount || clientName.length < 2 || !Number.isFinite(discount) || discount <= 0) {
      response.status(400).json({ ok: false, error: "Dados da oferta inválidos." });
      return;
    }
    if (baseDiscount + discount > 95) {
      response.status(400).json({ ok: false, error: "A condição final não pode ultrapassar 95%." });
      return;
    }
    if (!ALLOWED_VALIDITY_DAYS.has(validityDays)) {
      response.status(400).json({ ok: false, error: "Validade da oferta inválida." });
      return;
    }

    try {
      const offer = await registerOffer({ secret, seller, clientName, discount, validityDays });
      response.status(201).json({ ok: true, offer });
    } catch (error) {
      const collision = error?.message === "short_code_collision";
      response.status(collision ? 409 : 502).json({
        ok: false,
        error: collision
          ? "Não foi possível gerar um código único. Tente novamente."
          : "Não foi possível registrar o link curto."
      });
    }
    return;
  }

  response.status(405).json({ ok: false, error: "Método não permitido." });
}
