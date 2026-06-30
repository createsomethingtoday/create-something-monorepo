import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createGovernanceDecision,
	filtersFromSearchParams,
	governanceRuntimeErrorStatus,
	listGovernanceDecisions,
	normalizeDecisionRequestBody
} from '../../../../lib/server/governance-runtime';

export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance decisions require the Cloudflare D1 binding.' }, { status: 503 });
	}

	try {
		const filters = filtersFromSearchParams(url.searchParams);
		const decisions = await listGovernanceDecisions(platform.env.DB, filters);
		return json({
			decisions,
			count: decisions.length,
			filters
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to list governance decisions.' },
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
		return json({ error: 'Governance decisions require the Cloudflare D1 binding.' }, { status: 503 });
	}

	try {
		const decision = await createGovernanceDecision(platform.env.DB, normalizeDecisionRequestBody(body));
		return json({ decision }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create governance decision.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
