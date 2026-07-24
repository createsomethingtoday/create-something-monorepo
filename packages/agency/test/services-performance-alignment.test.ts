import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const services = read('../src/routes/services/+page.svelte');
const layout = read('../src/routes/+layout.svelte');
const productPath = read('../src/lib/components/ServicesProductPath.svelte');
const mapPreview = read('../src/lib/components/ServicesMapPreview.svelte');
const readback = read('../src/lib/components/AgencyPerformanceReadback.svelte');
const pipeline = read('../src/lib/components/ControlledWaterwayStory.svelte');

test('services presents one owned product path without ASCII arrows or repeated full-page Map UI', () => {
  assert.doesNotMatch(services, /Map -> Build -> Control/);
  assert.doesNotMatch(services, /PublicAtlasCanvas/);
  assert.doesNotMatch(services, /PerformanceContrastChapter/);
  assert.match(services, /ServicesProductPath/);
  assert.match(services, /ServicesMapPreview/);

  assert.match(productPath, /From mapped workflow to governed operation\./);
  assert.match(productPath, /id: 'map'/);
  assert.match(productPath, /id: 'build'/);
  assert.match(productPath, /id: 'control'/);
  assert.match(productPath, /data-product-stage=\{stage\.id\}/);
  assert.match(mapPreview, /Open the public Map/);
});

test('services keeps truthful proof beside the product path and avoids a duplicate closing handoff', () => {
  assert.match(services, /AgencyPerformanceReadback embedded=\{true\}/);
  assert.match(readback, /embedded = false/);
  assert.match(readback, /performance-readback--embedded/);
  assert.match(layout, /\$page\.url\.pathname !== '\/services'/);

  assert.match(services, /label: 'Owner', value: 'Named'/);
  assert.match(services, /label: 'Protected action', value: 'Held'/);
  assert.match(services, /label: 'Evidence', value: 'Attached'/);
});

test('services preserves pipeline context without rendering inactive stages as disabled UI', () => {
  assert.doesNotMatch(pipeline, /\[data-flow-phase\] \{\s*opacity: 0\.34;/);
  assert.match(pipeline, /\[data-flow-phase\] \{\s*opacity: 0\.62;/);
});

test('services removes the fixed mode control from the CTA-heavy route', () => {
  assert.match(layout, /\$page\.url\.pathname !== '\/services'/);
});
