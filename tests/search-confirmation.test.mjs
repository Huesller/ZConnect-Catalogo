import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

test("busca é registrada apenas por confirmação explícita", () => {
  assert.match(source, /function confirmSearch\(\)/);
  assert.match(source, /if \(event\.key === 'Enter'\)[\s\S]{0,180}confirmSearch\(\)/);
  assert.doesNotMatch(source, /setTimeout\([\s\S]{0,800}trackEvent\('search'/);
  assert.match(source, /searchConfirmed: true/);
  assert.match(source, /normalizedQuery\.length < 4/);
  assert.doesNotMatch(source, /products: allFilteredProducts/);
});
