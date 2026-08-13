import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('clear navigation mobile drawer layering', () => {
	it('creates a navigation stacking context above isolated campaign openings', () => {
		const source = readFileSync(join(process.cwd(), 'src/lib/components/Navigation.svelte'), 'utf8');

		expect(source).toContain('.nav-clear {');
		expect(source).toContain('position: relative;');
		expect(source).toContain('z-index: var(--z-performance-fixed, 40);');
		expect(source).toMatch(/\.nav-clear\.nav-fixed\s*\{[\s\S]*?position:\s*fixed;/);
		expect(source).toContain('.nav-clear .nav-mobile-menu {');
		expect(source).toContain('position: fixed;');
	});

	it('keeps a property logo static until an internal route is deliberately engaged', () => {
		const source = readFileSync(join(process.cwd(), 'src/lib/components/Navigation.svelte'), 'utf8');

		expect(source).toContain('enableRouteLogoMotion?: boolean;');
		expect(source).toContain('onclickcapture={handleRouteEngagement}');
		expect(source).toContain("await import('gsap')");
		expect(source).toContain("prefers-reduced-motion: reduce");
		expect(source).toContain('cancelLogoRouteMotion();');
		expect(source).toContain('.nav-logo-route-motion {');
		expect(source).toMatch(/\.nav-logo-route-motion\s*\{[\s\S]*?opacity:\s*0;/);
	});
});
