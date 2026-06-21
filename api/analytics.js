const DEFAULT_TIMEOUT_MS = 8000;

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
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
  const target = process.env.ZCONNECT_ANALYTICS_TARGET_URL;
  if (!target) return null;

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

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const targetUrl = buildTargetUrl(request);
  if (!targetUrl) {
    response.status(500).json({ ok: false, error: "ZCONNECT_ANALYTICS_TARGET_URL nao configurada." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const method = request.method || "POST";
    const hasBody = !["GET", "HEAD"].includes(method);
    const body = hasBody ? await readRawBody(request) : undefined;

    const upstream = await fetch(targetUrl.toString(), {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Content-Type": request.headers["content-type"] || "text/plain;charset=utf-8"
      },
      body
    });

    const text = await upstream.text();
    response.status(upstream.status || 200);
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json;charset=utf-8");
    response.send(text);
  } catch (error) {
    const aborted = error && error.name === "AbortError";
    response.status(aborted ? 504 : 502).json({
      ok: false,
      error: aborted ? "Timeout ao enviar analytics." : "Falha ao repassar analytics."
    });
  } finally {
    clearTimeout(timeout);
  }
}
