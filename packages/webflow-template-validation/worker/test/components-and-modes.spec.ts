import { describe, it, expect, vi } from 'vitest';
import { validateDesignerData } from '../src/validators/designer-validator';
import worker from '../src/index';

function baseDesignerData(overrides: Record<string, unknown> = {}) {
	return {
		variables: undefined,
		components: [],
		styles: [],
		pages: [],
		assets: [],
		...overrides
	} as any;
}

function modeData(modes: Array<Record<string, unknown>>) {
	return {
		collections: [
			{
				id: 'col_spacing',
				name: 'Spacing',
				variables: [{ id: 'v1', name: 'Space Small', type: 'size', value: null }],
				modes
			}
		]
	};
}

async function category(data: any, name: string) {
	const result = await validateDesignerData(data);
	return result.categories.find((c) => c.category === name)!;
}

const REQUIRED_COMPONENTS = [
	{ id: 'c_nav', name: 'Navigation Bar', type: 'component' },
	{ id: 'c_footer', name: 'Footer', type: 'component' },
	{ id: 'c_cta', name: 'CTA Section', type: 'component' }
];

describe('Variable modes: breakpoint-bound detection', () => {
	it('legacy payload without breakpointId keeps the name heuristic and the exact previous stats', async () => {
		const modes = await category(
			baseDesignerData({ variables: modeData([{ id: 'm1', name: 'Base' }, { id: 'm2', name: 'Tablet' }]) }),
			'Variable Modes'
		);

		expect(modes.issues.map((i) => [i.id, i.severity])).toEqual([['modes.good', 'info']]);
		expect(modes.stats).toEqual({
			totalModes: 2,
			collectionsWithModes: 1,
			hasResponsiveModes: true,
			responsiveModeNamesDetected: true,
			modeNames: ['Base', 'Tablet'],
			modeDataAvailable: true,
			collectionsCheckedForModes: 1
		});
	});

	it('uses breakpointId, not the mode name: "Tablet" (manual) is not responsive, "Compact" (medium) is', async () => {
		const modes = await category(
			baseDesignerData({
				variables: modeData([
					{ id: 'm1', name: 'Tablet', breakpointId: null },
					{ id: 'm2', name: 'Compact', breakpointId: 'medium' }
				])
			}),
			'Variable Modes'
		);

		expect(modes.issues.map((i) => [i.id, i.severity])).toEqual([['modes.good', 'info']]);
		expect(modes.stats?.hasResponsiveModes).toBe(true);
		expect(modes.stats?.responsiveModeSource).toBe('breakpoint');
		expect(modes.stats?.breakpointBoundModeNames).toEqual(['Compact']);
		expect(modes.stats?.responsiveModeNamesDetected).toBeUndefined();
	});

	it('does not credit responsive-looking names when every mode reports as manual', async () => {
		const modes = await category(
			baseDesignerData({
				variables: modeData([
					{ id: 'm1', name: 'Tablet', breakpointId: null },
					{ id: 'm2', name: 'Mobile', breakpointId: null }
				])
			}),
			'Variable Modes'
		);

		expect(modes.issues.map((i) => i.id)).toEqual(['modes.good']);
		expect(modes.stats?.hasResponsiveModes).toBe(false);
		expect(modes.stats?.responsiveModeSource).toBe('breakpoint');
		expect(modes.stats?.breakpointBoundModeNames).toEqual([]);
	});

	it('keeps modes.none severity and id unchanged when collections carry an empty modes list', async () => {
		const modes = await category(baseDesignerData({ variables: modeData([]) }), 'Variable Modes');
		expect(modes.issues.map((i) => [i.id, i.severity])).toEqual([['modes.none', 'warning']]);
	});
});

