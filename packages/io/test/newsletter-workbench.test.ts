import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import NewsletterWorkbench from '../src/lib/components/NewsletterWorkbench.svelte';

describe('newsletter operator surface', () => {
  it('keeps approval, web publication and email delivery distinct and shows the blocked action', () => {
    const { body } = render(NewsletterWorkbench, { props: { initialReport: {
      observed_at: '2026-11-03T16:00:00Z',
      audience: { eligible: 1, unconfirmed: 2, consent_unproved: 9, audience_unreviewed: 1, suppressed: 1 },
      editions: [{ slug: '2026-09-08-test-the-checker', title: 'Test the checker', author: 'CREATE SOMETHING', owner: 'Micah Johnson', subject: 'Test the checker before trusting the result', source_refs: ['docs/guides/GROUND_SEEDED_TRIAL.md'], content_hash: '', editorial_status: 'draft', web_status: 'draft', email_status: 'not-sent', next_action: 'Import source', blockers: ['Prepare content before review'], deliveries: [] }]
    } } });
    expect(body).toContain('1 eligible');
    expect(body).toContain('Consent unproved');
    expect(body).toContain('Prepare content before review');
    expect(body).toContain('Web: draft');
    expect(body).toContain('Email: not-sent');
    expect(body).toContain('Import candidate');
    expect(body).not.toContain('Send approved edition');
  });
});
