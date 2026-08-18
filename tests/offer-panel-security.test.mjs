import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('painel não contém chave privada e solicita autenticação ao servidor', () => {
  const html = fs.readFileSync(new URL('../PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /PRIVATE_KEY_JWK/);
  assert.doesNotMatch(html, /crypto\.subtle\.sign/);
  assert.match(html, /id="adminSecret"/);
  assert.match(html, /X-Offer-Admin-Secret/);
  assert.match(html, /\/oferta\//);
});
