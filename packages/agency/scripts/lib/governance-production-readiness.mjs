export const REQUIRED_GOVERNANCE_PRODUCTS = ['atlas', 'signal', 'decision', 'proof'];
export const REQUIRED_GOVERNANCE_LINKS = [
	'atlas->signal',
	'signal->decision',
	'decision->proof',
	'proof->atlas'
];

const REQUIRED_RUNTIME_APIS = {
	atlas: { path: '/api/governance/products', methods: ['GET'] },
	signal: { path: '/api/governance/signals', methods: ['GET', 'POST'] },
	decision: { path: '/api/governance/decisions', methods: ['GET', 'POST'] },
	proof: { path: '/api/governance/proofs', methods: ['GET', 'POST'] }
};

/** @typedef {{ id?: string, attachesTo?: string[] }} GovernanceProduct */
/** @typedef {{ source?: string, target?: string }} GovernanceLink */
/** @typedef {{ product?: string, path?: string, methods?: string[] }} GovernanceRuntimeApi */
/** @typedef {{ source?: string, target?: string, canAttach?: boolean }} GovernanceAttachment */
/**
 * @typedef {{
 *   products?: GovernanceProduct[], requiredLinks?: GovernanceLink[], runtimeApis?: GovernanceRuntimeApi[], attachmentMatrix?: GovernanceAttachment[],
 *   attachmentGraphApi?: { path?: string, requiresCredential?: boolean, attaches?: string[] },
 *   attachmentRecordsApi?: { path?: string, requiresCredential?: boolean, methods?: string[], attaches?: string[] },
 *   connectionRecordsApi?: { path?: string, requiresCredential?: boolean, methods?: string[], records?: string },
 *   receiptRecordsApi?: { path?: string, requiresCredential?: boolean, methods?: string[], records?: string },
 *   monitorReadinessApi?: { path?: string, requiresCredential?: boolean, secretSafe?: boolean },
 *   agentContract?: { attachmentRecordsApiPath?: string, connectionRecordsApiPath?: string, receiptRecordsApiPath?: string, monitorReadinessApiPath?: string },
 *   productionReadiness?: { ready?: boolean }
 * }} GovernanceManifest
 */

