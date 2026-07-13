import crypto from "node:crypto";

const DEFAULT_TARGET_URL =
  "https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec";
const DEFAULT_TIMEOUT_MS = 8000;
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const SLUG_PATTERN = /^[A-Z0-9][A-Z0-9-]{0,39}$/;
const PUBLIC_KEY_JWK = {
  key_ops: ["verify"],
  ext: true,
  kty: "EC",
  x: "ZO1Zs56p0ajqfCIpZ6gEa7ckQ5Hqzr1qlp9iNz5kc4M",
  y: "BVoESZjC1ShNIKiqZUpc_rS1Ivh_VgdPmMVONJtvMf4",
  crv: "P-256"
};

function setCorsHeaders(request, response) {
  const origin = String(request.headers.origin || "");
  if (origin === "null") response.setHeader("Access-Control-Allow-Origin", "null");
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

function verifySignedToken(token) {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  try {
    const publicKey = crypto.createPublicKey({ key: PUBLIC_KEY_JWK, format: "jwk" });
    const valid = crypto.verify(
      "sha256",
      Buffer.from(parts[0]),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      decodeBase64Url(parts[1])
    );
    if (!valid) return null;

    const payload = JSON.parse(decodeBase64Url(parts[0]).toString("utf8"));
    if (Number(payload.v) !== 2 || !payload.i || !payload.c || !payload.s || !payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

async function upstreamFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getTargetUrl() {
  return new URL(process.env.ZCONNECT_ANALYTICS_TARGET_URL || DEFAULT_TARGET_URL);
}

export default async function handler(request, response) {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method === "GET") {
    const code = String(request.query?.code || "").trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      response.status(400).json({ ok: false, error: "Código de oferta inválido." });
      return;
    }

    const target = getTargetUrl();
    target.searchParams.set("action", "resolve_offer_short");
    target.searchParams.set("code", code);

    try {
      const result = await upstreamFetch(target.toString());
      if (!result?.ok || !verifySignedToken(result.token)) {
        response.status(404).json({ ok: false, error: "Oferta não encontrada." });
        return;
      }
      response.status(200).json({ ok: true, token: result.token });
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

    const data = parseJsonBody(request);
    const code = String(data?.shortCode || "").trim().toUpperCase();
    const clientSlug = String(data?.clientSlug || "").trim().toUpperCase();
    const signedToken = String(data?.signedToken || "").trim();
    const signedPayload = verifySignedToken(signedToken);

    if (!CODE_PATTERN.test(code) || !SLUG_PATTERN.test(clientSlug) || !signedPayload) {
      response.status(400).json({ ok: false, error: "Oferta assinada inválida." });
      return;
    }

    const target = getTargetUrl();
    target.searchParams.set("action", "create_offer_short");
    const payload = {
      action: "create_offer_short",
      shortCode: code,
      clientSlug,
      signedToken,
      offerId: String(signedPayload.i),
      clientName: String(signedPayload.c),
      seller: String(signedPayload.s),
      expiresAt: new Date(Number(signedPayload.e) * 1000).toISOString()
    };

    try {
      const result = await upstreamFetch(target.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if (!result?.ok) {
        response.status(result?.error === "short_code_collision" ? 409 : 400).json(result);
        return;
      }
      response.status(201).json({ ok: true, shortCode: code, clientSlug });
    } catch {
      response.status(502).json({ ok: false, error: "Não foi possível registrar o link curto." });
    }
    return;
  }

  response.status(405).json({ ok: false, error: "Método não permitido." });
}
