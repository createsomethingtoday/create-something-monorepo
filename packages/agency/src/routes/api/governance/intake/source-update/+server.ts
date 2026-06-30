import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGovernanceWriteCredential } from '../../../../../lib/server/governance-api-auth';
import {
	intakeGovernanceSourceUpdate,
	normalizeSourceUpdateRequestBody
} from '../../../../../lib/server/governance-source-intake';
import { governanceRuntimeErrorStatus } from '../../../../../lib/server/governance-runtime';

export const POST: RequestHandler = async ({ platform, request }) => {
	let body: Record<string, unknown>;

	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Governance source intake requires the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const result = await intakeGovernanceSourceUpdate(
			platform.env.DB,
			normalizeSourceUpdateRequestBody(body)
		);
		return json(result, { status: result.action === 'signal_created' ? 201 : 202 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to intake governance source update.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
