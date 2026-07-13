import test from 'node:test';
import assert from 'node:assert/strict';
import reservationsHandler from '../api/reservations.js';
import {
  getReservationAvailability,
  indexReservationProducts,
  normalizeReservationSnapshot
} from '../src/utils/reservations.js';

function responseMock() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

test('monta snapshot sem alterar quantidade, estoque ou informações comerciais', () => {
  const [item] = normalizeReservationSnapshot([{
    id: 'p-1', code: '655030', name: 'Alma para-choque', brand: 'RETOV', stock: 2, qty: 5, price: 97.51
  }]);

  assert.deepEqual(item, {
    productCode: '655030',
    productName: 'Alma para-choque',
    brand: 'RETOV',
    stockQty: 2,
    requestedQty: 5
  });
  assert.equal('price' in item, false);
});

test('separa reserva própria, reserva de terceiros e excedente solicitado', () => {
  const indexed = indexReservationProducts({ products: [{
    productCode: '655030', stockQty: 2, totalReservedQty: 2,
    ownRequestedQty: 3, ownReservedQty: 1, ownExcessQty: 2,
    otherReservedQty: 1, activeCarts: 2
  }] });
  const availability = getReservationAvailability({ code: '655030', stock: 2 }, indexed['655030']);

  assert.equal(availability.availableNow, 0);
  assert.equal(availability.availableForSession, 1);
  assert.equal(availability.ownReservedQty, 1);
  assert.equal(availability.ownExcessQty, 2);
});

test('proxy aceita sincronização válida e não expõe endpoint administrativo', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, json: async () => ({ ok: true, products: [] }) };
  };

  try {
    const response = responseMock();
    await reservationsHandler({
      method: 'POST',
      headers: { host: 'catalogo.test', origin: 'https://catalogo.test' },
      query: {},
      body: {
        action: 'sync_reservations',
        sessionId: 'cart_teste_123456',
        companyName: 'Cliente Teste',
        consultant: 'huesller',
        items: [{ productCode: '655030', productName: 'Alma', stockQty: 2, requestedQty: 4 }]
      }
    }, response);

    assert.equal(response.statusCode, 200);
    const forwarded = JSON.parse(calls[0].options.body);
    assert.equal(forwarded.action, 'sync_reservations');
    assert.equal(forwarded.items[0].stockQty, 2);
    assert.equal(forwarded.items[0].requestedQty, 4);

    const denied = responseMock();
    await reservationsHandler({
      method: 'POST', headers: { host: 'catalogo.test' }, query: {},
      body: { action: 'reservations_admin', sessionId: 'cart_teste_123456' }
    }, denied);
    assert.equal(denied.statusCode, 400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
