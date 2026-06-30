import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createGovernanceSignal,
	filtersFromSearchParams,
	governanceRuntimeErrorStatus,
	listGovernanceSignals,
	normalizeSignalRequestBody
} from '../../../../lib/server/governance-runtime';
import { verifyGovernanceWriteCredential } from '../../../../lib/server/governance-api-auth';

export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance signals require the Cloudflare D1 binding.' }, { status: 503 });
	}

	try {
		const filters = filtersFromSearchParams(url.searchParams);
		const signals = await listGovernanceSignals(platform.env.DB, filters);
		return json({
			signals,
			count: signals.length,
			filters
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to list governance signals.' },
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
		return json({ error: 'Governance signals require the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const signal = await createGovernanceSignal(platform.env.DB, normalizeSignalRequestBody(body));
		return json({ signal }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create governance signal.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
