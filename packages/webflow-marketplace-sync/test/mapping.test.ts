import { describe, expect, it } from 'vitest';
import { deriveStatus, diffRow, fieldsFromDiffs, isMalformedUniqueId, mapItemToRow } from '../src/mapping';
import { makeItem } from './support/mocks';

describe('deriveStatus', () => {
  it('mirrors the Whalesync Webflow Status values', () => {
    expect(deriveStatus({ isArchived: false, isDraft: false })).toBe('Active');
    expect(deriveStatus({ isArchived: false, isDraft: true })).toBe('Draft');
    // Archived wins over draft, matching Webflow's own item state display.
    expect(deriveStatus({ isArchived: true, isDraft: true })).toBe('Archived');
  });
});

describe('mapItemToRow', () => {
  it('maps every field the Whalesync sync-log mapping covers', () => {
    const row = mapItemToRow(makeItem());
    expect(row).toEqual({
      Name: 'Testflow',
      Status: 'Active',
      Slug: 'testflow-website-template',
      'MRP ID': '64a000000000000000000abc',
      'Sync Source': 'Whalesync',
      'Sync Record ID': 'recASSET0000000001',
      'Webflow Record ID': 'item00000000000000000001',
      'WF Created': '2026-08-01T12:00:00.000Z',
      'WF Last Updated': '2026-08-02T12:00:00.000Z',
      'Approval Date': '2026-07-30T10:00:00.000Z',
    });
  });

  it('handles missing field data without throwing', () => {
    const row = mapItemToRow(makeItem({ fieldData: { name: undefined, slug: undefined, 'unique-id': undefined, 'sync-source': undefined, 'sync-record-id': undefined, 'creation-date': undefined } }));
    expect(row.Name).toBe('');
    expect(row['MRP ID']).toBe('');
    expect(row['Approval Date']).toBeNull();
  });
});

describe('diffRow', () => {
  it('returns no diffs for an identical row', () => {
    const item = makeItem();
    const expected = mapItemToRow(item);
    const record = { id: 'rec1', fields: { ...expected } as Record<string, unknown> };
    expect(diffRow(expected, record)).toEqual([]);
  });

  it('treats equivalent dateTime formats as equal (Airtable normalizes ISO strings)', () => {
    const expected = mapItemToRow(makeItem());
    const record = {
      id: 'rec1',
      fields: {
        ...expected,
        'WF Created': '2026-08-01T12:00:00.000+00:00',
        'Approval Date': '2026-07-30T10:00:00Z',
      } as Record<string, unknown>,
    };
    expect(diffRow(expected, record)).toEqual([]);
  });

  it('detects material drift and builds a minimal patch', () => {
    const expected = mapItemToRow(makeItem());
    const record = {
      id: 'rec1',
      fields: { ...expected, 'MRP ID': '64a000000000000000000abcd', Slug: 'old-slug' } as Record<string, unknown>,
    };
    const diffs = diffRow(expected, record);
    expect(diffs.map((d) => d.field).sort()).toEqual(['MRP ID', 'Slug']);
    expect(fieldsFromDiffs(expected, diffs)).toEqual({
      'MRP ID': '64a000000000000000000abc',
      Slug: 'testflow-website-template',
    });
  });

  it('treats null/empty as equal (Airtable omits empty fields)', () => {
    const expected = mapItemToRow(makeItem({ fieldData: { 'creation-date': undefined } }));
    const record = { id: 'rec1', fields: { ...expected } as Record<string, unknown> };
    delete record.fields['Approval Date'];
    expect(diffRow(expected, record)).toEqual([]);
  });
});

describe('isMalformedUniqueId', () => {
  it('accepts a valid 24-hex ObjectId', () => {
    expect(isMalformedUniqueId('64a000000000000000000abc')).toBe(false);
  });
  it('flags the documented breakage classes', () => {
    expect(isMalformedUniqueId('64a000000000000000000abcd')).toBe(true); // extra char (Finanex)
    expect(isMalformedUniqueId('a30467aef97aa967ff0821e')).toBe(true); // dropped char (Brivo)
    expect(isMalformedUniqueId('/templates/html/yoginest-website-template')).toBe(true); // pasted URL (YogiNest)
  });
  it('does not flag empty values (separate "MRP ID missing" class)', () => {
    expect(isMalformedUniqueId('')).toBe(false);
    expect(isMalformedUniqueId('  ')).toBe(false);
  });
  it('trims surrounding whitespace like the render path does', () => {
    expect(isMalformedUniqueId('64a000000000000000000abc\n')).toBe(false);
  });
});
