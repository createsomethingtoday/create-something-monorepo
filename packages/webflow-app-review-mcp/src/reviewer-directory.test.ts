import { describe, expect, it } from 'vitest';

import { getReviewerProfileForAccount, parseReviewerDirectory } from './reviewer-directory.js';

describe('parseReviewerDirectory', () => {
  it('parses object-shaped reviewer directories', () => {
    const directory = parseReviewerDirectory(
      JSON.stringify({
        acct_wf_pablo: {
          airtableCollaboratorId: 'usr_pablo',
          email: 'pablo.miranda@webflow.com',
          name: 'Pablo Miranda',
          lane: 'wf-app-review-pablo',
        },
      }),
    );

    expect(getReviewerProfileForAccount(directory, 'acct_wf_pablo')).toEqual({
      accountId: 'acct_wf_pablo',
      airtableCollaboratorId: 'usr_pablo',
      email: 'pablo.miranda@webflow.com',
      name: 'Pablo Miranda',
      lane: 'wf-app-review-pablo',
    });
  });

  it('returns null for unknown accounts', () => {
    const directory = parseReviewerDirectory();
    expect(getReviewerProfileForAccount(directory, 'acct_missing')).toBeNull();
  });
});
