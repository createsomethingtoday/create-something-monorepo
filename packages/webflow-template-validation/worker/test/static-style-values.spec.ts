import { describe, expect, it } from 'vitest';
import { validateDesignerData } from '../src/validators/designer-validator';
import { findStaticValuesMatchingVariables } from '../src/validators/static-style-values';
import type { DesignerData, StyleData, VariableData } from '../src/types';

const VARIABLES: VariableData = {
	collections: [
		{
			id: 'c1',
			name: 'Colors',
			variables: [
				{ id: 'variable-ink', name: 'Ink', type: 'Color', value: '#1a1b1f' },
				{ id: 'variable-white', name: 'White', type: 'Color', value: '#ffffff' },
				// An alias: its value is another Variable.
				{ id: 'variable-brand', name: 'Brand', type: 'Color', value: { id: 'variable-blue' } },
				{ id: 'variable-blue', name: 'Blue', type: 'Color', value: 'hsla(216, 92%, 52%, 1)' }
			]
		},
		{
			id: 'c2',
			name: 'Sizes',
			variables: [
				{ id: 'variable-h1', name: 'Heading XL', type: 'Size', value: { unit: 'rem', value: 3 } },
				{ id: 'variable-space', name: 'Space 16', type: 'Size', value: '16px' },
				{ id: 'variable-unused', name: 'Space 40', type: 'Size', value: '40px' },
				{ id: 'variable-font', name: 'Body Font', type: 'FontFamily', value: 'Inter' }
			]
		}
	]
};

const style = (name: string, properties: Record<string, unknown>, extra: Partial<StyleData> = {}): StyleData => ({
	id: name,
	name,
	type: 'global',
	source: 'site',
	properties,
	...extra
});

// Styles that link the size Variables, so each Variable has a known use.
const LINKED = [
	style('Heading One', { 'font-size': { id: 'variable-h1' } }),
	style('Card', { 'padding-top': { id: 'variable-space' } })
];

const find = (styles: StyleData[], variables: VariableData = VARIABLES) =>
	findStaticValuesMatchingVariables(styles, variables).map((f) => `${f.style}: ${f.property} ${f.value} (${f.variable})`);

