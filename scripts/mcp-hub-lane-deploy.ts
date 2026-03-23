#!/usr/bin/env tsx

import {
	buildLaneContext,
	buildLaneInitPayload,
	deployDedicatedLaneWorker,
	getLaneSpec,
	initializePartnerLane,
	loadLaneCatalog,
	normalizeLaneHubState,
	parseLaneCliArgs,
	resolveSecretValue,
	runLanePreflight,
	syncLaneWorkerSecrets,
} from './mcp-hub-lane-lib';
import { printJson } from './partner-cli-utils';

async function main(): Promise<void> {
	const parsed = parseLaneCliArgs(process.argv.slice(2));
	const catalog = await loadLaneCatalog(parsed.catalogPath);
	const laneSlug = parsed.laneSlug.trim().toLowerCase();
	const spec = getLaneSpec(catalog, laneSlug);
	const clientSlug = (parsed.clientSlug ?? spec.clientSlug).trim().toLowerCase();
	const context = buildLaneContext(catalog.defaults, laneSlug, spec);
	const partnerKey = catalog.defaults.partnerKey;
	const partnerApiBaseUrl = parsed.partnerApiBaseUrl ?? catalog.defaults.partnerApiBaseUrl;
	const partnerAdminKey = parsed.partnerAdminKey;
	const actor = parsed.partnerActor;
	const deployRequiredState =
		typeof parsed.args['require-state'] === 'string' ? parsed.requiredState : 'infrastructure';

	if (!partnerAdminKey) {
		throw new Error('Missing partner admin key. Provide --admin-key or PARTNER_PORTAL_ADMIN_KEY.');
	}

	if (spec.deploymentMode === 'dedicated') {
		await syncLaneWorkerSecrets(spec, catalog.defaults, context, {
			allowInfisical: parsed.allowInfisical,
			dryRun: parsed.dryRun,
		});
		await deployDedicatedLaneWorker(spec, context, catalog.defaults, {
			dryRun: parsed.dryRun,
		});

		const hubToken = (
			await resolveSecretValue(`CS_HUB_${context.laneKey}_API_TOKEN`, {
				allowInfisical: parsed.allowInfisical,
			})
		).value;
		if (!hubToken) {
			throw new Error(`Missing CS_HUB_${context.laneKey}_API_TOKEN for hub state normalization.`);
		}
		await normalizeLaneHubState(spec, context, hubToken, {
			dryRun: parsed.dryRun,
		});
	}

	const initPayload = buildLaneInitPayload(spec, context, clientSlug);
	await initializePartnerLane(
		partnerApiBaseUrl,
		partnerKey,
		partnerAdminKey,
		actor,
		clientSlug,
		context,
		initPayload,
		{
			dryRun: parsed.dryRun,
		},
	);

	if (parsed.dryRun) {
		printJson({
			lane: laneSlug,
			client: clientSlug,
			deployment_mode: spec.deploymentMode,
			worker_name: context.workerName,
			hub_url: context.hubUrl,
			dry_run: true,
		});
		return;
	}

	const preflight = await runLanePreflight({
		laneSlug,
		clientSlug,
		catalogPath: parsed.catalogPath,
		partnerApiBaseUrl,
		partnerAdminKey,
		partnerActor: actor,
		allowInfisical: parsed.allowInfisical,
		allowHubChecks: true,
		probeConnectLinks: parsed.probeConnectLinks,
		requiredState: deployRequiredState,
	});

	printJson({
		action: 'mcp:hub:lane:deploy',
		lane: laneSlug,
		client: clientSlug,
		deployment_mode: spec.deploymentMode,
		worker_name: context.workerName,
		hub_url: context.hubUrl,
		preflight,
	});

	if (!preflight.infrastructure_ready) {
		process.exitCode = 1;
		return;
	}

	if (deployRequiredState === 'customer' && !preflight.customer_ready) {
		process.exitCode = 1;
	}
	if (deployRequiredState === 'search' && !preflight.search_ready) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