/** @param {GovernanceManifest} body */
export function validateGovernanceProductManifest(body) {
	const products = Array.isArray(body?.products) ? body.products : [];
	const productIds = new Set(products.map((product) => product.id).filter(Boolean));
	const requiredLinks = new Set(
		(Array.isArray(body?.requiredLinks) ? body.requiredLinks : [])
			.map((link) => `${link.source}->${link.target}`)
			.filter(Boolean)
	);
	/** @type {Map<string, GovernanceRuntimeApi>} */
	const runtimeApis = new Map();
	for (const api of Array.isArray(body?.runtimeApis) ? body.runtimeApis : []) {
		if (api.product) runtimeApis.set(api.product, api);
	}
	const attachmentMatrix = Array.isArray(body?.attachmentMatrix) ? body.attachmentMatrix : [];

	const missingProducts = REQUIRED_GOVERNANCE_PRODUCTS.filter((productId) => !productIds.has(productId));
	const missingLinks = REQUIRED_GOVERNANCE_LINKS.filter((link) => !requiredLinks.has(link));
	const missingRuntimeApis = missingRequiredRuntimeApis(runtimeApis);
	const missingDeclaredAttachments = missingAttachmentMatrixEntries(products, attachmentMatrix);
	const attachmentGraphReady =
		body?.attachmentGraphApi?.path === '/api/governance/graph' &&
		body?.attachmentGraphApi?.requiresCredential === true &&
		REQUIRED_GOVERNANCE_PRODUCTS.every((productId) => body.attachmentGraphApi?.attaches?.includes(productId));
	const attachmentRecordsReady =
		body?.attachmentRecordsApi?.path === '/api/governance/attachments' &&
		body?.attachmentRecordsApi?.requiresCredential === true &&
		Array.isArray(body?.attachmentRecordsApi?.methods) &&
		body.attachmentRecordsApi.methods.includes('GET') &&
		body.attachmentRecordsApi.methods.includes('POST') &&
		REQUIRED_GOVERNANCE_PRODUCTS.every((productId) =>
			body.attachmentRecordsApi?.attaches?.includes(productId)
		) &&
		body?.agentContract?.attachmentRecordsApiPath === '/api/governance/attachments';
	const connectionRecordsReady =
		body?.connectionRecordsApi?.path === '/api/governance/connections' &&
		body?.connectionRecordsApi?.requiresCredential === true &&
		Array.isArray(body?.connectionRecordsApi?.methods) &&
		body.connectionRecordsApi.methods.includes('GET') &&
		body.connectionRecordsApi.methods.includes('POST') &&
		body?.connectionRecordsApi?.records === 'sources_and_subscriptions' &&
		body?.agentContract?.connectionRecordsApiPath === '/api/governance/connections';
	const receiptRecordsReady =
		body?.receiptRecordsApi?.path === '/api/governance/receipts' &&
		body?.receiptRecordsApi?.requiresCredential === true &&
		Array.isArray(body?.receiptRecordsApi?.methods) &&
		body.receiptRecordsApi.methods.includes('GET') &&
		body.receiptRecordsApi.methods.includes('POST') &&
		body?.receiptRecordsApi?.records === 'delivery_receipts' &&
		body?.agentContract?.receiptRecordsApiPath === '/api/governance/receipts';
	const monitorReadinessReady =
		body?.monitorReadinessApi?.path === '/api/governance/monitors/slack/readiness' &&
		body?.monitorReadinessApi?.requiresCredential === true &&
		body?.monitorReadinessApi?.secretSafe === true &&
		body?.agentContract?.monitorReadinessApiPath === '/api/governance/monitors/slack/readiness';

	const ready =
		body?.productionReadiness?.ready === true &&
		missingProducts.length === 0 &&
		missingLinks.length === 0 &&
		missingRuntimeApis.length === 0 &&
		missingDeclaredAttachments.length === 0 &&
		attachmentGraphReady &&
		attachmentRecordsReady &&
		connectionRecordsReady &&
		receiptRecordsReady &&
		monitorReadinessReady;

	return {
		ready,
		details: {
			manifest_ready: body?.productionReadiness?.ready === true,
			required_products: REQUIRED_GOVERNANCE_PRODUCTS,
			missing_products: missingProducts,
			required_links: REQUIRED_GOVERNANCE_LINKS,
			missing_links: missingLinks,
			missing_runtime_apis: missingRuntimeApis,
			missing_declared_attachments: missingDeclaredAttachments,
			attachment_graph_api_path: body?.attachmentGraphApi?.path ?? null,
			attachment_graph_ready: attachmentGraphReady,
			attachment_records_api_path: body?.attachmentRecordsApi?.path ?? null,
			attachment_records_ready: attachmentRecordsReady,
			connection_records_api_path: body?.connectionRecordsApi?.path ?? null,
			connection_records_ready: connectionRecordsReady,
			receipt_records_api_path: body?.receiptRecordsApi?.path ?? null,
			receipt_records_ready: receiptRecordsReady,
			monitor_readiness_api_path: body?.monitorReadinessApi?.path ?? null,
			monitor_readiness_secret_safe: body?.monitorReadinessApi?.secretSafe === true,
			monitor_readiness_ready: monitorReadinessReady
		}
	};
}

/** @param {Map<string, GovernanceRuntimeApi>} runtimeApis */
function missingRequiredRuntimeApis(runtimeApis) {
	return Object.entries(REQUIRED_RUNTIME_APIS)
		.filter(([productId, expected]) => {
			const api = runtimeApis.get(productId);
			return (
				!api ||
				api.path !== expected.path ||
				!expected.methods.every((method) => Array.isArray(api.methods) && api.methods.includes(method))
			);
		})
		.map(([productId]) => productId);
}

/** @param {GovernanceProduct[]} products @param {GovernanceAttachment[]} attachmentMatrix */
function missingAttachmentMatrixEntries(products, attachmentMatrix) {
	const matrix = new Set(
		attachmentMatrix
			.filter((entry) => entry?.canAttach === true)
			.map((entry) => `${entry.source}->${entry.target}`)
			.filter(Boolean)
	);

	return products.flatMap((product) => {
		const targets = Array.isArray(product?.attachesTo) ? product.attachesTo : [];
		return targets
			.filter((target) => !matrix.has(`${product.id}->${target}`))
			.map((target) => `${product.id}->${target}`);
	});
}