describe('static values that match a Variable', () => {
	it.each([
		['#1a1b1f', 'Ink'],
		['#1A1B1F', 'Ink'],
		['rgb(26, 27, 31)', 'Ink'],
		['white', 'White'],
		['#fff', 'White'],
		['hsla(0, 0.00%, 100.00%, 1.00)', 'White'],
		// "Brand" is an alias of "Blue". Two Variables have this value; the first one is named.
		['hsla(216, 92.00%, 52.00%, 1.00)', 'Brand']
	])('finds the color %s', (value, variable) => {
		expect(find([style('Hero Title', { color: value })])).toEqual([`Hero Title: color ${value} (${variable})`]);
	});

	it('does not report a linked value, a color with no Variable, or a transparent color', () => {
		expect(
			find([
				style('Hero Title', {
					color: { id: 'variable-ink' },
					'background-color': '#123456',
					'border-top-color': 'transparent',
					'outline-color': 'hsla(0, 0.00%, 100.00%, 0.00)'
				})
			])
		).toEqual([]);
	});

	it('does not match a half-transparent color to an opaque Variable', () => {
		expect(find([style('Overlay', { 'background-color': 'hsla(0, 0.00%, 100.00%, 0.50)' })])).toEqual([]);
	});

	it('finds a size only when the Variable is linked to the same kind of property in another style', () => {
		const findings = find([
			...LINKED,
			style('Hero Title', { 'font-size': '3rem', 'padding-left': '16px' }),
			// "Space 16" is a spacing Variable here, so a 16px font size is not its value.
			style('Caption', { 'font-size': '16px' }),
			// "Space 40" is not linked in a style, so there is no evidence of its purpose.
			style('Section', { 'padding-top': '40px' })
		]);
		expect(findings).toEqual(['Hero Title: font-size 3rem (Heading XL)', 'Hero Title: padding-left 16px (Space 16)']);
	});

	it('reads a size written with different number formats as the same value', () => {
		expect(find([...LINKED, style('Hero Title', { 'font-size': '3.0rem' })])).toEqual(['Hero Title: font-size 3.0rem (Heading XL)']);
	});

	it('does not report a zero size', () => {
		const variables: VariableData = {
			collections: [{ id: 'c', name: 'Spacing', variables: [{ id: 'variable-none', name: 'Space None', type: 'Size', value: '0px' }] }]
		};
		const styles = [style('Card', { 'margin-top': { id: 'variable-none' } }), style('Row', { 'margin-top': '0px' })];
		expect(find(styles, variables)).toEqual([]);
	});

	it('reports four equal sides as one value with the shorthand name', () => {
		const sides = (value: string) => ({
			'border-top-color': value,
			'border-right-color': value,
			'border-bottom-color': value,
			'border-left-color': value
		});
		expect(find([style('Card', { ...sides('#1a1b1f'), color: 'white' })])).toEqual([
			'Card: border-color #1a1b1f (Ink)',
			'Card: color white (White)'
		]);
		// Sides with different values, or fewer than four, stay as they are.
		expect(find([style('Card', { ...sides('#1a1b1f'), 'border-left-color': 'white' })])).toHaveLength(4);
		expect(find([style('Card', { 'border-top-color': '#1a1b1f', 'border-bottom-color': '#1a1b1f' })])).toHaveLength(2);
	});

	it('finds a font family, with or without a fallback list', () => {
		expect(
			find([style('Body Text', { 'font-family': 'Inter' }), style('Lead', { 'font-family': '"Inter", sans-serif' }), style('Code', { 'font-family': 'Menlo' })])
		).toEqual(['Body Text: font-family Inter (Body Font)', 'Lead: font-family "Inter", sans-serif (Body Font)']);
	});

	it('judges tag styles and skips library styles and element styles', () => {
		expect(
			find([
				style('All H1 Headings', { color: '#1a1b1f' }, { type: 'tag', isHtmlTag: true }),
				style('Library Card', { color: '#1a1b1f' }, { source: 'library' }),
				style('', { color: '#1a1b1f' }, { type: 'element' })
			])
		).toEqual(['All H1 Headings: color #1a1b1f (Ink)']);
	});

	it('returns nothing when the data has no variables, no properties, or an unknown shape', () => {
		expect(find([style('Hero Title', { color: '#1a1b1f' })], { collections: [] })).toEqual([]);
		expect(findStaticValuesMatchingVariables([{ id: 's', name: 'Legacy', type: 'class' }], VARIABLES)).toEqual([]);
		expect(findStaticValuesMatchingVariables([style('Odd', { color: 5, 'font-size': null })], undefined)).toEqual([]);
		const oddVariables = { collections: [{ id: 'c', name: 'Odd', variables: [{ id: 'v', name: null, type: null, value: { type: 'custom', value: 'clamp(1rem, 2vw, 3rem)' } }] }] };
		expect(find([style('Hero Title', { 'font-size': '3rem' })], oddVariables as unknown as VariableData)).toEqual([]);
	});
});

describe('styles.static-values-not-linked', () => {
	const designer = (styles: StyleData[]): DesignerData =>
		({ variables: VARIABLES, components: [], styles, pages: [], assets: [] }) as DesignerData;
	const stylesCategory = async (styles: StyleData[]) =>
		(await validateDesignerData(designer(styles))).categories.find((c) => c.category === 'Styles')!;

	it('is a warning with the list of values, and does not block', async () => {
		const category = await stylesCategory([
			style('Heading Text', { color: '#1a1b1f', 'background-color': 'white' }),
			style('Body Text', { 'font-family': 'Inter' })
		]);
		const issue = category.issues.find((i) => i.id === 'styles.static-values-not-linked');
		expect(issue?.severity).toBe('warning');
		expect(issue?.message).toBe('3 static value(s) in 2 style(s) match a Variable but are not linked to it.');
		expect(issue?.details).toEqual({
			count: 3,
			locations: [
				'Heading Text: color #1a1b1f (Variable "Ink")',
				'Heading Text: background-color white (Variable "White")',
				'Body Text: font-family Inter (Variable "Body Font")'
			]
		});
		expect(category.passed).toBe(true);
	});

	it('lists at most 10 values and counts all of them', async () => {
		const styles = Array.from({ length: 14 }, (_, index) => style(`Heading Text ${index}`, { color: '#1a1b1f' }));
		const issue = (await stylesCategory(styles)).issues.find((i) => i.id === 'styles.static-values-not-linked');
		expect(issue?.details?.count).toBe(14);
		expect(issue?.details?.locations).toHaveLength(10);
	});

	it('gives no finding when each value is linked', async () => {
		const category = await stylesCategory([style('Heading Text', { color: { id: 'variable-ink' } })]);
		expect(category.issues.find((i) => i.id === 'styles.static-values-not-linked')).toBeUndefined();
	});
});
