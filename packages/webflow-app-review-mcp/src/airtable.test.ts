import { describe, expect, it, vi } from 'vitest';

import { AirtableClient, AirtableClientError, assertScopedTable, findRawHtmlTag, type CollaboratorRef } from './airtable.js';
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

describe('AirtableClient exception handling', () => {
  it('paces every pending-version page after the first', async () => {
    const sleeps: number[] = [];
    let page = 0;
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`)).toBe(true);
      page += 1;
      return jsonResponse({
        records: [],
        ...(page < 6 ? { offset: `page-${page + 1}` } : {}),
      });
    });
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      sleepFn: async (ms) => {
        sleeps.push(ms);
      },
    });

    await expect(client.listPendingExceptionQueue()).resolves.toEqual([]);

    expect(fetchFn).toHaveBeenCalledTimes(6);
    expect(sleeps).toEqual([250, 250, 250, 250, 250]);
  });

  it('paces pending exception queue asset hydration sequentially', async () => {
    let activeAssetRequests = 0;
    let maxActiveAssetRequests = 0;
    const sleeps: number[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`)) {
        return jsonResponse({
          records: [
            {
              ...versionRecord('recVersionA'),
              fields: {
                ...versionRecord('recVersionA').fields,
                [FIELD_IDS.versions.assetLink]: ['recAssetA'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAssetA'],
                [FIELD_IDS.versions.exceptionStatus]: '🆕Requested',
                [FIELD_IDS.versions.exceptionItemsLink]: Array.from(
                  { length: 101 },
                  (_, index) => `recException${index}`,
                ),
              },
            },
            {
              ...versionRecord('recVersionB'),
              fields: {
                ...versionRecord('recVersionB').fields,
                [FIELD_IDS.versions.assetLink]: ['recAssetB'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAssetB'],
                [FIELD_IDS.versions.exceptionStatus]: '👀Under Review',
              },
            },
          ],
        });
      }

      const assetMatch = url.pathname.match(new RegExp(`/${TABLE_IDS.assets}/(recAsset[AB])$`));
      if (assetMatch) {
        activeAssetRequests += 1;
        maxActiveAssetRequests = Math.max(maxActiveAssetRequests, activeAssetRequests);
        await Promise.resolve();
        activeAssetRequests -= 1;
        return jsonResponse(assetRecord(assetMatch[1]!));
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.exceptions}`)) {
        return jsonResponse({ records: [] });
      }

      return new Response('not found', { status: 404 });
    });
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      sleepFn: async (ms) => {
        sleeps.push(ms);
      },
    });

    const queue = await client.listPendingExceptionQueue();

    expect(queue).toHaveLength(2);
    expect(maxActiveAssetRequests).toBe(1);
    expect(sleeps).toEqual([250, 250, 250, 250, 250]);
    const exceptionReads = fetchFn.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith(`/${TABLE_IDS.exceptions}`));
    expect(exceptionReads).toHaveLength(3);
  });

  it('queues versions with undecided items even when the aggregate status is decided or unset', async () => {
    let capturedFormula: string | undefined;
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`)) {
        capturedFormula = url.searchParams.get('filterByFormula') ?? undefined;
        return jsonResponse({
          records: [
            {
              ...versionRecord('recVersionDeniedAggregate'),
              fields: {
                ...versionRecord('recVersionDeniedAggregate').fields,
                [FIELD_IDS.versions.assetLink]: ['recAssetA'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAssetA'],
                [FIELD_IDS.versions.exceptionStatus]: '❌Denied',
                [FIELD_IDS.versions.undecidedExceptionItems]: 9,
              },
            },
            {
              ...versionRecord('recVersionNoAggregate'),
              fields: {
                ...versionRecord('recVersionNoAggregate').fields,
                [FIELD_IDS.versions.assetLink]: ['recAssetB'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAssetB'],
                [FIELD_IDS.versions.undecidedExceptionItems]: 3,
              },
            },
            {
              ...versionRecord('recVersionSettled'),
              fields: {
                ...versionRecord('recVersionSettled').fields,
                [FIELD_IDS.versions.assetLink]: ['recAssetA'],
                [FIELD_IDS.versions.assetRecordIdRollup]: ['recAssetA'],
                [FIELD_IDS.versions.exceptionStatus]: '❌Denied',
                [FIELD_IDS.versions.undecidedExceptionItems]: 0,
              },
            },
          ],
        });
      }

      const assetMatch = url.pathname.match(new RegExp(`/${TABLE_IDS.assets}/(recAsset[AB])$`));
      if (assetMatch) {
        return jsonResponse(assetRecord(assetMatch[1]!));
      }

      if (url.pathname.endsWith(`/${TABLE_IDS.exceptions}`)) {
        return jsonResponse({ records: [] });
      }

      return new Response('not found', { status: 404 });
    });
    const client = new AirtableClient({
      apiKey: 'token',
      fetchFn,
      sleepFn: async () => {},
    });

    const queue = await client.listPendingExceptionQueue();

    expect(capturedFormula).toContain(`{${FIELD_IDS.versions.undecidedExceptionItems}} > 0`);
    expect(queue.map((entry) => entry.version.versionId)).toEqual([
      'recVersionDeniedAggregate',
      'recVersionNoAggregate',
    ]);
  });

  it('writes exception and hold fields via updateVersionReview', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        records: Array<{ id: string; fields: Record<string, unknown> }>;
      };
      return jsonResponse({
        records: [{ id: payload.records[0]!.id, fields: payload.records[0]!.fields }],
      });
    });

    const client = new AirtableClient({ apiKey: 'token', fetchFn });
    await client.updateVersionReview('recVersion', {
      exception_status: '🆕Requested',
      exception_type: 'Guideline',
      exception_rationale: 'Pattern covered by 7/24 principles.',
      hold_reason: 'Pending Exception Decision',
      hold_notes: 'Awaiting partner-lead decision.',
    });

    const payload = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body)) as {
      records: Array<{ fields: Record<string, unknown> }>;
    };
    expect(payload.records[0]?.fields).toMatchObject({
      [FIELD_IDS.versions.exceptionStatus]: '🆕Requested',
      [FIELD_IDS.versions.exceptionType]: 'Guideline',
      [FIELD_IDS.versions.exceptionRationale]: 'Pattern covered by 7/24 principles.',
      [FIELD_IDS.versions.holdReason]: 'Pending Exception Decision',
      [FIELD_IDS.versions.holdNotes]: 'Awaiting partner-lead decision.',
    });
  });

  it('rejects invalid exception status and hold reason without calling Airtable', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({ apiKey: 'token', fetchFn });

    await expect(
      client.updateVersionReview('recVersion', { exception_status: 'Approved' }),
    ).rejects.toMatchObject({ code: 'INVALID_EXCEPTION_STATUS' });
    await expect(
      client.updateVersionReview('recVersion', { hold_reason: 'Vacation' }),
    ).rejects.toMatchObject({ code: 'INVALID_HOLD_REASON' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('creates exception items linked to a version without setting status', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        records: Array<{ fields: Record<string, unknown> }>;
      };
      return jsonResponse({
        records: [{ id: 'recItem1', fields: payload.records[0]!.fields }],
      });
    });

    const client = new AirtableClient({ apiKey: 'token', fetchFn });
    const item = await client.createExceptionItem({
      asset_version_id: 'recVersion',
      item: 'Remote-hosted mutable consent engine',
      exception_type: 'Guideline',
      rationale: 'Covered by the Consent Pro v45 precedent.',
    });

    const callUrl = new URL(String(fetchFn.mock.calls[0]?.[0]));
    expect(callUrl.pathname).toContain(`/${TABLE_IDS.exceptions}`);

    const payload = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body)) as {
      records: Array<{ fields: Record<string, unknown> }>;
    };
    expect(payload.records[0]?.fields).toMatchObject({
      [FIELD_IDS.exceptions.item]: 'Remote-hosted mutable consent engine',
      [FIELD_IDS.exceptions.assetVersionLink]: ['recVersion'],
      [FIELD_IDS.exceptions.type]: 'Guideline',
    });
    expect(payload.records[0]?.fields).not.toHaveProperty(FIELD_IDS.exceptions.status);
    expect(item.exceptionItemId).toBe('recItem1');
  });

  it('validates exception item status on update', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({ apiKey: 'token', fetchFn });

    await expect(
      client.updateExceptionItem('recItem1', { exception_status: 'Denied' }),
    ).rejects.toMatchObject({ code: 'INVALID_EXCEPTION_STATUS' });
    await expect(client.updateExceptionItem('recItem1', {})).rejects.toMatchObject({
      code: 'NO_MUTATION_FIELDS',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('lists exception items via the version link field', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.includes(`/${TABLE_IDS.assetVersions}/`)) {
        return jsonResponse({
          id: 'recVersion',
          fields: {
            [FIELD_IDS.versions.assetLink]: ['recAsset'],
            [FIELD_IDS.versions.exceptionItemsLink]: ['recItem1', 'recItem2'],
          },
        });
      }
      expect(url.pathname).toContain(`/${TABLE_IDS.exceptions}`);
      expect(url.searchParams.get('filterByFormula')).toContain("RECORD_ID() = 'recItem1'");
      return jsonResponse({
        records: [
          {
            id: 'recItem1',
            fields: {
              [FIELD_IDS.exceptions.item]: 'Item A',
              [FIELD_IDS.exceptions.assetVersionLink]: ['recVersion'],
              [FIELD_IDS.exceptions.status]: '🆕Requested',
              [FIELD_IDS.exceptions.undecided]: 1,
              [FIELD_IDS.exceptions.denied]: 0,
            },
          },
          {
            id: 'recItem2',
            fields: {
              [FIELD_IDS.exceptions.item]: 'Item B',
              [FIELD_IDS.exceptions.assetVersionLink]: ['recVersion'],
              [FIELD_IDS.exceptions.status]: '❌Denied',
              [FIELD_IDS.exceptions.undecided]: 0,
              [FIELD_IDS.exceptions.denied]: 1,
            },
          },
        ],
      });
    });

    const client = new AirtableClient({ apiKey: 'token', fetchFn });
    const items = await client.listExceptionItems('recVersion');

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      exceptionItemId: 'recItem1',
      item: 'Item A',
      exceptionStatus: '🆕Requested',
      isUndecided: true,
      isDenied: false,
    });
    expect(items[1]).toMatchObject({ isUndecided: false, isDenied: true });
  });
});

