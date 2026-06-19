
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("public/data/catalog.v5.json");
const out = path.resolve("public/data/catalog.search.json");

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/-]/g, " ")
    .replace(/[_/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
const products = Array.isArray(catalog) ? catalog : catalog.products || [];

const index = products.map((product, i) => ({
  id: product.id || `${product.brand || ""}-${product.code || ""}-${i}`,
  code: product.code || "",
  brand: product.displayBrand || product.brand || "",
  text: normalizeText([
    product.code,
    product.fabCode,
    product.name,
    product.description,
    product.vehicle,
    product.application,
    product.manufacturer,
    product.brand,
    product.displayBrand,
    product.search
  ].filter(Boolean).join(" "))
}));

fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), total: index.length, index }, null, 0));
console.log(`Search index generated: ${index.length} products`);
