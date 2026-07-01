import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGovernanceWriteCredential } from '../../../../lib/server/governance-api-auth';
import {
	createGovernanceDeliveryReceipt,
	filtersFromSearchParams,
	governanceRuntimeErrorStatus,
	listGovernanceDeliveryReceipts,
	normalizeDeliveryReceiptRequestBody
} from '../../../../lib/server/governance-runtime';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance receipts require the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const filters = filtersFromSearchParams(url.searchParams);
		const receipts = await listGovernanceDeliveryReceipts(platform.env.DB, filters);
		return json({
			receipts,
			count: receipts.length,
			filters
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to list governance receipts.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};

export const POST: RequestHandler = async ({ platform, request }) => {
	let body: Record<string, unknown>;

	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Governance receipts require the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const receipt = await createGovernanceDeliveryReceipt(
			platform.env.DB,
			normalizeDeliveryReceiptRequestBody(body)
		);
		return json({ receipt }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create governance receipt.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