describe('raw HTML feedback guard', () => {
  it('findRawHtmlTag detects tag-shaped sequences but not autolinks or comparisons', () => {
    // The truncation cases: backtick-wrapped raw tags still truncate today
    // (Onart ZD 1170959; Wistia ZD 1170775 cut off at a literal <script> reference).
    expect(findRawHtmlTag('A `<script type="application/ld+json">` block now appears on every page')).toBe(
      '<script type="application/ld+json">',
    );
    expect(findRawHtmlTag('Your extension dynamically creates a `<script>` tag')).toBe('<script>');
    expect(findRawHtmlTag('close the </div> properly')).toBe('</div>');
    expect(findRawHtmlTag('use <br/> sparingly')).toBe('<br/>');

    expect(findRawHtmlTag('see <https://example.com/a?b=1> for details')).toBeNull();
    expect(findRawHtmlTag('when x < y the loop exits')).toBeNull();
    expect(findRawHtmlTag('rated <3 by users')).toBeNull();
    expect(findRawHtmlTag('plain feedback with `backticked code` and **bold**')).toBeNull();
  });

  it('updateVersionReview rejects raw HTML tags in creator-facing feedback before calling Airtable', async () => {
    const fetchFn = vi.fn();
    const client = new AirtableClient({ apiKey: 'token', fetchFn });

    await expect(
      client.updateVersionReview('recVersion', {
        review_feedback: 'Remove the `<script type="application/ld+json">` block from every page.',
      }),
    ).rejects.toMatchObject({
      code: 'RAW_HTML_IN_FEEDBACK',
      details: { field: 'review_feedback', tag: '<script type="application/ld+json">' },
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('updateVersionReview accepts feedback that references tags without angle brackets', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        records: Array<{ id: string; fields: Record<string, unknown> }>;
      };
      return jsonResponse({
        records: [{ id: payload.records[0]!.id, fields: payload.records[0]!.fields }],
      });
    });
    const client = new AirtableClient({ apiKey: 'token', fetchFn });

    await client.updateVersionReview('recVersion', {
      review_feedback: 'Remove the `script type="application/ld+json"` block; see <https://example.com/docs>.',
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
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
    expect(sleeps).toEqual([30_000, 400]);
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
      governanceApiKey: 'governance-token',
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
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer governance-token',
    });
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

describe('AirtableClient app review context and queue helpers', () => {
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

  it('returns neutral normalized review context with assignment state', async () => {
    const { client } = createClient();

    const context = await client.getReviewContext('rec-version-self');

    expect(context.appName).toBe('Example App');
    expect(context.isAssigned).toBe(true);
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

  it('applies queue limit after neutral assignment filtering', async () => {
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
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isAssigned).toBe(true);
  });
});

describe('AirtableClient queue stats aggregation', () => {
  function statsVersionRecord(
    id: string,
    assetId: string,
    submissionDatetime: string,
    reviewType: string,
    reviewStatus: string,
    versionNumber = 1,
  ) {
    return {
      id,
      createdTime: submissionDatetime,
      fields: {
        [FIELD_IDS.versions.assetLink]: [assetId],
        [FIELD_IDS.versions.assetRecordIdRollup]: [assetId],
        [FIELD_IDS.versions.versionNumber]: versionNumber,
        [FIELD_IDS.versions.reviewStatus]: reviewStatus,
        [FIELD_IDS.versions.reviewType]: reviewType,
        [FIELD_IDS.versions.submissionDatetime]: submissionDatetime,
      },
    };
  }

  function createStatsClient(versions: unknown[], assets: unknown[]) {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`)) {
        return jsonResponse({ records: versions });
      }
      if (url.pathname.endsWith(`/${TABLE_IDS.assets}`)) {
        return jsonResponse({ records: assets });
      }
      return new Response('not found', { status: 404 });
    });
    return { client: new AirtableClient({ apiKey: 'token', fetchFn }), fetchFn };
  }

  it('aggregates in-window app submissions across two dimensions and excludes out-of-scope versions', async () => {
    const { client, fetchFn } = createStatsClient(
      [
        statsVersionRecord('verJun', 'recAsset', '2026-06-15T12:00:00.000Z', 'New Asset', '✅Approved'),
        statsVersionRecord('verJul', 'recAsset2', '2026-07-10T12:00:00.000Z', 'Meta Update', '🚫Rejected'),
        statsVersionRecord('verTemplate', 'recTemplate', '2026-07-01T12:00:00.000Z', 'New Asset', '✅Approved'),
        // Returned by the (slack-widened) formula pre-filter but outside the exact window.
        statsVersionRecord('verOld', 'recAsset', '2026-01-05T12:00:00.000Z', 'New Asset', '✅Approved'),
      ],
      [
        assetRecord('recAsset'),
        assetRecord('recAsset2'),
        { id: 'recTemplate', fields: { [FIELD_IDS.assets.name]: 'Template Record' } },
      ],
    );

    const stats = await client.getQueueStats({
      groupBy: ['month', 'review_type'],
      submittedAfter: '2026-06-01',
      submittedBefore: '2026-08-20',
    });

    expect(stats.total).toBe(2);
    expect(stats.outOfScopeVersionsExcluded).toBe(1);
    expect(stats.window).toEqual({
      submittedAfter: '2026-06-01T00:00:00.000Z',
      submittedBefore: '2026-08-20T23:59:59.999Z',
    });
    expect(stats.groups).toEqual([
      { key: '2026-06', count: 1, breakdown: [{ key: 'New Asset', count: 1 }] },
      { key: '2026-07', count: 1, breakdown: [{ key: 'Meta Update', count: 1 }] },
    ]);

    const versionsCall = fetchFn.mock.calls
      .map((call) => new URL(String(call[0])))
      .find((url) => url.pathname.endsWith(`/${TABLE_IDS.assetVersions}`));
    const formula = versionsCall?.searchParams.get('filterByFormula') ?? '';
    expect(formula).toContain('IS_BEFORE');
    expect(formula).toContain('IS_AFTER');
    expect(formula).toContain(FIELD_IDS.versions.submissionDatetime);
  });

  it('counts latest version per asset when count mode is assets', async () => {
    const { client } = createStatsClient(
      [
        statsVersionRecord('ver1', 'recAsset', '2026-06-01T12:00:00.000Z', 'New Asset', '✅Approved', 1),
        statsVersionRecord('ver2', 'recAsset', '2026-07-01T12:00:00.000Z', 'Asset Update', '✅Approved', 2),
      ],
      [assetRecord('recAsset')],
    );

    const stats = await client.getQueueStats({ groupBy: ['review_type'], countMode: 'assets' });

    expect(stats.total).toBe(1);
    expect(stats.groups).toEqual([{ key: 'Asset Update', count: 1 }]);
  });

  it('rejects malformed window bounds before calling Airtable', async () => {
    const { client, fetchFn } = createStatsClient([], []);

    await expect(client.getQueueStats({ submittedAfter: 'not-a-date' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
