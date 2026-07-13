import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeRange {
  constructor(sheet, row, column, rowCount, columnCount) {
    Object.assign(this, { sheet, row, column, rowCount, columnCount });
  }

  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) => (
      Array.from({ length: this.columnCount }, (_, columnOffset) => (
        this.sheet.rows[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ''
      ))
    ));
  }

  setValues(values) {
    values.forEach((sourceRow, rowOffset) => {
      const targetIndex = this.row - 1 + rowOffset;
      if (!this.sheet.rows[targetIndex]) this.sheet.rows[targetIndex] = [];
      sourceRow.forEach((value, columnOffset) => {
        this.sheet.rows[targetIndex][this.column - 1 + columnOffset] = value;
      });
    });
  }
}

class FakeSheet {
  constructor() { this.rows = []; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map((row) => row.length)); }
  appendRow(row) { this.rows.push([...row]); }
  getRange(row, column, rowCount, columnCount) { return new FakeRange(this, row, column, rowCount, columnCount); }
  getDataRange() { return new FakeRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
}

function loadReservationsScript() {
  const sheets = new Map();
  const spreadsheet = {
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) { const sheet = new FakeSheet(); sheets.set(name, sheet); return sheet; }
  };
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    console
  });
  const source = fs.readFileSync(new URL('../../ZConnect-Analytics/GOOGLE_APPS_SCRIPT_V3_CLIENTES.js', import.meta.url), 'utf8');
  vm.runInContext(source, context);
  return { context, sheets };
}

test('servidor nunca reserva mais unidades do que o estoque físico', () => {
  const { context } = loadReservationsScript();
  const item = { productCode: '655030', productName: 'Alma', stockQty: 2, requestedQty: 2 };

  const first = context.syncReservations_({ sessionId: 'cart_cliente_a', companyName: 'Cliente A', items: [item] });
  const second = context.syncReservations_({ sessionId: 'cart_cliente_b', companyName: 'Cliente B', items: [item] });
  const firstProduct = first.products.find((product) => product.productCode === '655030');
  const secondProduct = second.products.find((product) => product.productCode === '655030');

  assert.equal(firstProduct.ownReservedQty, 2);
  assert.equal(secondProduct.totalReservedQty, 2);
  assert.equal(secondProduct.ownReservedQty, 0);
  assert.equal(secondProduct.ownExcessQty, 2);
  assert.equal(secondProduct.availableNow, 0);
});

test('reserva removida do carrinho libera imediatamente as unidades', () => {
  const { context } = loadReservationsScript();
  const item = { productCode: '655030', productName: 'Alma', stockQty: 2, requestedQty: 2 };

  context.syncReservations_({ sessionId: 'cart_cliente_a', companyName: 'Cliente A', items: [item] });
  context.syncReservations_({ sessionId: 'cart_cliente_a', companyName: 'Cliente A', items: [] });
  const next = context.syncReservations_({ sessionId: 'cart_cliente_b', companyName: 'Cliente B', items: [item] });
  const product = next.products.find((entry) => entry.productCode === '655030');

  assert.equal(product.ownReservedQty, 2);
  assert.equal(product.ownExcessQty, 0);
});

test('cotação amplia o prazo e a expiração remove a reserva pública', () => {
  const { context, sheets } = loadReservationsScript();
  const item = { productCode: '655030', productName: 'Alma', stockQty: 2, requestedQty: 1 };
  context.syncReservations_({ sessionId: 'cart_cliente_a', companyName: 'Cliente A', items: [item] });

  const quoted = context.quoteReservations_({ sessionId: 'cart_cliente_a' });
  const product = quoted.products.find((entry) => entry.productCode === '655030');
  const minutes = (new Date(product.ownExpiresAt).getTime() - Date.now()) / 60000;
  assert.equal(product.ownStatus, 'quoted');
  assert.ok(minutes > 59 && minutes <= 60.1);

  const sheet = sheets.get('RESERVATIONS');
  const headers = sheet.rows[0];
  sheet.rows[1][headers.indexOf('expiresAt')] = new Date(Date.now() - 1000);
  const publicState = context.getPublicReservations_('cart_cliente_a');
  assert.equal(publicState.products.length, 0);
});
