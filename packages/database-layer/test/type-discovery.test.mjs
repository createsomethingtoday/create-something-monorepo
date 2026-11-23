import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverTypes } from '../scripts/lib/type-discovery.mjs';

test('infers native collection vocabulary without declared types', () => {
  const result = discoverTypes('source.json', JSON.stringify({ deliveryPartners: [{ name: 'Acme' }], companies: [{ name: 'Example' }], tags: ['fast'], items: [{ id: 1 }] }));
  assert.deepEqual(result.map(({ name }) => name), ['company', 'delivery-partner']);
  assert.match(result[1].evidence, /source.json: \$\.deliveryPartners:.*Acme/);
});

test('root collections use filename and explicit fields carry source evidence', () => {
  const result = discoverTypes('vendors.json', JSON.stringify([{ name: 'Acme', type: 'DeliveryPartner', entity_type: 'Supplier', '@type': ['Organization'] }]));
  assert.deepEqual(result.map(({ name }) => name), ['delivery-partner', 'organization', 'supplier', 'vendor']);
  assert.match(result.find(({ name }) => name === 'supplier').evidence, /\$\[0\]\.entity_type: "Supplier"/);
});

test('discovers bounded affirmative prose definitions', () => {
  const result = discoverTypes('notes.md', 'Acme is a delivery partner.\n- Beeline is an insurance broker.\nAcme is a delivery partner.\nAcme is not a customer.\nThis is a very long description that should not become vocabulary.');
  assert.deepEqual(result.map(({ name }) => name), ['delivery-partner', 'insurance-broker']);
  assert.match(result[0].evidence, /Acme is a delivery partner\./);
});

test('ignores nonentity collections and primitive values', () => {
  assert.deepEqual(discoverTypes('records.json', '{"items":[{"id":1}],"statuses":["active"],"type":42}'), []);
  assert.deepEqual(discoverTypes('notes.md', 'We are reviewing delivery partners and customers.'), []);
});

test('is deterministic, unique, and bounded', () => {
  const content = JSON.stringify({ vendors: [{ type: 'Vendor', description: 'x'.repeat(1000) }, { type: 'Vendor' }] });
  assert.deepEqual(discoverTypes('source.json', content), discoverTypes('source.json', content));
  const result = discoverTypes('source.json', content);
  assert.equal(result.length, 1);
  assert.ok(result[0].evidence.length <= 'source.json: '.length + 280);
});

test('learns a type first seen late in a growing collection', () => {
  const items = Array.from({length: 1100}, () => ({type: 'buyer'}));
  items.push({type: 'auditor'});
  const result = discoverTypes('records.json', JSON.stringify(items));
  assert.deepEqual(result.map(type => type.name), ['auditor', 'buyer']);
});
