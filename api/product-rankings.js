const DEFAULT_TARGET_URL =
  "https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec";
const DEFAULT_TIMEOUT_MS = 8000;

function cleanRanking(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((code) => String(code || "").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 10000);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ ok: false, error: "Metodo nao permitido." });
    return;
  }

  const target = String(process.env.ZCONNECT_ANALYTICS_TARGET_URL || DEFAULT_TARGET_URL).trim();
  const url = new URL(target);
  url.searchParams.set("action", "product_rankings_public");
  url.searchParams.set("days", "30");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.ok || !data.rankings) throw new Error("ranking_unavailable");

    response.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    response.status(200).json({
      ok: true,
      windowDays: 30,
      generatedAt: String(data.generatedAt || ""),
      rankings: {
        popular: cleanRanking(data.rankings.popular),
        added: cleanRanking(data.rankings.added),
        quoted: cleanRanking(data.rankings.quoted)
      }
    });
  } catch {
    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({ ok: false, error: "Ranking temporariamente indisponivel." });
  } finally {
    clearTimeout(timeout);
  }
}
