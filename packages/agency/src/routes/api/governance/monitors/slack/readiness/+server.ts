import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGovernanceWriteCredential } from '../../../../../../lib/server/governance-api-auth';
import { buildGovernanceSlackMonitorReadiness } from '../../../../../../lib/server/governance-slack-monitor';

export const GET: RequestHandler = async ({ platform, request }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance Slack monitor readiness requires the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const readiness = await buildGovernanceSlackMonitorReadiness(platform.env.DB, {
			channelsRaw: platform.env.GOVERNANCE_SLACK_CHANNELS,
			slackBotToken: platform.env.SLACK_BOT_TOKEN,
			workspaceUrl: platform.env.GOVERNANCE_SLACK_WORKSPACE_URL
		});
		return json({ readiness });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to inspect governance Slack monitor readiness.' },
			{ status: 500 }
		);
	}
};
