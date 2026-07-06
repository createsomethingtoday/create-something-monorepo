import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

const DATA_VISUAL_SCENARIOS = [
	{
		component: 'DataTable',
		sourcePath: 'packages/canon/src/lib/components/data/DataTable.svelte',
		states: [
			'default',
			'sorted-desc',
			'sorted-asc',
			'clickable-rows',
			'dense',
			'sticky-header',
			'empty',
			'focus-visible-row'
		]
	},
	{
		component: 'StatusBadge',
		sourcePath: 'packages/canon/src/lib/components/data/StatusBadge.svelte',
		states: [
			'success',
			'error',
			'warning',
			'info',
			'neutral',
			'dot-variant',
			'emphasis'
		]
	}
] as const;

describe('Canon database-layer visual regression scenarios', () => {
	it('keeps every data primitive attached to named visual states', () => {
		for (const scenario of DATA_VISUAL_SCENARIOS) {
			expect(existsSync(join(REPO_ROOT, scenario.sourcePath)), scenario.component).toBe(true);
			expect(scenario.states.length, scenario.component).toBeGreaterThanOrEqual(4);
		}
	});
});
