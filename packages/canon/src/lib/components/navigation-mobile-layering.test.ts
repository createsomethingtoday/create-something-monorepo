import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('clear navigation mobile drawer layering', () => {
	it('creates a navigation stacking context above isolated campaign openings', () => {
		const source = readFileSync(join(process.cwd(), 'src/lib/components/Navigation.svelte'), 'utf8');

		expect(source).toContain('.nav-clear {');
		expect(source).toContain('position: relative;');
		expect(source).toContain('z-index: var(--z-performance-fixed, 40);');
		expect(source).toContain('.nav-clear .nav-mobile-menu {');
		expect(source).toContain('position: fixed;');
	});
});
