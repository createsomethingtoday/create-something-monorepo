import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './fixtures';

for (const location of ['conversation', 'evidence'] as const) {
  test(`${location} CSV covers all three declared specialties`, () => {
    const view = fixture('idle').read();
    const text = view.messages.map(message => message.text).join('\n');
    const href = location === 'conversation'
      ? text.match(/https:\/\/[^)]+sourcing\.csv[^)]+/)?.[0]
      : (view.sources[0] as any).data.csv_download_url;
    assert.ok(href);
    const url = new URL(href);
    assert.equal(url.searchParams.get('run_id'), 'abnationalrun_fixture');
    assert.deepEqual(url.searchParams.get('taxonomy_code')?.split(','), [
      '363LF0000X', '363LA2200X', '363LG0600X'
    ]);
  });
}
