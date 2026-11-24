/**
 * Static values that match a Variable (guideline design-systems-14).
 *
 * Reviewers often write "some static values are not turned into Variables or
 * linked properly", and the creator cannot tell which values. This finds the
 * values with a clear answer: a static value in a style that is equal to the
 * value of a Variable in the same site.
 *
 * A color or a font family matches any Variable of that type. A size is
 * different: "16px" can be a font size or a space, and a Size Variable does
 * not say which. So a size matches only a Variable that another style links
 * to the same kind of property (font size, spacing, or corner radius).
 *
 * Only the base breakpoint is read, because the extension and the CLI send
 * the full property map for the base breakpoint only. The result is a list
 * for the creator and not a measure of the template, so the caller reports it
 * as a warning.
 */

import type { StyleData, VariableData } from '../types';

export interface StaticValueFinding {
	style: string;
	property: string;
	value: string;
	variable: string;
}

type SizeKind = 'font-size' | 'spacing' | 'radius';
type Kind = 'color' | 'font-family' | SizeKind;

const SIDES = ['top', 'right', 'bottom', 'left'];
const PROPERTY_KINDS: Record<string, Kind> = {
	color: 'color',
	'background-color': 'color',
	'border-color': 'color',
	'outline-color': 'color',
	'text-decoration-color': 'color',
	'-webkit-text-stroke-color': 'color',
	'font-family': 'font-family',
	'font-size': 'font-size',
	'grid-column-gap': 'spacing',
	'grid-row-gap': 'spacing',
	'column-gap': 'spacing',
	'row-gap': 'spacing',
	'border-top-left-radius': 'radius',
	'border-top-right-radius': 'radius',
	'border-bottom-left-radius': 'radius',
	'border-bottom-right-radius': 'radius'
};
for (const side of SIDES) {
	PROPERTY_KINDS[`border-${side}-color`] = 'color';
	PROPERTY_KINDS[`margin-${side}`] = 'spacing';
	PROPERTY_KINDS[`padding-${side}`] = 'spacing';
}

type Rgba = [number, number, number, number];

const NAMED_COLORS: Record<string, Rgba> = {
	white: [255, 255, 255, 1],
	black: [0, 0, 0, 1],
	transparent: [0, 0, 0, 0]
};

function alpha(value: string | undefined): number | null {
	if (value === undefined) return 1;
	const number = Number.parseFloat(value);
	if (!Number.isFinite(number)) return null;
	return value.endsWith('%') ? number / 100 : number;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const hue = (((h % 360) + 360) % 360) / 60;
	const x = chroma * (1 - Math.abs((hue % 2) - 1));
	const [r, g, b] =
		hue < 1 ? [chroma, x, 0] : hue < 2 ? [x, chroma, 0] : hue < 3 ? [0, chroma, x] : hue < 4 ? [0, x, chroma] : hue < 5 ? [x, 0, chroma] : [chroma, 0, x];
	const m = l - chroma / 2;
	return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** A color the Designer writes as hex, rgb(), hsl() or a basic name. Other names give `null`. */
function parseColor(input: unknown): Rgba | null {
	if (typeof input !== 'string') return null;
	const value = input.trim().toLowerCase();
	if (value in NAMED_COLORS) return NAMED_COLORS[value];

	const hex = /^#([0-9a-f]{3,8})$/.exec(value)?.[1];
	if (hex && [3, 4, 6, 8].includes(hex.length)) {
		const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
		const channel = (index: number) => Number.parseInt(full.slice(index, index + 2), 16);
		return [channel(0), channel(2), channel(4), full.length === 8 ? channel(6) / 255 : 1];
	}

	const call = /^(rgb|hsl)a?\(([^)]+)\)$/.exec(value);
	if (!call) return null;
	const parts = call[2].split(/[\s,/]+/).filter(Boolean);
	if (parts.length < 3 || parts.length > 4) return null;
	const numbers = parts.slice(0, 3).map((part) => Number.parseFloat(part));
	const a = alpha(parts[3]);
	if (numbers.some((number) => !Number.isFinite(number)) || a === null) return null;
	if (call[1] === 'rgb') return [numbers[0], numbers[1], numbers[2], a];
	return [...hslToRgb(numbers[0], numbers[1] / 100, numbers[2] / 100), a];
}

/** hsl() values are rounded when they are written, so one step of difference is the same color. */
function sameColor(a: Rgba, b: Rgba): boolean {
	return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && Math.abs(a[2] - b[2]) <= 1 && Math.abs(a[3] - b[3]) <= 0.01;
}

/** "16px" for the string "16.0px" and for the Designer's `{ unit, value }`. Zero and custom values give `null`. */
function sizeKey(value: unknown): string | null {
	let amount: number;
	let unit: unknown;
	if (typeof value === 'string') {
		const match = /^(-?\d*\.?\d+)([a-z%]+)$/i.exec(value.trim());
		if (!match) return null;
		amount = Number(match[1]);
		unit = match[2];
	} else if (value && typeof value === 'object') {
		amount = (value as { value?: unknown }).value as number;
		unit = (value as { unit?: unknown }).unit;
	} else {
		return null;
	}
	if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0 || typeof unit !== 'string') return null;
	return `${amount}${unit.toLowerCase()}`;
}

