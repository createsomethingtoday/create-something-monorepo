import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildGovernanceAttachmentGraph } from '../../../../lib/server/governance-graph';
import { verifyGovernanceWriteCredential } from '../../../../lib/server/governance-api-auth';
import { filtersFromSearchParams, governanceRuntimeErrorStatus } from '../../../../lib/server/governance-runtime';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance graph requires the Cloudflare D1 binding.' }, { status: 503 });
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
		const graph = await buildGovernanceAttachmentGraph(platform.env.DB, filters);
		return json({ graph });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to build governance graph.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
