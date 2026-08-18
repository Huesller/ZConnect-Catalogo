import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('painel não contém chave privada nem solicita chave aos consultores', () => {
  const html = fs.readFileSync(new URL('../PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html', import.meta.url), 'utf8');
  const deliveryHtml = fs.readFileSync(new URL('../PAINEL-COMERCIAL-OFERTAS-SEM-SENHA-PERMANENTE-BUILD-3.3.html', import.meta.url), 'utf8');

  assert.equal(deliveryHtml, html);
  assert.doesNotMatch(html, /PRIVATE_KEY_JWK/);
  assert.doesNotMatch(html, /crypto\.subtle\.sign/);
  assert.doesNotMatch(html, /id="adminSecret"/);
  assert.doesNotMatch(html, /X-Offer-Admin-Secret/);
  assert.match(html, /\/oferta\//);
  assert.match(html, /Build 3\.3/);
  assert.match(html, /<option value="permanent">Permanente/);
  assert.match(html, /permanent: permanent/);
  assert.match(html, /sem vencimento automático/i);
});
