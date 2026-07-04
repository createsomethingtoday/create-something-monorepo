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

export type CanonProjectOverlayReview = {
	status: 'ready' | 'needs-artifacts' | 'needs-evidence' | 'needs-review';
	requiredArtifacts: CanonProjectOverlayArtifactKind[];
	presentArtifacts: CanonProjectOverlayArtifactKind[];
	missingArtifacts: CanonProjectOverlayArtifactKind[];
	extensionDecisions: Array<{
		packet: CanonExtensionIntakePacket;
		decision: CanonExtensionRoutingDecision;
	}>;
	stopConditions: string[];
	summary: string;
};
