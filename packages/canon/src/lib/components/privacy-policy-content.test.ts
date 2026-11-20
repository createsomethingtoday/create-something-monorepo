// @vitest-environment node
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyContent from './PrivacyPolicyContent.svelte';

describe('property-specific privacy disclosures', () => {
  it('explains separate opt-in Meta marketing on Agency without contradicting that choice', () => {
    const { body } = render(PrivacyPolicyContent, { props: { property: 'agency', domain: 'createsomething.agency' } });
    expect(body).toContain('Meta marketing');
    expect(body).toContain('off by default');
    expect(body).toContain('hashed email');
    expect(body).toContain('Do Not Track');
    expect(body).toContain('Global Privacy Control');
    expect(body).not.toContain('Meta/Facebook Pixel or any Meta services');
    expect(body).not.toContain('No tracking pixels. No advertising');
    expect(body).not.toContain('never sell this data or use it for advertising');
  });

  it.each(['io', 'space', 'ltd', 'lms'] as const)('preserves the existing no-Meta promise on %s', (property) => {
    const { body } = render(PrivacyPolicyContent, { props: { property, domain: `createsomething.${property}` } });
    expect(body).toContain('Meta/Facebook Pixel or any Meta services');
    expect(body).toContain('No tracking pixels. No advertising');
    expect(body).not.toContain('Meta marketing');
  });
});
