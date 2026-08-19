import type { Inventory, ScopeChange } from './types';

export function diffInventories(
	prev: Pick<Inventory, 'scopes' | 'categories'>,
	next: Pick<Inventory, 'scopes' | 'categories'>
): ScopeChange[] {
	const changes: ScopeChange[] = [];

	for (const [key, category] of Object.entries(next.categories)) {
		if (!prev.categories[key]) {
			changes.push({
				type: 'category_added',
				key,
				detail: `${category.name} — “${category.description}”`,
				category,
			});
		}
	}

	for (const [key, scope] of Object.entries(next.scopes)) {
		const old = prev.scopes[key];
		if (!old) {
			changes.push({ type: 'scope_added', key, detail: scope.description, scope });
			continue;
		}
		if (old.featureFlag && !scope.featureFlag) {
			changes.push({
				type: 'scope_ungated',
				key,
				detail: `was gated by Statsig \`${old.featureFlag}\`, now GA for all developers`,
				scope,
			});
		} else if (!old.featureFlag && scope.featureFlag) {
			changes.push({
				type: 'scope_gated',
				key,
				detail: `now gated by Statsig \`${scope.featureFlag}\``,
				scope,
			});
		} else if (
			old.description !== scope.description ||
			old.resourceTypes.join(',') !== scope.resourceTypes.join(',')
		) {
			changes.push({
				type: 'scope_modified',
				key,
				detail: `now “${scope.description}” (${scope.resourceTypes.join(', ') || 'no resources'})`,
				scope,
			});
		}
	}

	for (const key of Object.keys(prev.scopes)) {
		if (!next.scopes[key]) {
			changes.push({ type: 'scope_removed', key, detail: 'removed from the registry' });
		}
	}

	return changes;
}
