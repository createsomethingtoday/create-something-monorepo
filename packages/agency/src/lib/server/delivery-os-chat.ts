import type {
	DeliveryAccessItem,
	DeliveryArtifact,
	DeliveryComponent,
	DeliveryIntegration,
	DeliveryListFilter,
	DeliveryMilestone,
	DeliveryOsStore,
	DeliveryRisk
} from '@create-something/delivery-os';

import type { DeliverySharePage } from '$lib/server/delivery-os-store';

function matchesBaseFilter(
	filter: DeliveryListFilter,
	record: {
		engagementId?: string | null;
		componentId?: string | null;
		status?: string | null;
	}
) {
	if (filter.engagementId && record.engagementId !== filter.engagementId) return false;
	if (filter.componentId && record.componentId !== filter.componentId) return false;
	if (filter.status && record.status !== filter.status) return false;
	return true;
}

function filterByKind<T extends { componentId?: string | null }>(
	rows: T[],
	components: DeliveryComponent[],
	filter: DeliveryListFilter
) {
	if (!filter.kind) return rows;
	const allowedComponentIds = new Set(
		components.filter((component) => component.kind === filter.kind).map((component) => component.id)
	);
	return rows.filter((row) => row.componentId && allowedComponentIds.has(row.componentId));
}

function asPage(page: DeliverySharePage): NonNullable<DeliverySharePage> {
	if (!page) {
		throw new Error('Delivery share page is required to create a scoped delivery store.');
	}

	return page;
}

export function parseVectorStoreIds(raw: string | undefined): string[] {
	return (raw ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
}

export function extractAnswer(output: unknown): string {
	if (typeof output === 'string') return output.trim();
	if (Array.isArray(output)) {
		const joined = output.map((item) => extractAnswer(item)).filter(Boolean).join('\n\n');
		return joined.trim();
	}
	if (!output || typeof output !== 'object') return '';

	const candidate = output as Record<string, unknown>;

	if ('output' in candidate) {
		const result = extractAnswer(candidate.output);
		if (result) return result;
	}

	if ('content' in candidate) {
		const result = extractAnswer(candidate.content);
		if (result) return result;
	}

	if (candidate.type === 'output_text' && typeof candidate.text === 'string') {
		return candidate.text.trim();
	}

	if (candidate.type === 'text' && typeof candidate.text === 'string') {
		return candidate.text.trim();
	}

	for (const key of ['output_text', 'value', 'finalOutput']) {
		if (key in candidate) {
			const result = extractAnswer(candidate[key]);
			if (result) return result;
		}
	}

	return JSON.stringify(output, null, 2);
}

export function createClientShareStore(input: DeliverySharePage): DeliveryOsStore {
	const page = asPage(input);
	const components = page.components;
	const artifacts = page.artifacts;
	const milestones = page.milestones;
	const integrations = page.integrations;
	const risks = page.clientRisks;
	const accessItems = page.clientAccessItems;

	function filterComponents(filter: DeliveryListFilter = {}) {
		return components.filter((row) => {
			if (!matchesBaseFilter(filter, { engagementId: row.engagementId, status: row.status })) return false;
			if (filter.kind && row.kind !== filter.kind) return false;
			return true;
		});
	}

	function filterArtifacts(filter: DeliveryListFilter & { visibility?: DeliveryArtifact['visibility'] } = {}) {
		const rows = artifacts.filter((row) => {
			if (
				!matchesBaseFilter(filter, {
					engagementId: row.engagementId,
					componentId: row.componentId,
					status: row.status
				})
			) {
				return false;
			}
			if (filter.visibility && row.visibility !== filter.visibility) return false;
			return true;
		});

		return filterByKind(rows, components, filter);
	}

	function filterMilestones(filter: DeliveryListFilter = {}) {
		const rows = milestones.filter((row) =>
			matchesBaseFilter(filter, {
				engagementId: row.engagementId,
				componentId: row.componentId,
				status: row.status
			})
		);
		return filterByKind(rows, components, filter);
	}

	function filterIntegrations(filter: DeliveryListFilter = {}) {
		return integrations.filter((row) => {
			const component = components.find((candidate) => candidate.id === row.componentId);
			if (!matchesBaseFilter(filter, { engagementId: component?.engagementId, componentId: row.componentId, status: row.status })) {
				return false;
			}
			if (filter.kind && component?.kind !== filter.kind) return false;
			return true;
		});
	}

	function filterRisks(filter: DeliveryListFilter = {}) {
		const rows = risks.filter((row) =>
			matchesBaseFilter(filter, {
				engagementId: row.engagementId,
				componentId: row.componentId,
				status: row.status
			})
		);
		return filterByKind(rows, components, filter);
	}

	function filterAccessItems(filter: DeliveryListFilter = {}) {
		return accessItems.filter((row) => {
			const component = components.find((candidate) => candidate.id === row.componentId);
			if (!matchesBaseFilter(filter, { engagementId: component?.engagementId, componentId: row.componentId, status: row.status })) {
				return false;
			}
			if (filter.kind && component?.kind !== filter.kind) return false;
			return true;
		});
	}

	return {
		async listEngagements(filter: DeliveryListFilter = {}) {
			if (filter.engagementId && filter.engagementId !== page.engagement.id) return [];
			if (filter.clientId && filter.clientId !== page.engagement.clientId) return [];
			if (filter.clientSlug && filter.clientSlug !== page.client?.slug) return [];
			if (filter.status && filter.status !== page.engagement.status) return [];
			return [page.engagement];
		},
		async getEngagement(input: { engagementId?: string; clientSlug?: string }) {
			if (input.engagementId && input.engagementId !== page.engagement.id) return null;
			if (input.clientSlug && input.clientSlug !== page.client?.slug) return null;
			return page.engagement;
		},
		async listComponents(filter: DeliveryListFilter = {}) {
			return filterComponents(filter);
		},
		async listArtifacts(filter: DeliveryListFilter & { visibility?: DeliveryArtifact['visibility'] } = {}) {
			return filterArtifacts(filter);
		},
		async listMilestones(filter: DeliveryListFilter = {}) {
			return filterMilestones(filter);
		},
		async listIntegrations(filter: DeliveryListFilter = {}) {
			return filterIntegrations(filter);
		},
		async listRisks(filter: DeliveryListFilter = {}) {
			return filterRisks(filter);
		},
		async listAccessItems(filter: DeliveryListFilter = {}) {
			return filterAccessItems(filter);
		},
		async getCommercialSnapshot(input: { engagementId: string }) {
			if (input.engagementId !== page.engagement.id) return null;
			return page.commercial;
		}
	};
}
