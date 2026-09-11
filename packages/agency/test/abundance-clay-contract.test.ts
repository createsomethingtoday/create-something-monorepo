import test from 'node:test';
import assert from 'node:assert/strict';
import { clayRequestSchema, clayResultSchema } from '../src/lib/server/abundance-clay-contract';
const contact = {
  type: 'phone',
  value: '+15185550100',
  source_url: 'https://clinic.example/staff',
  publication_context: 'professional_contact',
  evidence_quote: 'For appointments call 518-555-0100'
};
test('requires explicit paid request for one exact NPI', () => {
  assert.equal(
    clayRequestSchema.safeParse({ npi: '1003297599', confirm_paid_enrichment: false }).success,
    false
  );
  assert.equal(
    clayRequestSchema.safeParse({ npi: '1003297599', confirm_paid_enrichment: true }).success,
    true
  );
});
test('rejects private contacts, unsafe sources and contradictory outcomes', () => {
  const result = {
    outcome: 'candidate',
    identity_evidence: 'NPI matches public staff profile',
    contacts: [contact]
  };
  assert.equal(clayResultSchema.safeParse(result).success, true);
  for (const patch of [
    { publication_context: 'personal' },
    { source_url: 'http://localhost' },
    { evidence_quote: '' }
  ])
    assert.equal(
      clayResultSchema.safeParse({ ...result, contacts: [{ ...contact, ...patch }] }).success,
      false
    );
  assert.equal(clayResultSchema.safeParse({ ...result, outcome: 'no_match' }).success, false);
  assert.equal(
    clayResultSchema.safeParse({
      outcome: 'no_match',
      identity_evidence: 'No matching public profile',
      contacts: []
    }).success,
    true
  );
});
