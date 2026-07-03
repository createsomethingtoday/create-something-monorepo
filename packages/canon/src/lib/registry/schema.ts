export type CanonRegistryKind = 'component' | 'token' | 'template' | 'adapter' | 'policy';

export type CanonRegistryMaturity = 'stable' | 'candidate' | 'experimental';

export type CanonRegistryModality = 'web' | 'chat' | 'app' | 'voice' | 'glasses';

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
		stage: 'project-local' | 'candidate' | 'canon-stable' | 'deprecated';
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
