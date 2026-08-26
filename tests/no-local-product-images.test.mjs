import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('catálogo não contém referências a imagens locais de produtos', () => {
  const catalog = JSON.parse(fs.readFileSync('public/data/catalog.v5.json', 'utf8'));
  const invalid = catalog.filter((product) =>
    product.imageSource === 'local-import' ||
    String(product.image || '').startsWith('/product-images/') ||
    String(product.imageFull || '').startsWith('/product-images/')
  );

  assert.equal(invalid.length, 0);
});

test('pastas locais de produtos permanecem ignoradas pelo Git', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  assert.match(gitignore, /^public\/product-images\/$/m);
  assert.match(gitignore, /^dist\/product-images\/$/m);
});
