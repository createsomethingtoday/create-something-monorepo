import { describe, expect, it, vi } from 'vitest';

import { AirtableClient, AirtableClientError, assertScopedTable, type CollaboratorRef } from './airtable.js';
import { FIELD_IDS, GOVERNANCE_FINDING_FIELD_NAMES, TABLE_IDS } from './schema.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function versionRecord(id: string, reviewer?: CollaboratorRef | null) {
  return {
    id,
    createdTime: '2026-03-11T10:00:00.000Z',
    fields: {
      [FIELD_IDS.versions.assetLink]: ['recAsset'],
      [FIELD_IDS.versions.assetRecordIdRollup]: ['recAsset'],
      [FIELD_IDS.versions.versionNumber]: 3,
      [FIELD_IDS.versions.reviewStatus]: '🏃🏾In Review',
      [FIELD_IDS.versions.reviewType]: 'New Asset',
      [FIELD_IDS.versions.submissionDatetime]: '2026-03-10T18:00:00.000Z',
      [FIELD_IDS.versions.reviewFeedback]: 'Looks good so far.',
      ...(reviewer === undefined ? {} : { [FIELD_IDS.versions.reviewer]: reviewer }),
    },
  };
}

function assetRecord(
  id: string,
  overrides?: Partial<Record<string, unknown>>,
) {
  return {
    id,
    fields: {
      [FIELD_IDS.assets.name]: 'Example App',
      [FIELD_IDS.assets.capabilities]: 'Data Client v2',
      [FIELD_IDS.assets.clientId]: 'client_123',
      [FIELD_IDS.assets.appId]: 'app_123',
      [FIELD_IDS.assets.visibility]: 'Public',
      [FIELD_IDS.assets.latestReviewStatus]: '🏃🏾In Review',
      [FIELD_IDS.assets.marketplaceStatus]: '1️⃣Upcoming🆕',
      [FIELD_IDS.assets.openReviewStatus]: ['🏃🏾In Review'],
      ...(overrides ?? {}),
    },
  };
}

