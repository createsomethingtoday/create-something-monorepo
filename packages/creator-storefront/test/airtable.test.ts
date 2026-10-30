import { describe, expect, it, vi } from 'vitest';
import { buildCreatorRecordEmailMatchFormula } from '@create-something/webflow-dashboard-core/creator-email';
import { AirtableAuthoringStore, creatorEmailFormula } from '../src/airtable';
import { StorefrontError } from '../src/errors';
import { STOREFRONT, TABLES } from '../src/fields';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function store(fetchImpl: typeof fetch) {
	return new AirtableAuthoringStore({ apiKey: 'pat-test', fetch: fetchImpl, sleep: async () => {} });
}

describe('creator email matching', () => {
	it('is the dashboard helper itself, not a copy', () => {
		expect(creatorEmailFormula).toBe(buildCreatorRecordEmailMatchFormula);
	});

	it('keeps the shared normalization for separator variants and quoting', () => {
		const formula = creatorEmailFormula('  Creator@Example.com ');
		expect(formula).toContain("FIND(',' & 'creator@example.com' & ','");
		// Commas, spaces and display-name brackets are delimiters on the Airtable side.
		expect(formula).toContain('SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(LOWER(ARRAYJOIN({📧Email}, ",")), " ", ""), "<", ","), ">", ",")');
		expect(formula).toContain('{📧WF Account Email}');
		expect(formula).toContain('{📧Emails}');
		expect(creatorEmailFormula("o'connor@example.com")).toContain('"o\'connor@example.com"');
	});

	it('sends exactly the shared formula and fails closed on unquotable input', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({ records: [{ id: 'recCREATOR0000001', fields: {} }] }));
		const adapter = store(fetchMock as unknown as typeof fetch);
		await adapter.findCreatorsByEmail('Creator@Example.com');
		const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
		expect(url.searchParams.get('filterByFormula')).toBe(buildCreatorRecordEmailMatchFormula('Creator@Example.com'));
		expect(url.searchParams.get('returnFieldsByFieldId')).toBe('true');

		await expect(adapter.findCreatorsByEmail(`a'b"c@example.com`)).rejects.toMatchObject({ code: 'invalid_request' });
	});
});

describe('transport', () => {
	it('retries transient read failures a bounded number of times', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 429 }))
			.mockRejectedValueOnce(new TypeError('network'))
			.mockResolvedValueOnce(jsonResponse({ id: 'recSTOREFRONT0001', fields: { [STOREFRONT.draftVersion]: 4 } }));
		const record = await store(fetchMock as unknown as typeof fetch).readStorefront('recSTOREFRONT0001');
		expect(record.draftVersion).toBe(4);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('stops after the retry budget is exhausted', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 503 }));
		await expect(store(fetchMock as unknown as typeof fetch).readStorefront('recSTOREFRONT0001')).rejects.toMatchObject({
			code: 'upstream_unavailable'
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('never retries writes: an uncertain write is left to the writer intents', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 503 }));
		await expect(
			store(fetchMock as unknown as typeof fetch).updateStorefront('recSTOREFRONT0001', { draftVersion: 2 })
		).rejects.toMatchObject({ code: 'upstream_unavailable' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('maps permanent rejections without leaking the provider body', async () => {
		const fetchMock = vi.fn(async () => new Response('{"error":{"type":"INVALID_PERMISSIONS"}}', { status: 403 }));
		let caught: unknown;
		try {
			await store(fetchMock as unknown as typeof fetch).readStorefront('recSTOREFRONT0001');
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(StorefrontError);
		const error = caught as StorefrontError;
		expect(error.code).toBe('upstream_rejected');
		expect(JSON.stringify(error.toJSON())).not.toContain('INVALID_PERMISSIONS');
	});

	it('writes by field ID to the verified tables', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({ records: [{ id: 'recSTOREFRONT0002', fields: {} }] }));
		await store(fetchMock as unknown as typeof fetch).createStorefront('recCREATOR0000001');
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain(`/v0/appMoIgXMTTTNIc3p/${TABLES.storefronts}`);
		expect(JSON.parse(String(init.body))).toEqual({
			records: [
				{
					fields: {
						[STOREFRONT.creator]: ['recCREATOR0000001'],
						[STOREFRONT.draftVersion]: 0,
						[STOREFRONT.status]: 'Never published'
					}
				}
			]
		});
	});
});
