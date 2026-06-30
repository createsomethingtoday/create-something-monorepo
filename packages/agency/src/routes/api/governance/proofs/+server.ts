import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createGovernanceProof,
	filtersFromSearchParams,
	governanceRuntimeErrorStatus,
	listGovernanceProofs,
	normalizeProofRequestBody
} from '../../../../lib/server/governance-runtime';

export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance proofs require the Cloudflare D1 binding.' }, { status: 503 });
	}

	try {
		const filters = filtersFromSearchParams(url.searchParams);
		const proofs = await listGovernanceProofs(platform.env.DB, filters);
		return json({
			proofs,
			count: proofs.length,
			filters
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to list governance proofs.' },
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
		return json({ error: 'Governance proofs require the Cloudflare D1 binding.' }, { status: 503 });
	}

	try {
		const proof = await createGovernanceProof(platform.env.DB, normalizeProofRequestBody(body));
		return json({ proof }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create governance proof.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
