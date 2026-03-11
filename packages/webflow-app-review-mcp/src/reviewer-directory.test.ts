import { describe, expect, it } from 'vitest';

import { getReviewerProfileForAccount, parseReviewerDirectory } from './reviewer-directory.js';

describe('reviewer directory', () => {
  it('parses object-shaped reviewer directory payloads', () => {
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

  it('parses array-shaped reviewer directory payloads', () => {
    const directory = parseReviewerDirectory(
      JSON.stringify([
        {
          accountId: 'acct_wf_shea',
          airtableCollaboratorId: 'usr_shea',
          email: 'shea.sisco@webflow.com',
          name: 'Shea Sisco',
        },
      ]),
    );

    expect(getReviewerProfileForAccount(directory, 'acct_wf_shea')).toEqual({
      accountId: 'acct_wf_shea',
      airtableCollaboratorId: 'usr_shea',
      email: 'shea.sisco@webflow.com',
      name: 'Shea Sisco',
    });
  });

  it('returns null when account context is missing or unknown', () => {
    const directory = parseReviewerDirectory('');

    expect(getReviewerProfileForAccount(directory, null)).toBeNull();
    expect(getReviewerProfileForAccount(directory, 'acct_missing')).toBeNull();
  });
});
