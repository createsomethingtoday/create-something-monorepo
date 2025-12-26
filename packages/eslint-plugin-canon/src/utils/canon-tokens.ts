/**
 * Canon token loader
 *
 * Loads and parses canon.json to provide machine-readable Canon tokens.
 * Single source of truth: packages/components/src/lib/styles/canon.json
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface CanonToken {
	value: string;
	description?: string;
	px?: number;
	ratio?: string;
}

interface CanonSpec {
	colors: {
		bg: Record<string, CanonToken>;
		fg: Record<string, CanonToken>;
		border: Record<string, CanonToken>;
		semantic: Record<string, any>;
		data: Record<string, any>;
		interactive: Record<string, CanonToken>;
		overlay: Record<string, CanonToken>;
		rank: Record<string, any>;
	};
	typography: {
		scale: {
			display: Record<string, CanonToken>;
			headings: Record<string, CanonToken>;
			body: Record<string, CanonToken>;
			utility: Record<string, CanonToken>;
		};
	};
	spacing: {
		values: Record<string, CanonToken>;
	};
	radius: Record<string, CanonToken>;
	shadows: {
		elevation: Record<string, CanonToken>;
		glow: Record<string, CanonToken>;
		inner: Record<string, CanonToken>;
	};
	motion: {
		duration: Record<string, any>;
		easing: Record<string, any>;
	};
}

let cachedCanon: CanonSpec | null = null;

/**
 * Load canon.json from components package
 */
export function loadCanon(): CanonSpec {
	if (cachedCanon) {
		return cachedCanon;
	}

	try {
		// Resolve path to canon.json
		// From: packages/eslint-plugin-canon/dist/utils/canon-tokens.js (after build)
		// To: packages/components/src/lib/styles/canon.json
		const __dirname = dirname(fileURLToPath(import.meta.url));

		// Try multiple path resolutions to handle different execution contexts
		const possiblePaths = [
			// From dist/utils/canon-tokens.js → ../../../../components/src/lib/styles/canon.json
			join(__dirname, '../../../../components/src/lib/styles/canon.json'),
			// From src/utils/canon-tokens.ts → ../../../components/src/lib/styles/canon.json
			join(__dirname, '../../../components/src/lib/styles/canon.json'),
			// Absolute fallback (monorepo root detection)
			join(__dirname, '../../../..', 'components/src/lib/styles/canon.json')
		];

		let canonJson: string | null = null;
		let usedPath: string | null = null;

		for (const path of possiblePaths) {
			try {
				canonJson = readFileSync(path, 'utf-8');
				usedPath = path;
				break;
			} catch {
				continue;
			}
		}

		if (!canonJson) {
			throw new Error(
				`Failed to load canon.json from any of:\n${possiblePaths.join('\n')}\n\n` +
				`Current __dirname: ${__dirname}`
			);
		}

		cachedCanon = JSON.parse(canonJson) as CanonSpec;
		return cachedCanon;
	} catch (err) {
		if (err instanceof Error && err.message.includes('Failed to load canon.json')) {
			throw err;
		}
		throw new Error(
			`Failed to load canon.json. Ensure packages/components/src/lib/styles/canon.json exists.\n${err}`
		);
	}
}

/**
 * Get Canon CSS variable name for a category and key
 * Examples:
 * - category='color', subcategory='bg', key='pure' → '--color-bg-pure'
 * - category='radius', key='lg' → '--radius-lg'
 */
export function getCanonVariable(
	category: string,
	subcategory?: string,
	key?: string
): string {
	const parts = ['--', category];
	if (subcategory) parts.push(subcategory);
	if (key) parts.push(key);
	return parts.join('-');
}

/**
 * Get Canon token value for a given CSS variable
 */
export function getCanonValue(cssVar: string): string | null {
	const canon = loadCanon();
	const parts = cssVar.replace(/^--/, '').split('-');

	// Example: --color-bg-pure → ['color', 'bg', 'pure']
	if (parts.length < 2) return null;

	const [category, ...rest] = parts;

	try {
		switch (category) {
			case 'color': {
				const [subcategory, key] = rest;
				const colorGroup = (canon.colors as any)[subcategory];
				if (!colorGroup) return null;
				const token = colorGroup[key];
				return token?.value || null;
			}
			case 'text': {
				const key = rest.join('-'); // Handle 'body-sm', 'h1', etc.
				// Check body first
				if ((canon.typography.scale.body as any)[key]) {
					return (canon.typography.scale.body as any)[key].value;
				}
				// Check headings
				if ((canon.typography.scale.headings as any)[key]) {
					return (canon.typography.scale.headings as any)[key].value;
				}
				// Check utility
				if ((canon.typography.scale.utility as any)[key]) {
					return (canon.typography.scale.utility as any)[key].value;
				}
				return null;
			}
			case 'space': {
				const key = rest.join('-');
				return canon.spacing.values[key]?.value || null;
			}
			case 'radius': {
				const key = rest.join('-');
				return canon.radius[key]?.value || null;
			}
			case 'shadow': {
				const key = rest.join('-');
				// Check elevation
				if (canon.shadows.elevation[key]) {
					return canon.shadows.elevation[key].value;
				}
				// Check glow
				if (canon.shadows.glow[key]) {
					return canon.shadows.glow[key].value;
				}
				// Check inner
				if (canon.shadows.inner[key]) {
					return canon.shadows.inner[key].value;
				}
				return null;
			}
			case 'duration': {
				const key = rest.join('-');
				return canon.motion.duration[key]?.value || null;
			}
			case 'ease': {
				const key = rest.join('-');
				return canon.motion.easing[key]?.value || null;
			}
			default:
				return null;
		}
	} catch {
		return null;
	}
}
