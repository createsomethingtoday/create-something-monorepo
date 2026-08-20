import test from 'node:test';
import assert from 'node:assert/strict';

import {
	SIGNAL_DECISION_PROOF_COMPOSITION,
	listGovernanceProducts
} from '@create-something/canon/governance';
import {
	buildGovernanceProductCompositionManifest,
	governanceProductPublicPath,
	governanceProductRuntimePath
} from '../src/lib/governance/product-manifest.ts';
import { GET as getGovernanceProductManifest } from '../src/routes/api/governance/products/+server.ts';

test('governance product manifest exposes the Canon product composition', () => {
	const manifest = buildGovernanceProductCompositionManifest();

	assert.equal(manifest.schemaVersion, 1);
	assert.equal(manifest.sourceOfTruth, '@create-something/canon/governance');
	assert.equal(manifest.id, SIGNAL_DECISION_PROOF_COMPOSITION.id);
	assert.equal(manifest.atlasHub, 'atlas');
	assert.deepEqual(
		manifest.products.map((product) => product.id),
		listGovernanceProducts().map((product) => product.id)
	);
	assert.deepEqual(manifest.productionReadiness.missingRequiredProducts, []);
	assert.deepEqual(manifest.productionReadiness.missingRequiredLinks, []);
	assert.equal(manifest.productionReadiness.ready, true);
});

test('governance product manifest gives Atlas and agents stable public paths', () => {
	const manifest = buildGovernanceProductCompositionManifest();
	const publicPaths = new Map(manifest.products.map((product) => [product.id, product.publicPath]));

	assert.equal(governanceProductPublicPath('atlas'), '/atlas');
	assert.equal(governanceProductRuntimePath('atlas'), '/api/governance/products');
	assert.equal(manifest.attachmentGraphApi.path, '/api/governance/graph');
	assert.equal(manifest.attachmentGraphApi.requiresCredential, true);
	assert.deepEqual(manifest.attachmentGraphApi.attaches, ['atlas', 'signal', 'decision', 'proof']);
	assert.equal(manifest.attachmentRecordsApi.path, '/api/governance/attachments');
	assert.equal(manifest.attachmentRecordsApi.requiresCredential, true);
	assert.deepEqual(manifest.attachmentRecordsApi.methods, ['GET', 'POST']);
	assert.equal(manifest.connectionRecordsApi.path, '/api/governance/connections');
	assert.equal(manifest.connectionRecordsApi.requiresCredential, true);
	assert.deepEqual(manifest.connectionRecordsApi.methods, ['GET', 'POST']);
	assert.equal(manifest.receiptRecordsApi.path, '/api/governance/receipts');
	assert.equal(manifest.receiptRecordsApi.requiresCredential, true);
	assert.deepEqual(manifest.receiptRecordsApi.methods, ['GET', 'POST']);
	assert.equal(manifest.monitorReadinessApi.path, '/api/governance/monitors/slack/readiness');
	assert.equal(manifest.monitorReadinessApi.requiresCredential, true);
	assert.equal(manifest.monitorReadinessApi.secretSafe, true);
	assert.equal(publicPaths.get('atlas'), '/atlas');
	assert.equal(publicPaths.get('signal'), '/products/signal');
	assert.equal(publicPaths.get('decision'), '/products/decision');
	assert.equal(publicPaths.get('proof'), '/products/proof');
	assert.ok(manifest.products.every((product) => product.manifestPath === `/api/governance/products#${product.id}`));
	assert.equal(manifest.products.find((product) => product.id === 'signal')?.runtimePath, '/api/governance/signals');
});

test('governance product manifest preserves the required attachment loop', () => {
	const manifest = buildGovernanceProductCompositionManifest();

	assert.deepEqual(
		manifest.requiredLinks.map((link) => `${link.source}->${link.target}:${link.mode}`),
		[
			'atlas->signal:connects',
			'signal->decision:produces',
			'decision->proof:produces',
			'proof->atlas:records'
		]
	);

	for (const [source, target] of [
		['atlas', 'signal'],
		['signal', 'decision'],
		['decision', 'proof'],
		['proof', 'atlas']
	] as const) {
		assert.equal(
			manifest.attachmentMatrix.some(
				(entry) => entry.source === source && entry.target === target && entry.canAttach
			),
			true,
			`${source} should attach to ${target}`
		);
	}
});

test('governance product manifest exposes runtime APIs for record composition', () => {
	const manifest = buildGovernanceProductCompositionManifest();
	const runtimeApis = new Map(manifest.runtimeApis.map((api) => [api.product, api]));

	assert.equal(runtimeApis.get('atlas')?.path, '/api/governance/products');
	assert.equal(runtimeApis.get('signal')?.path, '/api/governance/signals');
	assert.equal(runtimeApis.get('decision')?.path, '/api/governance/decisions');
	assert.equal(runtimeApis.get('proof')?.path, '/api/governance/proofs');
	assert.deepEqual(runtimeApis.get('signal')?.methods, ['GET', 'POST']);
	assert.equal(runtimeApis.get('proof')?.attachesToAtlas, true);
	assert.equal(runtimeApis.get('decision')?.records, 'decisions');
});

test('governance product manifest API returns the runtime-readable contract', async () => {
	const response = await getGovernanceProductManifest({} as never);
	const payload = (await response.json()) as {
		apiPath: string;
		attachmentGraphApi: { path: string };
		attachmentRecordsApi: { path: string };
		connectionRecordsApi: { path: string };
		receiptRecordsApi: { path: string };
		monitorReadinessApi: { path: string };
		agentContract: {
			primaryConsumer: string;
			attachmentGraphApiPath: string;
			attachmentRecordsApiPath: string;
			connectionRecordsApiPath: string;
			receiptRecordsApiPath: string;
			monitorReadinessApiPath: string;
			requiredLoop: string[];
		};
		products: unknown[];
		runtimeApis: unknown[];
	};

	assert.equal(response.status, 200);
	assert.equal(response.headers.get('cache-control'), 'max-age=300');
	assert.equal(payload.apiPath, '/api/governance/products');
	assert.equal(payload.attachmentGraphApi.path, '/api/governance/graph');
	assert.equal(payload.attachmentRecordsApi.path, '/api/governance/attachments');
	assert.equal(payload.connectionRecordsApi.path, '/api/governance/connections');
	assert.equal(payload.receiptRecordsApi.path, '/api/governance/receipts');
	assert.equal(payload.monitorReadinessApi.path, '/api/governance/monitors/slack/readiness');
	assert.equal(payload.agentContract.primaryConsumer, 'atlas');
	assert.equal(payload.agentContract.attachmentGraphApiPath, '/api/governance/graph');
	assert.equal(payload.agentContract.attachmentRecordsApiPath, '/api/governance/attachments');
	assert.equal(payload.agentContract.connectionRecordsApiPath, '/api/governance/connections');
	assert.equal(payload.agentContract.receiptRecordsApiPath, '/api/governance/receipts');
	assert.equal(payload.agentContract.monitorReadinessApiPath, '/api/governance/monitors/slack/readiness');
	assert.deepEqual(payload.agentContract.requiredLoop, ['atlas', 'signal', 'decision', 'proof']);
	assert.equal(payload.products.length, 4);
	assert.equal(payload.runtimeApis.length, 4);
});
