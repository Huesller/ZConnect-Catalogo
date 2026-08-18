import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getShortOfferReferenceFromUrl,
  resolveShortOffer
} from '../src/utils/signedOffer.js';

test('reconhece somente o novo caminho /oferta/cliente/código', () => {
  assert.deepEqual(
    getShortOfferReferenceFromUrl('/oferta/AUTO-PECAS-SILVA/7K2M9QPX'),
    { clientSlug: 'AUTO-PECAS-SILVA', code: '7K2M9QPX' }
  );
  assert.equal(getShortOfferReferenceFromUrl('/o/AUTO-PECAS-SILVA/7K2M9QPX'), null);
  assert.equal(getShortOfferReferenceFromUrl('/oferta/CLIENTE/codigo-invalido'), null);
  assert.equal(getShortOfferReferenceFromUrl('/produtos/7K2M9QPX'), null);
});

test('resolve a oferta validada pelo backend sem expor o token assinado', async () => {
  const calls = [];
  const now = Date.UTC(2026, 7, 18, 15, 0, 0);
  const offer = await resolveShortOffer(
    { clientSlug: 'CLIENTE', code: '7K2M9QPX' },
    {
      now,
      baseUrl: 'https://catalogo.exemplo.com',
      fetchApi: async (url) => {
        calls.push(url);
        return {
          ok: true,
          json: async () => ({
            ok: true,
            offer: {
              active: true,
              expired: false,
              signed: true,
              id: 'OF-NOVA',
              seller: 'huesller',
              clientName: 'Cliente',
              discount: 5,
              factor: 0.95,
              mode: 'discount',
              createdAt: new Date(now - 60000).toISOString(),
              expiresAt: new Date(now + 86400000).toISOString(),
              expiresLabel: '19/08/2026, 12:00',
              shortCode: '7K2M9QPX',
              clientSlug: 'CLIENTE',
              source: 'signed_short_link_v3'
            }
          })
        };
      }
    }
  );

  assert.equal(offer?.active, true);
  assert.equal(offer?.clientName, 'Cliente');
  assert.equal(offer?.source, 'signed_short_link_v3');
  assert.equal(calls[0], 'https://catalogo.exemplo.com/api/offer?code=7K2M9QPX&clientSlug=CLIENTE');
});

test('aceita oferta permanente validada pelo backend sem data de expiração', async () => {
  const now = Date.UTC(2026, 7, 18, 15, 0, 0);
  const offer = await resolveShortOffer(
    { clientSlug: 'CLIENTE-PERMANENTE', code: '8K2M9QPX' },
    {
      now,
      baseUrl: 'https://catalogo.exemplo.com',
      fetchApi: async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          offer: {
            active: true,
            expired: false,
            signed: true,
            permanent: true,
            id: 'OF-PERMANENTE',
            seller: 'huesller',
            clientName: 'Cliente Permanente',
            discount: 5,
            factor: 0.95,
            mode: 'discount',
            createdAt: new Date(now - 60000).toISOString(),
            expiresAt: '',
            expiresLabel: 'Sem vencimento automático',
            shortCode: '8K2M9QPX',
            clientSlug: 'CLIENTE-PERMANENTE',
            source: 'signed_short_link_v3'
          }
        })
      })
    }
  );

  assert.equal(offer?.active, true);
  assert.equal(offer?.expired, false);
  assert.equal(offer?.permanent, true);
  assert.equal(offer?.expiresAt, '');
  assert.equal(offer?.expiresLabel, 'Sem vencimento automático');
});

test('descarta resposta de oferta incompleta ou adulterada', async () => {
  const offer = await resolveShortOffer(
    { clientSlug: 'CLIENTE', code: '7K2M9QPX' },
    {
      baseUrl: 'https://catalogo.exemplo.com',
      fetchApi: async () => ({
        ok: true,
        json: async () => ({ ok: true, offer: { signed: true, discount: 5 } })
      })
    }
  );

  assert.equal(offer, null);
});
