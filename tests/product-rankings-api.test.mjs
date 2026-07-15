import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/product-rankings.js';

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

test('ranking proxy exposes only sanitized product-code order', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      generatedAt: '2026-07-15T12:00:00.000Z',
      rankings: {
        popular: [' 123 ', '', null, '456'],
        added: ['789'],
        quoted: ['999'],
        clients: ['must-not-leak']
      }
    })
  });

  try {
    const response = responseMock();
    await handler({ method: 'GET' }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.rankings, {
      popular: ['123', '456'],
      added: ['789'],
      quoted: ['999']
    });
    assert.equal(response.body.windowDays, 30);
    assert.match(response.headers['Cache-Control'], /s-maxage=900/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('ranking proxy rejects non-GET requests', async () => {
  const response = responseMock();
  await handler({ method: 'POST' }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET');
});
