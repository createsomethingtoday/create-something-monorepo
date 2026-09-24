import assert from 'node:assert/strict';
import test from 'node:test';
import { wikiPassages } from '../scripts/agent-wiki-passages.mjs';

function verifyProvenance(text, passages) {
  const lines = text.split('\n');
  for (const passage of passages) {
    assert.equal(passage.excerpt, passage.sourceLines.map((line) => lines[line - 1]).join('\n'));
    assert.ok(passage.sourceLines.includes(passage.line));
  }
}

test('every split table passage repeats its original header without losing or duplicating rows', () => {
  const rows = Array.from({ length: 25 }, (_, index) => `| operation-${index} | ${'detail '.repeat(15)} |`);
  const header = '| Operation | Description |\n| :--- | ---: |';
  const text = `## Operations\n\n${header}\n${rows.join('\n')}\n\nFollowing prose.`;
  const passages = wikiPassages(text, 'fixture');
  const tables = passages.filter((passage) => passage.excerpt.startsWith('|'));
  assert.ok(tables.length > 1);
  assert.deepEqual(tables.flatMap((passage) => passage.excerpt.split('\n').slice(2)), rows);
  for (const passage of tables) {
    assert.ok(passage.excerpt.startsWith(header));
    assert.equal(passage.heading, 'Operations');
  }
  assert.ok(passages.some((passage) => passage.excerpt.includes('Following prose.')));
  verifyProvenance(text, passages);
});

test('approval rows group by the observed column while retaining noncontiguous line provenance', () => {
  const text = '## Operations\n| Name | Approval required |\n| --- | --- |\n| read | no |\n| write \\| special | yes |\n| inspect | no |\n| receipt | yes |';
  const passages = wikiPassages(text, 'fixture');
  const required = passages.find((passage) => passage.tableGroup?.value === 'yes');
  assert.deepEqual(required.sourceLines, [2, 3, 5, 7]);
  assert.ok(required.excerpt.includes('write \\| special'));
  assert.ok(required.excerpt.includes('receipt'));
  assert.ok(!required.excerpt.includes('inspect'));
  verifyProvenance(text, passages);
});

test('an oversized row is kept intact rather than silently dropping its approval cell', () => {
  const row = `| ${'長'.repeat(1700)} | yes |`;
  const text = `## Operations\n| Name | Approval required |\n| --- | --- |\n${row}\n| short | yes |`;
  const tables = wikiPassages(text, 'fixture').filter((passage) => passage.tableGroup);
  assert.equal(tables.length, 2);
  assert.equal(tables[0].excerpt.split('\n')[2], row);
  assert.ok(tables[1].excerpt.includes('| short | yes |'));
  verifyProvenance(text, tables);
});
