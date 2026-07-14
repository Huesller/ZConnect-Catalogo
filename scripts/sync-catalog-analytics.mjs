import fs from "node:fs";
import path from "node:path";

const targetUrl = String(process.env.ZCONNECT_ANALYTICS_TARGET_URL || "").trim();
const syncToken = String(process.env.CATALOG_SYNC_TOKEN || "").trim();
const catalogPath = path.join(process.cwd(), "public", "data", "catalog.v5.json");
const metaPath = path.join(process.cwd(), "public", "data", "meta.json");

if (!targetUrl || !syncToken) {
  console.log("[Analytics] Snapshot ignorado: configure ZCONNECT_ANALYTICS_TARGET_URL e CATALOG_SYNC_TOKEN.");
  process.exit(0);
}

if (!fs.existsSync(catalogPath)) {
  console.log("[Analytics] Snapshot ignorado: catalog.v5.json ainda não foi gerado.");
  process.exit(0);
}

try {
  const products = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : {};
  const compactProducts = products.map((product) => ({
    productCode: product.code,
    productName: product.name,
    brand: product.brand,
    stockQty: Number(product.stockQty ?? product.stock ?? product.estoque ?? 0),
    hasImage: Boolean(product.image || product.imageFull)
  }));
  const startedAt = Date.now();
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "catalog_snapshot",
      syncToken,
      source: "catalogo-vercel-deploy",
      durationMs: Math.max(0, Date.now() - startedAt),
      generatedAt: meta.generatedAt || new Date().toISOString(),
      products: compactProducts
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
  console.log(`[Analytics] Snapshot enviado: ${compactProducts.length} produtos monitorados.`);
} catch (error) {
  console.warn(`[Analytics] Não foi possível enviar o snapshot: ${error.message}`);
  process.exit(0);
}
