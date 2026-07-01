import {
	canAttachGovernanceProducts,
	listGovernanceProducts,
	SIGNAL_DECISION_PROOF_COMPOSITION,
	type GovernanceProduct,
	type GovernanceProductAttachmentMode,
	type GovernanceProductId,
	type GovernanceProductLink,
	type GovernanceProductPrimitive,
	type GovernanceProductRole,
	type GovernanceProductSurface
} from '@create-something/canon/governance';

export type GovernanceProductManifestProduct = {
	id: GovernanceProductId;
	name: string;
	role: GovernanceProductRole;
	surface: GovernanceProductSurface;
	primitive: GovernanceProductPrimitive;
	headline: string;
	description: string;
	owns: string[];
	inputs: GovernanceProductId[];
	outputs: GovernanceProductId[];
	attachesTo: GovernanceProductId[];
	requiredForProduction: boolean;
	publicPath: string;
	manifestPath: string;
	runtimePath: string | null;
};

export type GovernanceProductManifestLink = GovernanceProductLink & {
	sourcePath: string;
	targetPath: string;
};

export type GovernanceProductAttachmentMatrixEntry = {
	source: GovernanceProductId;
	target: GovernanceProductId;
	canAttach: boolean;
	mode: GovernanceProductAttachmentMode;
	sourcePath: string;
	targetPath: string;
};

export type GovernanceProductRuntimeApi = {
	product: GovernanceProductId;
	path: string;
	methods: Array<'GET' | 'POST'>;
	attachesToAtlas: boolean;
	records: 'signals' | 'decisions' | 'proofs' | 'composition';
};

export type GovernanceProductAttachmentGraphApi = {
	product: 'atlas';
	path: '/api/governance/graph';
	methods: ['GET'];
	requiresCredential: true;
	records: 'attachment_graph';
	attaches: GovernanceProductId[];
};

export type GovernanceProductAttachmentRecordsApi = {
	product: 'atlas';
	path: '/api/governance/attachments';
	methods: ['GET', 'POST'];
	requiresCredential: true;
	records: 'product_attachments';
	attaches: GovernanceProductId[];
};

export type GovernanceProductConnectionRecordsApi = {
	product: 'signal';
	path: '/api/governance/connections';
	methods: ['GET', 'POST'];
	requiresCredential: true;
	records: 'sources_and_subscriptions';
};

export type GovernanceProductReceiptRecordsApi = {
	product: 'proof';
	path: '/api/governance/receipts';
	methods: ['GET', 'POST'];
	requiresCredential: true;
	records: 'delivery_receipts';
};

export type GovernanceProductMonitorReadinessApi = {
	product: 'signal';
	path: '/api/governance/monitors/slack/readiness';
	methods: ['GET'];
	requiresCredential: true;
	records: 'source_monitor_readiness';
	secretSafe: true;
};

export type GovernanceProductCompositionManifest = {
	schemaVersion: 1;
	id: typeof SIGNAL_DECISION_PROOF_COMPOSITION.id;
	sourceOfTruth: '@create-something/canon/governance';
	atlasHub: GovernanceProductId;
	apiPath: '/api/governance/products';
	attachmentGraphApi: GovernanceProductAttachmentGraphApi;
	attachmentRecordsApi: GovernanceProductAttachmentRecordsApi;
	connectionRecordsApi: GovernanceProductConnectionRecordsApi;
	receiptRecordsApi: GovernanceProductReceiptRecordsApi;
	monitorReadinessApi: GovernanceProductMonitorReadinessApi;
	products: GovernanceProductManifestProduct[];
	runtimeApis: GovernanceProductRuntimeApi[];
	requiredLinks: GovernanceProductManifestLink[];
	attachmentMatrix: GovernanceProductAttachmentMatrixEntry[];
	productionReadiness: {
		requiredProducts: GovernanceProductId[];
		connectedProducts: GovernanceProductId[];
		missingRequiredProducts: GovernanceProductId[];
		missingRequiredLinks: string[];
		ready: boolean;
	};
	agentContract: {
		purpose: 'governance-product-discovery';
		primaryConsumer: 'atlas';
		operatorSurface: 'inbox-map-proof';
		attachmentModes: GovernanceProductAttachmentMode[];
		requiredLoop: GovernanceProductId[];
		attachmentGraphApiPath: '/api/governance/graph';
		attachmentRecordsApiPath: '/api/governance/attachments';
		connectionRecordsApiPath: '/api/governance/connections';
		receiptRecordsApiPath: '/api/governance/receipts';
		monitorReadinessApiPath: '/api/governance/monitors/slack/readiness';
	};
};

const productPaths: Record<GovernanceProductId, string> = {
	atlas: '/atlas',
	signal: '/products/signal',
	decision: '/products/decision',
	proof: '/products/proof'
};

const runtimePaths: Record<GovernanceProductId, string | null> = {
	atlas: '/api/governance/products',
	signal: '/api/governance/signals',
	decision: '/api/governance/decisions',
	proof: '/api/governance/proofs'
};

const linkModeFallback: Record<GovernanceProductId, GovernanceProductAttachmentMode> = {
	atlas: 'connects',
	signal: 'produces',
	decision: 'produces',
	proof: 'records'
};

export function governanceProductPublicPath(productId: GovernanceProductId): string {
	return productPaths[productId];
}

export function governanceProductRuntimePath(productId: GovernanceProductId): string | null {
	return runtimePaths[productId];
}

function toManifestProduct(product: GovernanceProduct): GovernanceProductManifestProduct {
	const publicPath = governanceProductPublicPath(product.id);
	return {
		...product,
		owns: [...product.owns],
		inputs: [...product.inputs],
		outputs: [...product.outputs],
		attachesTo: [...product.attachesTo],
		publicPath,
		manifestPath: `/api/governance/products#${product.id}`,
		runtimePath: governanceProductRuntimePath(product.id)
	};
}

