import { describe, expect, it } from 'vitest';
import { classifySubscriberEligibility, type NewsletterAudienceRecord } from './audience.js';

const eligible: NewsletterAudienceRecord = {
  confirmed_at: '2026-05-28T09:30:53.000Z',
  consent_confirmed_at: '2026-05-28T09:30:53.000Z',
  consent_method: 'double_opt_in',
  consent_evidence: 'confirmation_link',
  audience_classification: 'confirmed_subscriber',
  unsubscribed_at: null,
  active: 1,
  status: 'active'
};

describe('subscriber audience eligibility', () => {
  it('accepts only the complete reviewed direct-consent record', () => {
    expect(classifySubscriberEligibility(eligible)).toBe('eligible');
  });

  it.each([
    ['unconfirmed', { confirmed_at: null }],
    ['consent_unproved', { consent_confirmed_at: null }],
    ['consent_unproved', { consent_method: null }],
    ['consent_unproved', { consent_evidence: 'migration_backfill' }],
    ['audience_unreviewed', { audience_classification: 'legacy_or_unknown' }],
    ['audience_unreviewed', { audience_classification: 'test' }],
    ['audience_unreviewed', { audience_classification: 'internal' }],
    ['audience_unreviewed', { audience_classification: 'bot' }],
    ['suppressed', { unsubscribed_at: '2026-08-12T00:00:00.000Z' }],
    ['suppressed', { active: 0 }],
    ['suppressed', { status: 'bounced' }],
    ['suppressed', { status: 'complained' }]
  ] as const)('excludes %s records', (reason, changed) => {
    expect(classifySubscriberEligibility({ ...eligible, ...changed })).toBe(reason);
  });
});
