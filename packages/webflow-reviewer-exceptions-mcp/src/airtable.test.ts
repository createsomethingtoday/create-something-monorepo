import { describe, expect, it, vi } from 'vitest';

import { AirtableClient } from './airtable.js';
import { REVIEWER_EXCEPTION_FIELD_NAMES } from './schema.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AirtableClient reviewer exceptions', () => {
  const fields = REVIEWER_EXCEPTION_FIELD_NAMES;

  it('creates retrievable active reviewer exceptions when explicitly published', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        records: Array<{ fields: Record<string, unknown> }>;
      };
      const createdFields = payload.records[0]?.fields ?? {};
      expect(createdFields[fields.title]).toBe('Utility page slug exception');
      expect(createdFields[fields.knowledgeStatus]).toBe('Active');
      expect(createdFields[fields.includeInDifyRetrieval]).toBe(true);
      expect(createdFields[fields.lastReviewedAt]).toEqual(expect.any(String));
      return jsonResponse({
        records: [
          {
            id: 'recException',
            createdTime: '2026-06-23T20:00:00.000Z',
            fields: createdFields,
          },
        ],
      });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      baseId: 'appExceptions',
      tableId: 'tblExceptions',
      fetchFn,
    });

    const exception = await client.createReviewerException({
      title: 'Utility page slug exception',
      guidance: 'Nested utility pages are acceptable when they are discoverable and return 200.',
      scope: 'Template Review',
      include_in_dify_retrieval: true,
    });

    expect(exception.exceptionId).toBe('recException');
    expect(exception.knowledgeStatus).toBe('Active');
    expect(exception.includeInDifyRetrieval).toBe(true);
  });

  it('updates reviewer exception records through PATCH', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain('/tblExceptions/recException');
      expect(init?.method).toBe('PATCH');
      const payload = JSON.parse(String(init?.body)) as { fields: Record<string, unknown> };
      expect(payload.fields[fields.knowledgeStatus]).toBe('Expired');
      expect(payload.fields[fields.includeInDifyRetrieval]).toBe(false);
      return jsonResponse({
        id: 'recException',
        fields: {
          [fields.title]: 'Utility page slug exception',
          ...payload.fields,
        },
      });
    });

    const client = new AirtableClient({
      apiKey: 'token',
      baseId: 'appExceptions',
      tableId: 'tblExceptions',
      fetchFn,
    });

    const exception = await client.updateReviewerException({
      exceptionId: 'recException',
      knowledge_status: 'Expired',
      include_in_dify_retrieval: false,
    });

    expect(exception.exceptionId).toBe('recException');
    expect(exception.knowledgeStatus).toBe('Expired');
    expect(exception.includeInDifyRetrieval).toBe(false);
  });

  it('retrieves only approved or active reviewer exception knowledge records', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        records: [
          {
            id: 'recApproved',
            fields: {
              [fields.title]: 'OAuth callback exception',
              [fields.guidance]: 'Allow approval with caveat when OAuth callback is documented.',
              [fields.knowledgeStatus]: 'Approved',
              [fields.includeInDifyRetrieval]: true,
              [fields.scope]: 'App Review',
            },
          },
          {
            id: 'recDraft',
            fields: {
              [fields.title]: 'Draft exception',
              [fields.guidance]: 'This should not be retrievable.',
              [fields.knowledgeStatus]: 'Draft',
              [fields.includeInDifyRetrieval]: true,
            },
          },
          {
            id: 'recExpired',
            fields: {
              [fields.title]: 'Expired exception',
              [fields.guidance]: 'This should not be retrievable.',
              [fields.knowledgeStatus]: 'Active',
              [fields.includeInDifyRetrieval]: true,
              [fields.expiresAt]: '2020-01-01',
            },
          },
        ],
      }),
    );

    const client = new AirtableClient({
      apiKey: 'token',
      baseId: 'appExceptions',
      tableId: 'tblExceptions',
      fetchFn,
    });

    const records = await client.retrieveReviewerExceptionKnowledge({
      query: 'oauth callback approval caveat',
      topK: 3,
      scoreThreshold: 0,
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.title).toBe('OAuth callback exception');
    expect(records[0]?.metadata.airtable_record_id).toBe('recApproved');
  });
});
