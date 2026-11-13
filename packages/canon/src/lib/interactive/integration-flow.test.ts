// @vitest-environment node
import { render } from 'svelte/server';
import { expect, test } from 'vitest';
import IntegrationFlow from './IntegrationFlow.svelte';

const integrations = [{ label: 'In', name: 'Intake' }, { label: 'Re', name: 'Review' }, { label: 'Ar', name: 'Archive' }];

for (const glassMode of ['solid', 'smooth', 'refraction'] as const) {
  test(`${glassMode} preserves explicit connectors and motion with one visible name per service`, () => {
    const { body } = render(IntegrationFlow, { props: { integrations, description: 'A fictional route.', glassMode, showConnectors: true, animateFlow: true } });
    expect(body.match(/<svg class="connector\b/g)).toHaveLength(2);
    expect(body.match(/<animateMotion\b/g)).toHaveLength(2);
    expect(body.match(/class="service-name\b/g)).toHaveLength(3);
    expect(body.match(/role="listitem"/g)).toHaveLength(3);
    // A horizontal path has a zero-height object bounding box. Its gradient
    // and optional blur therefore need explicit, nondegenerate SVG space.
    expect(body.match(/gradientUnits="userSpaceOnUse"/g)).toHaveLength(2);
    expect(body.match(/filterUnits="userSpaceOnUse"/g)).toHaveLength(2);
  });
}

test('the default stays static and named without implied background execution', () => {
  const { body } = render(IntegrationFlow, { props: { integrations, description: 'A fictional route.' } });
  expect(body).toContain('solid-flow');
  expect(body).not.toContain('<animateMotion');
  expect(body).not.toContain('<svg class="connector');
  expect(body.match(/class="service-name\b/g)).toHaveLength(3);
});
