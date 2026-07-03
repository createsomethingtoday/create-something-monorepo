import { CANON_REGISTRY_MANIFEST } from './data.js';
import type {
	CanonRegistryItem,
	CanonRegistryKind,
	CanonRegistryManifest,
	CanonRegistryModality,
	CanonRegistryMaturity,
	CanonRegistrySearchOptions
} from './schema.js';

export { CANON_REGISTRY_MANIFEST };
export type {
	CanonRegistryContract,
	CanonRegistryItem,
	CanonRegistryKind,
	CanonRegistryManifest,
	CanonRegistryMaturity,
	CanonRegistryModality,
	CanonRegistrySearchOptions
} from './schema.js';

export function getCanonRegistryManifest(): CanonRegistryManifest {
	return CANON_REGISTRY_MANIFEST;
}

export function listCanonRegistryItems(): CanonRegistryItem[] {
	return CANON_REGISTRY_MANIFEST.items;
}

export function getCanonRegistryItem(id: string): CanonRegistryItem | undefined {
	return CANON_REGISTRY_MANIFEST.items.find((item) => item.id === id);
}

export function listCanonRegistryModalities(): CanonRegistryModality[] {
	return CANON_REGISTRY_MANIFEST.requiredModalities;
}

export function listCanonRegistryByKind(kind: CanonRegistryKind): CanonRegistryItem[] {
	return CANON_REGISTRY_MANIFEST.items.filter((item) => item.kind === kind);
}

export function listCanonRegistryByModality(
	modality: CanonRegistryModality
): CanonRegistryItem[] {
	return CANON_REGISTRY_MANIFEST.items.filter((item) => item.modalities.includes(modality));
}

export function searchCanonRegistry(
	query: string,
	options: CanonRegistrySearchOptions = {}
): CanonRegistryItem[] {
	const normalizedQuery = query.trim().toLowerCase();
	const limit = options.limit ?? 20;
	const matches = CANON_REGISTRY_MANIFEST.items
		.filter((item) => !options.kind || item.kind === options.kind)
		.filter((item) => !options.modality || item.modalities.includes(options.modality))
		.filter((item) => !options.maturity || item.maturity === options.maturity)
		.map((item) => ({ item, score: scoreCanonRegistryItem(item, normalizedQuery) }))
		.filter((result) => normalizedQuery.length === 0 || result.score > 0)
		.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
		.slice(0, limit)
		.map((result) => result.item);

	return matches;
}

function scoreCanonRegistryItem(item: CanonRegistryItem, query: string): number {
	if (!query) return 1;

	const haystacks = [
		item.id,
		item.name,
		item.kind,
		item.maturity,
		item.description,
		item.importPath ?? '',
		item.docsPath ?? '',
		...item.tags,
		...item.modalities,
		...(item.dependencies ?? []),
		item.contract.accessibility ?? '',
		item.contract.evidence ?? '',
		item.contract.motion ?? '',
		item.contract.extension ?? ''
	].map((value) => value.toLowerCase());

	return query
		.split(/\s+/)
		.filter(Boolean)
		.reduce((score, token) => {
			if (item.id.toLowerCase() === token || item.name.toLowerCase() === token) return score + 8;
			if (haystacks.some((value) => value.includes(token))) return score + 1;
			return score;
		}, 0);
}
