import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/catalog/route';
test('catalog route returns actionable failure when upstream is unavailable', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw Error('offline');
    };
    const r = await GET(new Request('http://localhost/api/catalog'));
    assert.equal(r.status, 502);
    assert.match((await r.json()).error, /try again/i);
  } finally {
    globalThis.fetch = original;
  }
});
test('catalog route rejects malformed upstream data', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ message: 'unexpected' });
    const r = await GET(new Request('http://localhost/api/catalog'));
    assert.equal(r.status, 502);
  } finally {
    globalThis.fetch = original;
  }
});
test('catalog route returns actual rows with timestamped provenance', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        items: [{ id: 'example', template_slug: 'example' }],
        pagination: { total_items: 1 }
      });
    const r = await GET(new Request('http://localhost/api/catalog?template_slug=example'));
    const d = await r.json();
    assert.equal(r.status, 200);
    assert.equal(d.items[0].id, 'example');
    assert.equal(d.provenance.mode, 'live');
    assert.match(d.provenance.source, /template_slug=example/);
    assert.ok(Number.isFinite(Date.parse(d.provenance.fetchedAt)));
  } finally {
    globalThis.fetch = original;
  }
});
