import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

test('the mobile homepage keeps its primary journey visible and defers supporting records', () => {
  const mobileRecord = home.indexOf('<details class="home-mobile-supporting-record">');
  const earlySupport = home.indexOf('home-supporting-record__deferred--early');
  const adoption = home.indexOf('<AdoptionPathChooser />');
  const lateSupport = home.indexOf('home-supporting-record__deferred--late');
  const handoff = home.indexOf('<PerformanceConversionHandoff');

  assert.notEqual(mobileRecord, -1, 'mobile needs one native supporting-record disclosure');
  assert.notEqual(earlySupport, -1, 'delivery and evidence need a mobile deferral boundary');
  assert.notEqual(adoption, -1, 'the audience choice remains in the primary journey');
  assert.notEqual(lateSupport, -1, 'tool and FAQ detail need a mobile deferral boundary');
  assert.notEqual(handoff, -1, 'the map handoff remains visible without opening supporting detail');

  assert.ok(mobileRecord < earlySupport);
  assert.ok(earlySupport < adoption);
  assert.ok(adoption < lateSupport);
  assert.ok(lateSupport < handoff);

  assert.match(home, /<summary>[\s\S]*?Inspect the supporting record[\s\S]*?<\/summary>/);
  assert.match(home, /href="\/proof\/marketplace-workflow"[\s\S]*?Marketplace field report/);
  assert.match(home, /href="\/services"[\s\S]*?Delivery path/);
  assert.match(home, /href="\/stack"[\s\S]*?Ownership boundary/);
  assert.match(home, /href="\/partners"[\s\S]*?Tool directory/);
});

test('mobile supporting detail is a native disclosure with touch-safe route handoffs', () => {
  assert.match(
    home,
    /@media \(max-width: 640px\)[\s\S]*?\.home-supporting-record__deferred\s*\{\s*display:\s*none;/
  );
  assert.match(
    home,
    /\.home-mobile-supporting-record summary\s*\{[\s\S]*?min-height:\s*var\(--height-performance-control-min, 2\.75rem\)/
  );
  assert.match(
    home,
    /\.home-mobile-supporting-record__links a\s*\{[\s\S]*?min-height:\s*var\(--height-performance-control-min, 2\.75rem\)/
  );
  assert.match(
    home,
    /@media \(min-width: 640\.01px\)[\s\S]*?\.home-supporting-record__deferred\s*\{\s*display:\s*contents;/
  );
});