describe('AirtableClient scope and validation', () => {
  it('enforces scoped table IDs', () => {
    expect(() => assertScopedTable('tblRwzpWoLgE9MrUm')).not.toThrow();
    expect(() => assertScopedTable('tblInvalidTable')).toThrowError(AirtableClientError);
  });

  it('rejects unsupported asset metadata keys', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    await expect(
      client.updateAssetMetadata('recAsset', { unknown_key: 'value' }),
    ).rejects.toMatchObject({ code: 'INVALID_ASSET_FIELDS' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects read-only asset metadata keys', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    await expect(
      client.updateAssetMetadata('recAsset', { latest_review_status: '✅Approved' }),
    ).rejects.toMatchObject({ code: 'READ_ONLY_ASSET_FIELDS' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('AirtableClient retry behavior', () => {
  it('retries retryable status codes with backoff and succeeds', async () => {
    const sleeps: number[] = [];
    let callCount = 0;

    const fetchFn = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) return new Response('rate limited', { status: 429 });
      if (callCount === 2) return new Response('upstream error', { status: 503 });
      return jsonResponse({
        records: [{ id: 'rec1', fields: { [FIELD_IDS.assets.name]: 'App One' } }],
      });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      sleepFn: async (ms) => {
        sleeps.push(ms);
      },
      maxRetries: 3,
    });

    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(callCount).toBe(3);
    expect(sleeps.length).toBe(2);
    expect(sleeps[0]).toBeGreaterThan(0);
  });
});

describe('AirtableClient governance findings', () => {
  const fields = GOVERNANCE_FINDING_FIELD_NAMES;

  it('creates governance findings with defaults and linked evidence fields', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        records: Array<{ fields: Record<string, unknown> }>;
      };
      const createdFields = payload.records[0]?.fields ?? {};

      return jsonResponse({
        records: [
          {
            id: 'recFinding',
            createdTime: '2026-06-17T19:00:00.000Z',
            fields: createdFields,
          },
        ],
      });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      governanceBaseId: 'appGovernance',
      governanceFindingsTableId: 'tblGovernance',
    });

    const finding = await client.createGovernanceFinding({
      title: 'Custom Code loader bypass',
      category: 'Runtime Integrity & Custom Code Governance',
      summary: 'Loader pattern can change runtime after review.',
      source_url: 'https://webflow.enterprise.slack.com/archives/C0B9J3E629K/p1781200843327519',
      linked_urls: [
        'https://webflow2579.zendesk.com/agent/tickets/1140194',
        'https://webflow2579.zendesk.com/agent/tickets/1140194',
      ],
      asset_id: 'recAsset',
      version_id: 'recVersion',
      decision_needed: true,
    });

    const callUrl = new URL(String(fetchFn.mock.calls[0]?.[0]));
    const payload = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body)) as {
      records: Array<{ fields: Record<string, unknown> }>;
    };

    expect(callUrl.pathname).toContain('/appGovernance/tblGovernance');
    expect(callUrl.searchParams.get('typecast')).toBe('true');
    expect(payload.records[0]?.fields).toMatchObject({
      [fields.title]: 'Custom Code loader bypass',
      [fields.status]: 'New',
      [fields.priority]: 'P2',
      [fields.category]: 'Runtime Integrity & Custom Code Governance',
      [fields.summary]: 'Loader pattern can change runtime after review.',
      [fields.sourceUrl]: 'https://webflow.enterprise.slack.com/archives/C0B9J3E629K/p1781200843327519',
      [fields.linkedUrls]: 'https://webflow2579.zendesk.com/agent/tickets/1140194',
      [fields.asset]: 'recAsset',
      [fields.assetVersion]: 'recVersion',
      [fields.decisionNeeded]: true,
    });
    expect(finding.findingId).toBe('recFinding');
    expect(finding.linkedUrls).toEqual(['https://webflow2579.zendesk.com/agent/tickets/1140194']);
  });

  it('lists governance findings with status/category/decision filters', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      return jsonResponse({
        records: [
          {
            id: 'recFinding',
            fields: {
              [fields.title]: 'Private app beta contradiction',
              [fields.status]: 'Needs Decision',
              [fields.priority]: 'P1',
              [fields.category]: 'Private App & Beta-Testing Governance',
              [fields.summary]: 'Docs imply same rigorous review and beta testing.',
              [fields.decisionNeeded]: true,
            },
          },
        ],
      });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      governanceBaseId: 'appGovernance',
      governanceFindingsTableId: 'tblGovernance',
    });

    const findings = await client.listGovernanceFindings({
      status: 'Needs Decision',
      category: 'Private App & Beta-Testing Governance',
      decisionNeeded: true,
      limit: 10,
    });

    const url = new URL(String(fetchFn.mock.calls[0]?.[0]));
    expect(url.searchParams.get('filterByFormula')).toContain('Needs Decision');
    expect(url.searchParams.get('filterByFormula')).toContain('Private App & Beta-Testing Governance');
    expect(url.searchParams.get('filterByFormula')).toContain('TRUE()');
    expect(findings[0]).toMatchObject({
      findingId: 'recFinding',
      title: 'Private app beta contradiction',
      decisionNeeded: true,
    });
  });
});

