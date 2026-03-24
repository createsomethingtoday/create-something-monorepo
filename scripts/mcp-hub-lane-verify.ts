#!/usr/bin/env tsx

import { parseLaneCliArgs, printPreflightSummary, runLanePreflight, meetsRequiredState } from './mcp-hub-lane-lib';
import { printJson } from './partner-cli-utils';

async function main(): Promise<void> {
	const parsed = parseLaneCliArgs(process.argv.slice(2));
	const requiredState = parsed.requiredState === 'customer' ? 'search' : parsed.requiredState;
	const result = await runLanePreflight({
		laneSlug: parsed.laneSlug,
		clientSlug: parsed.clientSlug,
		catalogPath: parsed.catalogPath,
		partnerApiBaseUrl: parsed.partnerApiBaseUrl,
		partnerAdminKey: parsed.partnerAdminKey,
		partnerActor: parsed.partnerActor,
		allowInfisical: parsed.allowInfisical,
		allowHubChecks: true,
		probeConnectLinks: true,
		requiredState,
	});

	printPreflightSummary(result);
	printJson(result);

	if (!meetsRequiredState(result, requiredState)) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
