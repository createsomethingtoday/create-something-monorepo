import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGovernanceWriteCredential } from '../../../../../lib/server/governance-api-auth';
import {
	parseGovernanceSlackChannelsConfig,
	runGovernanceSlackMonitor
} from '../../../../../lib/server/governance-slack-monitor';

export const POST: RequestHandler = async ({ platform, request }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Governance Slack monitor requires the Cloudflare D1 binding.' }, { status: 503 });
	}

	const credential = verifyGovernanceWriteCredential({
		request,
		expectedKey: platform.env.AGENCY_INTERNAL_API_KEY
	});
	if (!credential.ok) {
		return json({ error: credential.error }, { status: credential.status });
	}

	try {
		const result = await runGovernanceSlackMonitor(platform.env.DB, {
			channels: parseGovernanceSlackChannelsConfig(platform.env.GOVERNANCE_SLACK_CHANNELS),
			slackBotToken: platform.env.SLACK_BOT_TOKEN,
			workspaceUrl: platform.env.GOVERNANCE_SLACK_WORKSPACE_URL
		});
		return json(result, { status: result.status === 'not_configured' ? 202 : 200 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to run governance Slack monitor.' },
			{ status: 500 }
		);
	}
};