/** The first family in a font-family value, without quotes. */
function familyKey(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const first = value.split(',')[0].trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
	return first || null;
}

function variableId(value: unknown): string | null {
	const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : null;
	return typeof id === 'string' ? id : null;
}

function isJudged(style: StyleData): boolean {
	return style.source !== 'library' && style.type !== 'element' && !!style.properties && typeof style.properties === 'object';
}

/**
 * The static values in site styles that are equal to the value of a Variable.
 * The list is in style order. Library styles and element styles are not judged.
 */
export function findStaticValuesMatchingVariables(styles: StyleData[], variables: VariableData | undefined): StaticValueFinding[] {
	const all = (variables?.collections ?? []).flatMap((collection) => (Array.isArray(collection?.variables) ? collection.variables : []));
	if (all.length === 0 || !Array.isArray(styles)) return [];

	const byId = new Map(all.filter((variable) => typeof variable?.id === 'string').map((variable) => [variable.id, variable]));
	/** The value of a Variable, through at most five aliases. */
	const resolve = (value: unknown, depth = 0): unknown => {
		const id = variableId(value);
		if (id === null || depth > 5) return id === null ? value : null;
		return resolve(byId.get(id)?.value ?? null, depth + 1);
	};

	const colors: Array<{ name: string; rgba: Rgba }> = [];
	const families = new Map<string, string>();
	const sizes = new Map<string, { name: string; key: string }>();
	for (const variable of all) {
		const type = String(variable?.type ?? '').toLowerCase().replace(/[^a-z]/g, '');
		const name = variable?.name || variable?.id;
		if (!name) continue;
		const value = resolve(variable.value);
		if (type === 'color') {
			const rgba = parseColor(value);
			if (rgba && rgba[3] > 0) colors.push({ name, rgba });
		} else if (type === 'fontfamily') {
			const key = familyKey(value);
			if (key && !families.has(key)) families.set(key, name);
		} else if (type === 'size') {
			const key = sizeKey(value);
			if (key && typeof variable.id === 'string') sizes.set(variable.id, { name, key });
		}
	}

	const judged = styles.filter(isJudged);

	// A Size Variable is a candidate for a kind of property only when a style links it there.
	const linkedSizes: Record<SizeKind, Map<string, string>> = { 'font-size': new Map(), spacing: new Map(), radius: new Map() };
	for (const style of judged) {
		for (const [property, value] of Object.entries(style.properties!)) {
			const kind = PROPERTY_KINDS[property];
			const size = sizes.get(variableId(value) ?? '');
			if (!size || !kind || kind === 'color' || kind === 'font-family') continue;
			if (!linkedSizes[kind].has(size.key)) linkedSizes[kind].set(size.key, size.name);
		}
	}

	const match = (kind: Kind, value: string): string | undefined => {
		if (kind === 'color') {
			const rgba = parseColor(value);
			return rgba && rgba[3] > 0 ? colors.find((color) => sameColor(color.rgba, rgba))?.name : undefined;
		}
		if (kind === 'font-family') return families.get(familyKey(value) ?? '');
		return linkedSizes[kind].get(sizeKey(value) ?? '');
	};

	const findings: StaticValueFinding[] = [];
	for (const style of judged) {
		const found: StaticValueFinding[] = [];
		for (const [property, value] of Object.entries(style.properties!)) {
			const kind = PROPERTY_KINDS[property];
			if (!kind || typeof value !== 'string') continue;
			const variable = match(kind, value);
			if (variable) found.push({ style: style.name || style.id, property, value, variable });
		}
		findings.push(...mergeSides(found));
	}
	return findings;
}

/** The Designer sets four sides in one step, so four equal sides are one finding with the shorthand name. */
const SHORTHANDS: Record<string, string[]> = {
	'border-color': SIDES.map((side) => `border-${side}-color`),
	margin: SIDES.map((side) => `margin-${side}`),
	padding: SIDES.map((side) => `padding-${side}`),
	'border-radius': ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => `border-${corner}-radius`)
};

function mergeSides(found: StaticValueFinding[]): StaticValueFinding[] {
	let merged = found;
	for (const [shorthand, sides] of Object.entries(SHORTHANDS)) {
		const members = merged.filter((finding) => sides.includes(finding.property));
		const first = members[0];
		if (members.length !== sides.length || members.some((finding) => finding.value !== first.value || finding.variable !== first.variable)) continue;
		merged = merged.flatMap((finding) => (finding === first ? [{ ...first, property: shorthand }] : members.includes(finding) ? [] : [finding]));
	}
	return merged;
}
