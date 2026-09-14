import { describe, expect, it } from 'vitest';
import { AirtableClient } from './airtable.js';
import { APP_REVIEW_FIELD_MAP, FIELD_IDS, TABLE_IDS } from './schema.js';

const rejectionField = 'fldXIdcnOQXLVrsuN';
const rejectionText = '- **First finding**\n- Second finding with `code`\n';

describe('separate rejection feedback read contract', () => {
  it.each([undefined, 'Draft requested changes'])('preserves rejection feedback alongside review feedback %s', async (reviewFeedback) => {
    const record = { id: 'recVersion', fields: {
      [FIELD_IDS.versions.assetLink]: ['recAsset'],
      [FIELD_IDS.versions.versionNumber]: 11,
      [FIELD_IDS.versions.rejectionReason]: 'Guideline Infringement',
      [rejectionField]: rejectionText,
      ...(reviewFeedback ? { [FIELD_IDS.versions.reviewFeedback]: reviewFeedback } : {}),
    } };
    const client = new AirtableClient({ apiKey: 'fixture', fetchFn: async (input) => {
      const url = new URL(String(input));
      const isAsset = url.pathname.includes(TABLE_IDS.assets);
      const isList = url.pathname.endsWith(TABLE_IDS.assetVersions);
      if (isList) expect(url.searchParams.getAll('fields[]')).toContain(rejectionField);
      return new Response(JSON.stringify(isAsset ? { id: 'recAsset', fields: {
        [FIELD_IDS.assets.name]: 'CMS Smart Sync',
        [FIELD_IDS.assets.capabilities]: 'Data Client v2',
        [FIELD_IDS.assets.clientId]: 'client',
      } } : isList ? { records: [record] } : record));
    } });
    const version = await client.getVersionById('recVersion');
    expect(version).toMatchObject({ rejectionFeedback: rejectionText, rejectionReason: 'Guideline Infringement' });
    expect(version?.reviewFeedback).toBe(reviewFeedback);
    const context = await client.getReviewContext('recVersion');
    expect(context).toMatchObject({ rejectionFeedback: rejectionText, version: { rejectionFeedback: rejectionText } });
    expect(context.reviewFeedback).toBe(reviewFeedback);
    expect(await client.listVersionsForAsset('recAsset')).toEqual([version]);
  });

  it('advertises rejection feedback as read-only', () => {
    expect(APP_REVIEW_FIELD_MAP.versions.readOnly).toHaveProperty('rejection_feedback', rejectionField);
    expect(APP_REVIEW_FIELD_MAP.versions.writable).not.toHaveProperty('rejection_feedback');
  });
});
