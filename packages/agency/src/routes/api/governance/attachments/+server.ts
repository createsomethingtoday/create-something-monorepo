import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGovernanceWriteCredential } from '../../../../lib/server/governance-api-auth';
import {
	createGovernanceProductAttachment,
	filtersFromSearchParams,
	governanceRuntimeErrorStatus,
	listGovernanceProductAttachments,
	normalizeAttachmentRequestBody
} from '../../../../lib/server/governance-runtime';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance attachments require the Cloudflare D1 binding.' }, { status: 503 });
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
		const attachments = await listGovernanceProductAttachments(platform.env.DB, filters);
		return json({
			attachments,
			count: attachments.length,
			filters
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to list governance attachments.' },
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
		return json({ error: 'Governance attachments require the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const attachment = await createGovernanceProductAttachment(
			platform.env.DB,
			normalizeAttachmentRequestBody(body)
		);
		return json({ attachment }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create governance attachment.' },
			{ status: governanceRuntimeErrorStatus(error) }
		);
	}
};
