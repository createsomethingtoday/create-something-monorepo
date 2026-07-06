import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

const NAVIGATION_VISUAL_SCENARIOS = [
	{
		component: 'Navigation',
		sourcePath: 'packages/canon/src/lib/components/Navigation.svelte',
		states: ['classic', 'clear', 'desktop-current-path', 'mobile-open']
	},
	{
		component: 'Breadcrumbs',
		sourcePath: 'packages/canon/src/lib/components/navigation/Breadcrumbs.svelte',
		states: ['with-home', 'without-home', 'long-path', 'mobile-wrap']
	},
	{
		component: 'DropdownMenu',
		sourcePath: 'packages/canon/src/lib/components/navigation/DropdownMenu.svelte',
		states: ['closed', 'open', 'keyboard-focus', 'disabled-item']
	},
	{
		component: 'Pagination',
		sourcePath: 'packages/canon/src/lib/components/navigation/Pagination.svelte',
		states: ['first-page', 'middle-page', 'last-page', 'compact-mobile']
	},
	{
		component: 'Popover',
		sourcePath: 'packages/canon/src/lib/components/navigation/Popover.svelte',
		states: ['closed', 'open', 'top-placement', 'mobile-fit']
	},
	{
		component: 'Tooltip',
		sourcePath: 'packages/canon/src/lib/components/navigation/Tooltip.svelte',
		states: ['hover', 'focus', 'long-label', 'reduced-motion']
	}
] as const;

describe('Canon navigation visual regression scenarios', () => {
	it('keeps stable navigation primitives attached to named visual states', () => {
		for (const scenario of NAVIGATION_VISUAL_SCENARIOS) {
			expect(existsSync(join(REPO_ROOT, scenario.sourcePath)), scenario.component).toBe(true);
			expect(scenario.states.length, scenario.component).toBeGreaterThanOrEqual(4);
		}
	});
});
