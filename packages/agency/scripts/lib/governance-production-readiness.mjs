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

export function validateGovernanceProductManifest(body) {
	const products = Array.isArray(body?.products) ? body.products : [];
	const productIds = new Set(products.map((product) => product.id).filter(Boolean));
	const requiredLinks = new Set(
		(Array.isArray(body?.requiredLinks) ? body.requiredLinks : [])
			.map((link) => `${link.source}->${link.target}`)
			.filter(Boolean)
	);
	const runtimeApis = new Map(
		(Array.isArray(body?.runtimeApis) ? body.runtimeApis : [])
			.filter((api) => api?.product)
			.map((api) => [api.product, api])
	);
	const attachmentMatrix = Array.isArray(body?.attachmentMatrix) ? body.attachmentMatrix : [];

	const missingProducts = REQUIRED_GOVERNANCE_PRODUCTS.filter((productId) => !productIds.has(productId));
	const missingLinks = REQUIRED_GOVERNANCE_LINKS.filter((link) => !requiredLinks.has(link));
	const missingRuntimeApis = missingRequiredRuntimeApis(runtimeApis);
	const missingDeclaredAttachments = missingAttachmentMatrixEntries(products, attachmentMatrix);
	const attachmentGraphReady =
		body?.attachmentGraphApi?.path === '/api/governance/graph' &&
		body?.attachmentGraphApi?.requiresCredential === true &&
		REQUIRED_GOVERNANCE_PRODUCTS.every((productId) => body.attachmentGraphApi?.attaches?.includes(productId));
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
			monitor_readiness_api_path: body?.monitorReadinessApi?.path ?? null,
			monitor_readiness_secret_safe: body?.monitorReadinessApi?.secretSafe === true,
			monitor_readiness_ready: monitorReadinessReady
		}
	};
}

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
