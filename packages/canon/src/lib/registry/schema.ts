export type CanonRegistryKind = 'component' | 'token' | 'template' | 'adapter' | 'policy';

export type CanonRegistryMaturity = 'stable' | 'candidate' | 'experimental';

export type CanonRegistryModality = 'web' | 'chat' | 'app' | 'voice' | 'glasses';

export type CanonExtensionLifecycleStage =
	| 'project-local'
	| 'candidate'
	| 'canon-stable'
	| 'deprecated';

export type CanonRegistryContract = {
	accessibility?: string;
	evidence?: string;
	motion?: string;
	extension?: string;
};

export type CanonRegistryItem = {
	id: string;
	name: string;
	kind: CanonRegistryKind;
	maturity: CanonRegistryMaturity;
	description: string;
	ownerPackage: '@create-something/canon' | '@createsomething/canon-tokens';
	sourcePath: string;
	importPath?: string;
	docsPath?: string;
	tags: string[];
	modalities: CanonRegistryModality[];
	dependencies?: string[];
	contract: CanonRegistryContract;
};

export type CanonRegistryManifest = {
	schemaVersion: 1;
	id: 'canon-registry';
	sourceOfTruth: '@create-something/canon/registry';
	description: string;
	requiredModalities: CanonRegistryModality[];
	items: CanonRegistryItem[];
	extensionLifecycle: Array<{
		stage: CanonExtensionLifecycleStage;
		description: string;
	}>;
	agentContract: {
		purpose: 'canon-design-system-discovery';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonRegistrySearchOptions = {
	kind?: CanonRegistryKind;
	modality?: CanonRegistryModality;
	maturity?: CanonRegistryMaturity;
	limit?: number;
};

export type CanonExtensionSurfaceEvidence = {
	surfaceId: string;
	name: string;
	modality: CanonRegistryModality;
	sourcePath?: string;
	proof?: string;
};

export type CanonExtensionIntakePacket = {
	id: string;
	title: string;
	summary: string;
	requestedKind: CanonRegistryKind;
	requestedModalities: CanonRegistryModality[];
	owner: string;
	sourcePackage: string;
	sourcePath?: string;
	tags: string[];
	surfaces: CanonExtensionSurfaceEvidence[];
	dependencies?: string[];
	matchesRegistryItemId?: string;
	deprecatesRegistryItemId?: string;
};

export type CanonExtensionRoutingDecision = {
	stage: CanonExtensionLifecycleStage;
	action:
		| 'use-existing'
		| 'keep-local'
		| 'promote-candidate'
		| 'mark-deprecated'
		| 'needs-review';
	rationale: string;
	requiredEvidence: string[];
	stopBeforeStable: string[];
};

export type CanonProjectOverlayArtifactKind =
	| 'theme'
	| 'tokens'
	| 'templates'
	| 'copy-rules'
	| 'surface-policy'
	| 'registry';

export type CanonProjectOverlayArtifact = {
	kind: CanonProjectOverlayArtifactKind;
	path: string;
	description?: string;
	registryItemIds?: string[];
};

export type CanonProjectOverlayManifest = {
	id: string;
	name: string;
	owner: string;
	sourcePackage: string;
	sourcePath?: string;
	targetModalities: CanonRegistryModality[];
	tags?: string[];
	artifacts: CanonProjectOverlayArtifact[];
	extensionIntakes?: CanonExtensionIntakePacket[];
};

export type CanonProjectOverlayIntegrityIssue = {
	kind: 'missing-artifact-file' | 'missing-source-path' | 'unknown-registry-item';
	context: string;
	path?: string;
	registryItemId?: string;
	message: string;
};

export type CanonProjectOverlayReview = {
	status: 'ready' | 'needs-artifacts' | 'needs-evidence' | 'needs-review';
	requiredArtifacts: CanonProjectOverlayArtifactKind[];
	presentArtifacts: CanonProjectOverlayArtifactKind[];
	missingArtifacts: CanonProjectOverlayArtifactKind[];
	integrityIssues: CanonProjectOverlayIntegrityIssue[];
	extensionDecisions: Array<{
		packet: CanonExtensionIntakePacket;
		decision: CanonExtensionRoutingDecision;
	}>;
	stopConditions: string[];
	summary: string;
};

export type CanonProjectOverlayInventoryEntry = {
	manifestPath: string;
	manifest: CanonProjectOverlayManifest;
	review: CanonProjectOverlayReview;
};

export type CanonProjectOverlayInventory = {
	schemaVersion: 1;
	id: 'canon-overlay-intake-inventory';
	sourceOfTruth: '@create-something/canon/overlays/intake';
	description: string;
	rootDir: string;
	searchRoots: string[];
	entries: CanonProjectOverlayInventoryEntry[];
	summary: {
		total: number;
		ready: number;
		needsArtifacts: number;
		needsEvidence: number;
		needsReview: number;
		candidateIntakes: number;
		projectLocalIntakes: number;
	};
	agentContract: {
		purpose: 'canon-overlay-intake-inventory';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidateQueueEntry = {
	id: string;
	overlayId: string;
	overlayName: string;
	manifestPath: string;
	intakeId: string;
	title: string;
	summary: string;
	owner: string;
	sourcePackage: string;
	sourcePath?: string;
	requestedKind: CanonRegistryKind;
	requestedModalities: CanonRegistryModality[];
	tags: string[];
	surfaces: CanonExtensionSurfaceEvidence[];
	dependencies: string[];
	requiredEvidence: string[];
	stopBeforeStable: string[];
	rationale: string;
	reviewUri: string;
	candidateUri: string;
	handoffUri: string;
};

export type CanonOverlayCandidateQueue = {
	schemaVersion: 1;
	id: 'canon-overlay-candidate-queue';
	sourceOfTruth: '@create-something/canon/overlays/intake';
	description: string;
	entries: CanonOverlayCandidateQueueEntry[];
	summary: {
		total: number;
		overlays: number;
		byRequestedKind: Array<{ kind: CanonRegistryKind; count: number }>;
		byModality: Array<{ modality: CanonRegistryModality; count: number }>;
	};
	agentContract: {
		purpose: 'canon-overlay-candidate-review';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidateReviewPacket = {
	id: string;
	candidateId: string;
	title: string;
	summary: string;
	overlayId: string;
	overlayName: string;
	manifestPath: string;
	intakeId: string;
	owner: string;
	sourcePackage: string;
	sourcePath?: string;
	requestedKind: CanonRegistryKind;
	requestedModalities: CanonRegistryModality[];
	tags: string[];
	surfaces: CanonExtensionSurfaceEvidence[];
	dependencies: string[];
	requiredEvidence: string[];
	stopBeforeStable: string[];
	rationale: string;
	reviewUri: string;
	candidateUri: string;
	handoffUri: string;
	promotionChecklist: string[];
	approvalBoundary: string[];
	agentContract: {
		purpose: 'canon-overlay-candidate-review-packet';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidateReviewPacketCollection = {
	schemaVersion: 1;
	id: 'canon-overlay-candidate-review-packets';
	sourceOfTruth: '@create-something/canon/overlays/intake';
	description: string;
	entries: CanonOverlayCandidateReviewPacket[];
	summary: {
		total: number;
		overlays: number;
		byRequestedKind: Array<{ kind: CanonRegistryKind; count: number }>;
		byModality: Array<{ modality: CanonRegistryModality; count: number }>;
	};
	agentContract: {
		purpose: 'canon-overlay-candidate-review-packets';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidatePromotionPlan = {
	id: string;
	packetId: string;
	candidateId: string;
	intakeId: string;
	title: string;
	summary: string;
	overlayId: string;
	overlayName: string;
	manifestPath: string;
	owner: string;
	sourcePackage: string;
	sourcePath?: string;
	requestedKind: CanonRegistryKind;
	requestedModalities: CanonRegistryModality[];
	planUri: string;
	handoffUri: string;
	candidateUri: string;
	reviewUri: string;
	preconditions: string[];
	implementationScope: string[];
	requiredChanges: string[];
	validationPlan: string[];
	documentationPlan: string[];
	compatibilityPlan: string[];
	stopConditions: string[];
	approvalBoundary: string[];
	agentContract: {
		purpose: 'canon-overlay-candidate-promotion-plan';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidatePromotionPlanCollection = {
	schemaVersion: 1;
	id: 'canon-overlay-candidate-promotion-plans';
	sourceOfTruth: '@create-something/canon/overlays/intake';
	description: string;
	entries: CanonOverlayCandidatePromotionPlan[];
	summary: {
		total: number;
		overlays: number;
		byRequestedKind: Array<{ kind: CanonRegistryKind; count: number }>;
		byModality: Array<{ modality: CanonRegistryModality; count: number }>;
	};
	agentContract: {
		purpose: 'canon-overlay-candidate-promotion-plans';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidatePromotionReadinessStatus =
	| 'needs-approval'
	| 'needs-targets'
	| 'ready-for-implementation';

export type CanonOverlayCandidatePromotionReadinessCheckStatus =
	| 'ready'
	| 'review'
	| 'missing'
	| 'needs-input';

export type CanonOverlayCandidatePromotionReadinessCheck = {
	id: string;
	label: string;
	status: CanonOverlayCandidatePromotionReadinessCheckStatus;
	evidence: string[];
	requiredAction: string;
};

export type CanonOverlayCandidatePromotionReadinessRegistryMatch = {
	id: string;
	name: string;
	kind: CanonRegistryKind;
	maturity: CanonRegistryMaturity;
	modalities: CanonRegistryModality[];
	docsPath?: string;
	score: number;
	reason: string;
};

export type CanonOverlayCandidatePromotionReadinessExportMatch = {
	exportPath: string;
	exportName?: string;
	classification: string;
	registryPolicy: string;
	registryItemIds?: string[];
	score: number;
	rationale: string;
};

export type CanonOverlayCandidatePromotionReadinessReport = {
	id: string;
	planId: string;
	candidateId: string;
	intakeId: string;
	title: string;
	summary: string;
	status: CanonOverlayCandidatePromotionReadinessStatus;
	readinessUri: string;
	planUri: string;
	handoffUri: string;
	candidateUri: string;
	reviewUri: string;
	checks: CanonOverlayCandidatePromotionReadinessCheck[];
	relatedRegistryItems: CanonOverlayCandidatePromotionReadinessRegistryMatch[];
	candidateExportPolicies: CanonOverlayCandidatePromotionReadinessExportMatch[];
	stopConditions: string[];
	approvalBoundary: string[];
	agentContract: {
		purpose: 'canon-overlay-candidate-promotion-readiness-report';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayCandidatePromotionReadinessReportCollection = {
	schemaVersion: 1;
	id: 'canon-overlay-candidate-promotion-readiness-reports';
	sourceOfTruth: '@create-something/canon/overlays/intake';
	description: string;
	entries: CanonOverlayCandidatePromotionReadinessReport[];
	summary: {
		total: number;
		needsApproval: number;
		needsTargets: number;
		readyForImplementation: number;
	};
	agentContract: {
		purpose: 'canon-overlay-candidate-promotion-readiness-reports';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonOverlayModalityContract = {
	modality: CanonRegistryModality;
	useFor: string;
	overlayOwns: string[];
	canonOwns: string[];
};

export type CanonProjectOverlayCatalogEntry = {
	id: string;
	name: string;
	summary: string;
	docsPath: string;
	registryItemIds: string[];
	outputFiles: string[];
	manifest: CanonProjectOverlayManifest;
	review: CanonProjectOverlayReview;
};

export type CanonOverlayCatalog = {
	schemaVersion: 1;
	id: 'canon-overlay-catalog';
	sourceOfTruth: '@create-something/canon/overlays';
	description: string;
	requiredArtifacts: CanonProjectOverlayArtifactKind[];
	overlayRules: string[];
	modalityContracts: CanonOverlayModalityContract[];
	templates: CanonProjectOverlayCatalogEntry[];
	agentContract: {
		purpose: 'canon-overlay-extension-discovery';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};