function toManifestLink(link: GovernanceProductLink): GovernanceProductManifestLink {
	return {
		...link,
		sourcePath: governanceProductPublicPath(link.source),
		targetPath: governanceProductPublicPath(link.target)
	};
}

function buildAttachmentMatrix(
	products: GovernanceProductManifestProduct[]
): GovernanceProductAttachmentMatrixEntry[] {
	return products.flatMap((source) =>
		products
			.filter((target) => target.id !== source.id)
			.map((target) => ({
				source: source.id,
				target: target.id,
				canAttach: canAttachGovernanceProducts(source.id, target.id),
				mode: linkModeFallback[source.id],
				sourcePath: source.publicPath,
				targetPath: target.publicPath
			}))
	);
}

function buildRuntimeApis(products: GovernanceProductManifestProduct[]): GovernanceProductRuntimeApi[] {
	return products
		.map((product) => {
			const path = governanceProductRuntimePath(product.id);
			if (!path) return null;
			return {
				product: product.id,
				path,
				methods: (product.id === 'atlas' ? ['GET'] : ['GET', 'POST']) as Array<'GET' | 'POST'>,
				attachesToAtlas: product.id !== 'atlas',
				records:
					product.id === 'signal'
						? 'signals'
						: product.id === 'decision'
							? 'decisions'
							: product.id === 'proof'
								? 'proofs'
								: 'composition'
			};
		})
		.filter((api): api is GovernanceProductRuntimeApi => Boolean(api));
}

function buildAttachmentGraphApi(): GovernanceProductAttachmentGraphApi {
	return {
		product: 'atlas',
		path: '/api/governance/graph',
		methods: ['GET'],
		requiresCredential: true,
		records: 'attachment_graph',
		attaches: [...SIGNAL_DECISION_PROOF_COMPOSITION.products]
	};
}

function buildAttachmentRecordsApi(): GovernanceProductAttachmentRecordsApi {
	return {
		product: 'atlas',
		path: '/api/governance/attachments',
		methods: ['GET', 'POST'],
		requiresCredential: true,
		records: 'product_attachments',
		attaches: [...SIGNAL_DECISION_PROOF_COMPOSITION.products]
	};
}

function buildConnectionRecordsApi(): GovernanceProductConnectionRecordsApi {
	return {
		product: 'signal',
		path: '/api/governance/connections',
		methods: ['GET', 'POST'],
		requiresCredential: true,
		records: 'sources_and_subscriptions'
	};
}

function buildReceiptRecordsApi(): GovernanceProductReceiptRecordsApi {
	return {
		product: 'proof',
		path: '/api/governance/receipts',
		methods: ['GET', 'POST'],
		requiresCredential: true,
		records: 'delivery_receipts'
	};
}

function buildMonitorReadinessApi(): GovernanceProductMonitorReadinessApi {
	return {
		product: 'signal',
		path: '/api/governance/monitors/slack/readiness',
		methods: ['GET'],
		requiresCredential: true,
		records: 'source_monitor_readiness',
		secretSafe: true
	};
}

export function buildGovernanceProductCompositionManifest(): GovernanceProductCompositionManifest {
	const products = listGovernanceProducts().map(toManifestProduct);
	const requiredLinks = SIGNAL_DECISION_PROOF_COMPOSITION.requiredLinks.map(toManifestLink);
	const productIds = products.map((product) => product.id);
	const missingRequiredProducts = SIGNAL_DECISION_PROOF_COMPOSITION.products.filter(
		(productId) => !productIds.includes(productId)
	);
	const missingRequiredLinks = requiredLinks
		.filter((link) => !canAttachGovernanceProducts(link.source, link.target))
		.map((link) => `${link.source}->${link.target}`);

	return {
		schemaVersion: 1,
		id: SIGNAL_DECISION_PROOF_COMPOSITION.id,
		sourceOfTruth: '@create-something/canon/governance',
		atlasHub: SIGNAL_DECISION_PROOF_COMPOSITION.atlasHub,
		apiPath: '/api/governance/products',
		attachmentGraphApi: buildAttachmentGraphApi(),
		attachmentRecordsApi: buildAttachmentRecordsApi(),
		connectionRecordsApi: buildConnectionRecordsApi(),
		receiptRecordsApi: buildReceiptRecordsApi(),
		monitorReadinessApi: buildMonitorReadinessApi(),
		products,
		runtimeApis: buildRuntimeApis(products),
		requiredLinks,
		attachmentMatrix: buildAttachmentMatrix(products),
		productionReadiness: {
			requiredProducts: [...SIGNAL_DECISION_PROOF_COMPOSITION.products],
			connectedProducts: productIds,
			missingRequiredProducts,
			missingRequiredLinks,
			ready: missingRequiredProducts.length === 0 && missingRequiredLinks.length === 0
		},
		agentContract: {
			purpose: 'governance-product-discovery',
			primaryConsumer: 'atlas',
			operatorSurface: 'inbox-map-proof',
			attachmentModes: ['connects', 'consumes', 'produces', 'records'],
			requiredLoop: [...SIGNAL_DECISION_PROOF_COMPOSITION.products],
			attachmentGraphApiPath: '/api/governance/graph',
			attachmentRecordsApiPath: '/api/governance/attachments',
			connectionRecordsApiPath: '/api/governance/connections',
			receiptRecordsApiPath: '/api/governance/receipts',
			monitorReadinessApiPath: '/api/governance/monitors/slack/readiness'
		}
	};
}