describe('AirtableClient reviewer ownership helpers', () => {
  const reviewer = { id: 'usr_pablo', email: 'pablo.miranda@webflow.com', name: 'Pablo Miranda' };
  const otherReviewer = { id: 'usr_other', email: 'other@webflow.com', name: 'Other Reviewer' };

  function createClient() {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}/rec-version-other`) && (!init?.method || init.method === 'GET')) {
        return jsonResponse(versionRecord('rec-version-other', otherReviewer));
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}/rec-version-self`) && (!init?.method || init.method === 'GET')) {
        return jsonResponse(versionRecord('rec-version-self', reviewer));
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}/rec-version-unassigned`) && (!init?.method || init.method === 'GET')) {
        return jsonResponse(versionRecord('rec-version-unassigned', null));
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}/rec-version-out-of-scope`) && (!init?.method || init.method === 'GET')) {
        return jsonResponse({
          ...versionRecord('rec-version-out-of-scope', null),
          fields: {
            ...versionRecord('rec-version-out-of-scope', null).fields,
            [FIELD_IDS.versions.assetLink]: ['recNotApp'],
            [FIELD_IDS.versions.assetRecordIdRollup]: ['recNotApp'],
          },
        });
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assets}/recAsset`) && (!init?.method || init.method === 'GET')) {
        return jsonResponse(assetRecord('recAsset'));
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assets}/recNotApp`) && (!init?.method || init.method === 'GET')) {
        return jsonResponse({
          id: 'recNotApp',
          fields: {
            [FIELD_IDS.assets.name]: 'Out of Scope Record',
          },
        });
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`) && init?.method === 'PATCH') {
        const payload = JSON.parse(String(init.body)) as {
          records: Array<{ id: string; fields: Record<string, unknown> }>;
        };
        const [{ id, fields }] = payload.records;
        const current =
          id === 'rec-version-self'
            ? versionRecord('rec-version-self', reviewer)
            : versionRecord(id, null);
        return jsonResponse({
          records: [
            {
              ...current,
              fields: {
                ...current.fields,
                ...fields,
              },
            },
          ],
        });
      }

      return new Response('not found', { status: 404 });
    });

    return {
      client: new AirtableClient({
        apiKey: 'token',
        fetchFn,
      }),
      fetchFn,
    };
  }

  it('blocks self-assignment when another reviewer already owns the version', async () => {
    const { client } = createClient();

    await expect(client.assignSelfToVersion('rec-version-other', reviewer)).rejects.toMatchObject({
      code: 'REVIEWER_ASSIGNMENT_CONFLICT',
    });
  });

  it('rejects reviewer-owned helpers for versions outside app-review scope', async () => {
    const { client } = createClient();

    await expect(client.assignSelfToVersion('rec-version-out-of-scope', reviewer)).rejects.toMatchObject({
      code: 'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE',
    });
  });

  it('clears the reviewer field when unassigning the current reviewer', async () => {
    const { client, fetchFn } = createClient();

    const updated = await client.unassignVersionReviewer('rec-version-self', reviewer);

    expect(updated.reviewer).toBeNull();
    expect(fetchFn).toHaveBeenCalled();
  });

  it('requires reviewer ownership before reviewer-owned writes', async () => {
    const { client } = createClient();

    await expect(client.requireAssignedVersion('rec-version-unassigned', reviewer)).rejects.toMatchObject({
      code: 'REVIEWER_ASSIGNMENT_REQUIRED',
    });
  });

  it('returns normalized review context with reviewer flags', async () => {
    const { client } = createClient();

    const context = await client.getReviewContext('rec-version-self', reviewer);

    expect(context.appName).toBe('Example App');
    expect(context.isAssignedToCurrentReviewer).toBe(true);
    expect(context.canAssign).toBe(false);
    expect(context.canReview).toBe(true);
    expect(context.reviewer?.id).toBe('usr_pablo');
  });

  it('finds app_id matches across paginated asset results', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith(`/${TABLE_IDS.assets}`) && !url.searchParams.get('offset')) {
        return jsonResponse({
          records: [
            assetRecord('recAsset1', {
              [FIELD_IDS.assets.appId]: 'app_other',
            }),
          ],
          offset: 'next-page',
        });
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assets}`) && url.searchParams.get('offset') === 'next-page') {
        return jsonResponse({
          records: [
            assetRecord('recAsset2', {
              [FIELD_IDS.assets.name]: 'Target App',
              [FIELD_IDS.assets.appId]: 'app_target',
            }),
          ],
        });
      }

      return new Response('not found', { status: 404 });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    const asset = await client.getAssetByAppId('app_target');

    expect(asset?.assetId).toBe('recAsset2');
    expect(asset?.appName).toBe('Target App');
  });

  it('applies queue limit after reviewer filtering for my_queue-style queries', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith(`/${TABLE_IDS.assets}`)) {
        return jsonResponse({
          records: [
            assetRecord('recAsset1', { [FIELD_IDS.assets.name]: 'Other Queue Item' }),
            assetRecord('recAsset2', { [FIELD_IDS.assets.name]: 'Assigned To Me' }),
          ],
        });
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`)) {
        return jsonResponse({
          records: [
            {
              ...versionRecord('rec-version-1', otherReviewer),
              fields: {
                ...versionRecord('rec-version-1', otherReviewer).fields,
                [FIELD_IDS.versions.assetLink]: ['recAsset1'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAsset1'],
              },
            },
            {
              ...versionRecord('rec-version-2', reviewer),
              fields: {
                ...versionRecord('rec-version-2', reviewer).fields,
                [FIELD_IDS.versions.assetLink]: ['recAsset2'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAsset2'],
              },
            },
          ],
        });
      }

      return new Response('not found', { status: 404 });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
    });

    const result = await client.listAssetQueueDetailed({
      limit: 1,
      assigned: 'assigned',
      onlyAssignedToCurrentReviewer: true,
      currentReviewer: reviewer,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.assetId).toBe('recAsset2');
    expect(result.items[0]?.isAssignedToCurrentReviewer).toBe(true);
  });
});
