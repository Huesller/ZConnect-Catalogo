const DEFAULT_TARGET_URL =
  "https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec";
const DEFAULT_TIMEOUT_MS = 12000;
const SESSION_PATTERN = /^[A-Za-z0-9:_-]{6,120}$/;
const ALLOWED_ACTIONS = new Set(["sync_reservations", "quote_reservations", "release_reservations"]);

function getRequestHost(request) {
  return String(request.headers["x-forwarded-host"] || request.headers.host || "")
    .split(",")[0]
    .trim();
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === getRequestHost(request);
  } catch {
    return false;
  }
}

function setHeaders(request, response) {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(request)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store, max-age=0");
}

function getTargetUrl() {
  return new URL(process.env.ZCONNECT_ANALYTICS_TARGET_URL || DEFAULT_TARGET_URL);
}

function parseBody(request) {
  if (!request.body) return null;
  if (typeof request.body === "object") return request.body;
  try {
    return JSON.parse(String(request.body));
  } catch {
    return null;
  }
}

function cleanText(value, maximum) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maximum);
}

function cleanInteger(value, maximum = 9999) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, maximum);
}

function normalizeItems(value) {
  if (!Array.isArray(value) || value.length > 80) return null;
  return value.map((item) => ({
    productCode: cleanText(item?.productCode || item?.code, 80),
    productName: cleanText(item?.productName || item?.name, 220),
    brand: cleanText(item?.brand, 80),
    stockQty: cleanInteger(item?.stockQty ?? item?.stock, 99999),
    requestedQty: cleanInteger(item?.requestedQty ?? item?.quantity)
  })).filter((item) => item.productCode);
}

async function upstreamJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const upstream = await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
    if (!upstream.ok) throw new Error(`upstream_${upstream.status}`);
    return await upstream.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(request, response) {
  setHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (!isAllowedOrigin(request)) {
    response.status(403).json({ ok: false, error: "Origem não permitida." });
    return;
  }

  if (request.method === "GET") {
    const sessionId = cleanText(request.query?.sessionId, 120);
    if (sessionId && !SESSION_PATTERN.test(sessionId)) {
      response.status(400).json({ ok: false, error: "Sessão inválida." });
      return;
    }

    const target = getTargetUrl();
    target.searchParams.set("action", "reservations_public");
    if (sessionId) target.searchParams.set("sessionId", sessionId);

    try {
      const result = await upstreamJson(target.toString());
      response.status(result?.ok ? 200 : 503).json(result || { ok: false });
    } catch {
      response.status(502).json({ ok: false, error: "Não foi possível consultar as reservas." });
    }
    return;
  }

  if (request.method === "POST") {
    const data = parseBody(request);
    const action = cleanText(data?.action, 40);
    const sessionId = cleanText(data?.sessionId, 120);
    if (!data || !ALLOWED_ACTIONS.has(action) || !SESSION_PATTERN.test(sessionId)) {
      response.status(400).json({ ok: false, error: "Solicitação de reserva inválida." });
      return;
    }

    const items = action === "sync_reservations" ? normalizeItems(data.items) : [];
    if (action === "sync_reservations" && !items) {
      response.status(400).json({ ok: false, error: "Lista de produtos inválida." });
      return;
    }

    const payload = {
      action,
      sessionId,
      companyName: cleanText(data.companyName, 120),
      consultant: cleanText(data.consultant, 80),
      items
    };
    const target = getTargetUrl();
    target.searchParams.set("action", action);

    try {
      const result = await upstreamJson(target.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      response.status(result?.ok ? 200 : 503).json(result || { ok: false });
    } catch {
      response.status(502).json({ ok: false, error: "Não foi possível atualizar as reservas." });
    }
    return;
  }

  response.status(405).json({ ok: false, error: "Método não permitido." });
}