describe('Variable modes: per-mode breakpoint decision', () => {
	// The extension omits `breakpointId` for a mode whose getBreakpoint() rejected.
	// That mode must fall back to the name heuristic instead of being read as manual.
	it('credits a mode without a breakpointId key by name while a sibling is breakpoint-bound', async () => {
		const modes = await category(
			baseDesignerData({
				variables: modeData([
					{ id: 'm1', name: 'Tablet' },
					{ id: 'm2', name: 'Compact', breakpointId: 'medium' }
				])
			}),
			'Variable Modes'
		);

		expect(modes.issues.map((i) => [i.id, i.severity])).toEqual([['modes.good', 'info']]);
		expect(modes.stats?.hasResponsiveModes).toBe(true);
		expect(modes.stats?.responsiveModeSource).toBe('mixed');
		expect(modes.stats?.breakpointBoundModeNames).toEqual(['Compact']);
		expect(modes.stats?.nameMatchedModeNames).toEqual(['Tablet']);
	});

	it('still reports a pure breakpoint source when every mode carries the key', async () => {
		const modes = await category(
			baseDesignerData({
				variables: modeData([
					{ id: 'm1', name: 'Tablet', breakpointId: null },
					{ id: 'm2', name: 'Compact', breakpointId: 'medium' }
				])
			}),
			'Variable Modes'
		);
		expect(modes.stats?.responsiveModeSource).toBe('breakpoint');
		expect(modes.stats?.nameMatchedModeNames).toBeUndefined();
	});

	it('does not credit a keyless mode whose name is not responsive-looking', async () => {
		const modes = await category(
			baseDesignerData({
				variables: modeData([
					{ id: 'm1', name: 'Brand Dark' },
					{ id: 'm2', name: 'Studio', breakpointId: null }
				])
			}),
			'Variable Modes'
		);
		expect(modes.stats?.hasResponsiveModes).toBe(false);
		expect(modes.stats?.responsiveModeSource).toBe('mixed');
		expect(modes.stats?.breakpointBoundModeNames).toEqual([]);
		expect(modes.stats?.nameMatchedModeNames).toEqual([]);
	});
});

describe('Components: library and code components', () => {
	it('legacy payload without the new fields validates identically', async () => {
		const components = await category(
			baseDesignerData({
				components: [...REQUIRED_COMPONENTS, { id: 'c_bad', name: 'hero_section', type: 'component' }]
			}),
			'Components'
		);

		expect(components.issues.map((i) => [i.id, i.severity])).toEqual([['components.naming', 'warning']]);
		expect(components.issues[0].details).toEqual({ sample: ['hero_section'] });
		expect(components.stats).toEqual({ totalComponents: 4, navComponents: 1, footerComponents: 1, ctaComponents: 1 });
	});

	it('does not flag naming on library components the creator did not author', async () => {
		const components = await category(
			baseDesignerData({
				components: [
					...REQUIRED_COMPONENTS,
					{ id: 'c_lib', name: 'relume_navbar-1', type: 'component', readOnly: true, codeComponent: false, library: { id: 'lib_1', name: 'Relume' } },
					{ id: 'c_own', name: 'hero_section', type: 'component', readOnly: false, codeComponent: false, library: null }
				]
			}),
			'Components'
		);

		const naming = components.issues.find((i) => i.id === 'components.naming');
		expect(naming?.severity).toBe('warning');
		expect(naming?.details).toEqual({ sample: ['hero_section'] });
		expect(naming?.message).toMatch(/^1 components/);
	});

	it('reports code components as info only, never warning or error', async () => {
		const components = await category(
			baseDesignerData({
				components: [
					...REQUIRED_COMPONENTS.map((c) => ({ ...c, readOnly: false, codeComponent: false, library: null })),
					{ id: 'c_code', name: 'Pricing Slider', type: 'component', readOnly: false, codeComponent: true, library: null },
					{ id: 'c_code_ro', name: 'Map Embed', type: 'component', readOnly: true, codeComponent: true, library: { id: 'lib_2', name: 'Maps Kit' } }
				]
			}),
			'Components'
		);

		const codeIssue = components.issues.find((i) => i.id === 'components.code-components-present');
		expect(codeIssue?.severity).toBe('info');
		expect(codeIssue?.details).toEqual({ names: ['Pricing Slider', 'Map Embed'] });

		const libraryIssue = components.issues.find((i) => i.id === 'components.library-components-present');
		expect(libraryIssue?.severity).toBe('info');
		expect(libraryIssue?.details).toEqual({ names: ['Map Embed'], libraries: ['Maps Kit'] });

		expect(components.issues.filter((i) => i.severity !== 'info')).toEqual([]);
		// Informational disclosure must not suppress the "excellent" result.
		expect(components.issues.some((i) => i.id === 'components.excellent')).toBe(true);
		expect(components.passed).toBe(true);
		expect(components.stats).toMatchObject({ codeComponents: 2, libraryComponents: 1 });
	});

	// The 2.2 extension sends `codeComponent: null, library: null` when the Designer
	// runtime predates those getters. Null means "not reported", not "zero".
	it('treats all-null 2.2 metadata as not reported', async () => {
		const components = await category(
			baseDesignerData({
				components: REQUIRED_COMPONENTS.map((c) => ({ ...c, readOnly: null, codeComponent: null, library: null }))
			}),
			'Components'
		);

		expect(components.stats).toEqual({ totalComponents: 3, navComponents: 1, footerComponents: 1, ctaComponents: 1 });
		expect(components.issues.map((i) => i.id)).toEqual(['components.excellent']);
	});

	// ReadOnlyCodeComponent: read-only, no library. The creator cannot rename it.
	it('does not naming-check read-only components even when they have no library', async () => {
		const components = await category(
			baseDesignerData({
				components: [
					...REQUIRED_COMPONENTS,
					{ id: 'c_ro', name: 'vendor_map-embed', type: 'component', readOnly: true, codeComponent: true, library: null }
				]
			}),
			'Components'
		);

		expect(components.issues.some((i) => i.id === 'components.naming')).toBe(false);
		expect(components.issues.find((i) => i.id === 'components.code-components-present')?.details).toEqual({
			names: ['vendor_map-embed']
		});
		expect(components.issues.filter((i) => i.severity === 'error')).toEqual([]);
	});
});

