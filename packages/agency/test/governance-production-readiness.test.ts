import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGovernanceProductCompositionManifest } from '../src/lib/governance/product-manifest.ts';
import { validateGovernanceProductManifest } from '../scripts/lib/governance-production-readiness.mjs';

test('validateGovernanceProductManifest accepts the full product attachment contract', () => {
	const manifest = buildGovernanceProductCompositionManifest();
	const validation = validateGovernanceProductManifest(manifest);

	assert.equal(validation.ready, true);
	assert.deepEqual(validation.details.missing_products, []);
	assert.deepEqual(validation.details.missing_links, []);
	assert.deepEqual(validation.details.missing_runtime_apis, []);
	assert.deepEqual(validation.details.missing_declared_attachments, []);
	assert.equal(validation.details.attachment_graph_ready, true);
	assert.equal(validation.details.attachment_records_ready, true);
	assert.equal(validation.details.connection_records_ready, true);
	assert.equal(validation.details.receipt_records_ready, true);
	assert.equal(validation.details.monitor_readiness_ready, true);
});

test('validateGovernanceProductManifest rejects missing runtime and attachment APIs', () => {
	const manifest = buildGovernanceProductCompositionManifest();
	const validation = validateGovernanceProductManifest({
		...manifest,
		runtimeApis: manifest.runtimeApis.filter((api) => api.product !== 'proof'),
		attachmentRecordsApi: {
			...manifest.attachmentRecordsApi,
			path: '/api/governance/old-attachments'
		},
		connectionRecordsApi: {
			...manifest.connectionRecordsApi,
			path: '/api/governance/old-connections'
		},
		receiptRecordsApi: {
			...manifest.receiptRecordsApi,
			requiresCredential: false
		},
		monitorReadinessApi: {
			...manifest.monitorReadinessApi,
			secretSafe: false
		}
	});

	assert.equal(validation.ready, false);
	assert.deepEqual(validation.details.missing_runtime_apis, ['proof']);
	assert.equal(validation.details.attachment_records_ready, false);
	assert.equal(validation.details.connection_records_ready, false);
	assert.equal(validation.details.receipt_records_ready, false);
	assert.equal(validation.details.monitor_readiness_secret_safe, false);
	assert.equal(validation.details.monitor_readiness_ready, false);
});

test('validateGovernanceProductManifest rejects declared attachments missing from the matrix', () => {
	const manifest = buildGovernanceProductCompositionManifest();
	const validation = validateGovernanceProductManifest({
		...manifest,
		attachmentMatrix: manifest.attachmentMatrix.filter(
			(entry) => !(entry.source === 'decision' && entry.target === 'signal')
		)
	});

	assert.equal(validation.ready, false);
	assert.deepEqual(validation.details.missing_declared_attachments, ['decision->signal']);
});
