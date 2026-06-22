const DEFAULT_TARGET_URL =
  "https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec";
const DEFAULT_TIMEOUT_MS = 8000;

function getRequestHost(request) {
  return String(
    request.headers["x-forwarded-host"] ||
    request.headers.host ||
    ""
  ).split(",")[0].trim();
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    return originHost === getRequestHost(request);
  } catch {
    return false;
  }
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(request)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }

  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store");
}

async function readRawBody(request) {
  if (request.body !== undefined && request.body !== null) {
    if (typeof request.body === "string") return request.body;
    if (Buffer.isBuffer(request.body)) return request.body.toString("utf8");
    return JSON.stringify(request.body);
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function buildTargetUrl(request) {
  const target = process.env.ZCONNECT_ANALYTICS_TARGET_URL || DEFAULT_TARGET_URL;
  const url = new URL(target);
  const query = request.query || {};

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  return url;
}

function parsePayload(rawBody) {
  if (!rawBody) return null;
  if (typeof rawBody === "object") return rawBody;

  try {
    const payload = JSON.parse(rawBody);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function hasMinimumPayload(payload) {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    typeof payload.event === "string" &&
    payload.event.trim()
  );
}

export default async function handler(request, response) {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Metodo nao permitido." });
    return;
  }

  if (!isAllowedOrigin(request)) {
    response.status(403).json({ ok: false, error: "Origem nao permitida." });
    return;
  }

  let payload = null;
  try {
    payload = parsePayload(await readRawBody(request));
  } catch {
    payload = null;
  }

  if (!hasMinimumPayload(payload)) {
    response.status(400).json({ ok: false, error: "Payload de analytics invalido." });
    return;
  }

  const targetUrl = buildTargetUrl(request);
  targetUrl.searchParams.set("action", "track");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: "POST",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    if (!upstream.ok) console.warn(`Analytics upstream retornou ${upstream.status}.`);
  } catch (error) {
    console.warn("Falha ao repassar analytics.", error);
  } finally {
    clearTimeout(timeout);
  }

  response.status(200).json({ ok: true });
}
