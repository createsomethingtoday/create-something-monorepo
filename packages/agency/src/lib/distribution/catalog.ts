import {
	DISTRIBUTION_ARTIFACT_KIND_ORDER,
	DISTRIBUTION_CATALOG,
	DISTRIBUTION_HOST_LABELS,
	DISTRIBUTION_TARGET_HOST_VALUES,
	getDistributionGooseExportCommand,
	getDistributionGooseExportOutputDir,
	type DistributionCatalogEntry,
	type DistributionGooseQuickstartStep,
	type DistributionHost,
	type DistributionInstallAction,
	type DistributionTargetHost,
	getDistributionArtifact,
	getDistributionArtifactsByKind,
	getDistributionCompatibilityHosts,
	getDistributionCompatibilityInstallActions,
	getDistributionGooseInstallActions,
	getDistributionGooseQuickstart,
	getRelatedDistributionArtifacts
} from '@create-something/playbook-mcp/distribution';

export type {
	DistributionCatalogEntry,
	DistributionGooseQuickstartStep,
	DistributionHost,
	DistributionInstallAction,
	DistributionTargetHost
};

export const DISTRIBUTION_CATALOG_ENTRIES = [...DISTRIBUTION_CATALOG];

export const DISTRIBUTION_HOSTS =
	DISTRIBUTION_TARGET_HOST_VALUES as readonly DistributionTargetHost[];

export { DISTRIBUTION_HOST_LABELS };

export const DISTRIBUTION_KIND_ORDER =
	DISTRIBUTION_ARTIFACT_KIND_ORDER as readonly DistributionCatalogEntry['kind'][];

export const DISTRIBUTION_KIND_LABELS: Record<DistributionCatalogEntry['kind'], string> = {
	distro: 'Distro',
	extension: 'Extension',
	policy_pack: 'Policy Pack',
	recipe: 'Recipe'
};

export function getArtifactById(id: string): DistributionCatalogEntry | undefined {
	return getDistributionArtifact(id);
}

export function getArtifactsByKind(kind: DistributionCatalogEntry['kind']): DistributionCatalogEntry[] {
	return getDistributionArtifactsByKind(kind);
}

export function getArtifactField(entry: DistributionCatalogEntry, key: string): string | null {
	const artifacts = entry.artifacts as Record<string, string> | undefined;
	const value = artifacts?.[key];

	return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getArtifactLink(entry: DistributionCatalogEntry): string | null {
	const landingPage = getArtifactField(entry, 'landingPage');

	if (!landingPage) {
		return null;
	}

	try {
		const url = new URL(landingPage);
		if (url.hostname === 'createsomething.agency') {
			return `${url.pathname}${url.search}${url.hash}`;
		}
	} catch {
		return landingPage;
	}

	return landingPage;
}

export function getRelatedEntries(entry: DistributionCatalogEntry): DistributionCatalogEntry[] {
	return getRelatedDistributionArtifacts(entry);
}

export function getGooseInstallActions(entry: DistributionCatalogEntry): DistributionInstallAction[] {
	return getDistributionGooseInstallActions(entry);
}

export function getCompatibilityHosts(entry: DistributionCatalogEntry): DistributionHost[] {
	return getDistributionCompatibilityHosts(entry);
}

export function getCompatibilityActions(
	entry: DistributionCatalogEntry,
	host?: DistributionHost
): DistributionInstallAction[] {
	return getDistributionCompatibilityInstallActions(entry, host);
}

export function getGooseExportCommand(entry: DistributionCatalogEntry): string {
	return getDistributionGooseExportCommand(entry);
}

export function getGooseExportOutputDir(entry: DistributionCatalogEntry): string {
	return getDistributionGooseExportOutputDir(entry);
}

export function getGooseQuickstart(entry: DistributionCatalogEntry): DistributionGooseQuickstartStep[] {
	return getDistributionGooseQuickstart(entry);
}

export function getInstallPayload(action: DistributionInstallAction): string {
	return action.payload;
}

export function isLaunchMode(action: DistributionInstallAction): boolean {
	return action.type === 'goose_extension' || action.type === 'cursor_deeplink';
}

export function getInstallActionLabel(action: DistributionInstallAction): string {
	if (action.type === 'goose_extension') {
		return 'Install in Goose';
	}

	if (action.type === 'goose_recipe') {
		return 'Copy recipe command';
	}

	if (action.type === 'goose_distro') {
		return 'Copy init-config path';
	}

	if (action.type === 'goose_bundle') {
		return 'Copy bundle path';
	}

	if (
		action.type === 'persistent_instructions_file' ||
		action.type === 'prompt_template_file' ||
		action.type === 'adversary_rule_file'
	) {
		return 'Copy file path';
	}

	if (action.type === 'vscode_extension_hint') {
		return 'Copy hint';
	}

	if (
		action.type === 'codex_command' ||
		action.type === 'claude_code_command' ||
		action.type === 'stdio_command'
	) {
		return 'Copy command';
	}

	return 'Copy config';
}

export function getInstallModeNote(action: DistributionInstallAction): string {
	switch (action.type) {
		case 'goose_extension':
			return 'Goose-standard install path for the extension.';
		case 'goose_recipe':
			return 'Goose recipe command or file for a bundled workflow.';
		case 'goose_distro':
			return 'Starter distro config for first-run defaults.';
		case 'goose_bundle':
			return 'Bundle path inside the Goose-standard packaging tree.';
		case 'persistent_instructions_file':
			return 'Use as a persistent instructions source in Goose.';
		case 'prompt_template_file':
			return 'Prompt template file for Goose prompt overrides.';
		case 'adversary_rule_file':
			return 'Adversary rules file for Goose safety review.';
		case 'stdio_command':
			return 'Portable stdio fallback when you need the raw MCP command.';
		case 'cursor_deeplink':
			return 'Compatibility deeplink for Cursor.';
		case 'cursor_config':
			return 'Compatibility config block for Cursor.';
		case 'claude_code_command':
			return 'Compatibility command for Claude Code.';
		case 'claude_desktop_config':
			return 'Compatibility config block for Claude Desktop.';
		case 'windsurf_config':
			return 'Compatibility config block for Windsurf.';
		case 'codex_command':
			return 'Compatibility command for Codex.';
		case 'codex_config':
			return 'Compatibility config block for Codex.';
		case 'vscode_extension_hint':
			return 'Compatibility hint for VS Code MCP setup.';
		default:
			return 'Compatibility output.';
	}
}

export function formatKind(kind: DistributionCatalogEntry['kind']): string {
	return DISTRIBUTION_KIND_LABELS[kind];
}

export function formatHostList(hosts: readonly DistributionHost[]): string {
	if (hosts.length === 0) {
		return 'Goose-only';
	}

	return hosts.map((host) => DISTRIBUTION_HOST_LABELS[host]).join(', ');
}