describe('Malformed payloads: primitives inside arrays', () => {
	// POST /api/validate accepts arbitrary JSON. Before the 2.2 metadata checks, a
	// string element simply matched nothing; it must not become a 500.
	it('does not throw when components contains a string', async () => {
		const components = await category(baseDesignerData({ components: ['Navbar'] }), 'Components');

		expect(components.stats).toEqual({ totalComponents: 1, navComponents: 0, footerComponents: 0, ctaComponents: 0 });
		expect(components.issues.map((i) => [i.id, i.severity])).toEqual([['components.missing-required', 'warning']]);
	});

	it('does not throw when modes contains a string', async () => {
		const modes = await category(baseDesignerData({ variables: modeData(['Tablet'] as any) }), 'Variable Modes');

		expect(modes.issues.map((i) => [i.id, i.severity])).toEqual([['modes.good', 'info']]);
		expect(modes.stats).toEqual({
			totalModes: 1,
			collectionsWithModes: 1,
			hasResponsiveModes: false,
			responsiveModeNamesDetected: false,
			modeNames: [],
			modeDataAvailable: true,
			collectionsCheckedForModes: 1
		});
	});
});

describe('Designer payload transport', () => {
	it('preserves breakpointId and library metadata through POST /api/validate', async () => {
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/api/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					designerData: baseDesignerData({
						variables: modeData([
							{ id: 'm1', name: 'Tablet', breakpointId: null },
							{ id: 'm2', name: 'Compact', breakpointId: 'medium' }
						]),
						components: [
							...REQUIRED_COMPONENTS,
							{ id: 'c_lib', name: 'relume_navbar-1', type: 'component', readOnly: true, codeComponent: true, library: { id: 'lib_1', name: 'Relume' } }
						]
					})
				})
			}),
			{},
			{ waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as any;
		const modes = body.categories.find((c: any) => c.category === 'Variable Modes');
		expect(modes.stats.breakpointBoundModeNames).toEqual(['Compact']);
		const components = body.categories.find((c: any) => c.category === 'Components');
		expect(components.issues.some((i: any) => i.id === 'components.naming')).toBe(false);
		expect(components.issues.some((i: any) => i.id === 'components.code-components-present')).toBe(true);
	});
});
