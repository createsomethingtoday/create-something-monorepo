/**
 * Public naming policy for CREATE SOMETHING Performance tokens.
 *
 * Canon's compatibility layer may still expose legacy names, but first-party
 * Canon and property consumers use the Performance names returned here.
 */

const LEGACY_CLEAR_ALIASES: Readonly<Record<string, string>> = {
	'--color-clear-porcelain': '--color-performance-paper',
	'--color-clear-porcelain-soft': '--color-performance-court',
	'--color-clear-panel': '--color-performance-panel',
	'--color-clear-onyx': '--color-performance-ink',
	'--color-clear-chocolate': '--color-performance-pressure',
	'--color-clear-grey': '--color-performance-muted',
	'--color-clear-grey-quiet': '--color-performance-muted',
	'--color-clear-border': '--color-performance-line',
	'--color-clear-border-strong': '--color-performance-line-strong',
	'--color-clear-moss': '--color-performance-growth',
	'--color-clear-fern': '--color-performance-growth',
	'--color-clear-link-green': '--color-performance-growth',
	'--color-clear-ocean': '--color-performance-signal',
	'--color-clear-pastel-blue': '--color-performance-signal-soft',
	'--color-clear-frosted-mint': '--color-performance-growth-soft',
	'--color-clear-candy-purple': '--color-performance-pressure-soft',
	'--color-clear-pistachio': '--color-performance-growth-soft',
	'--color-clear-pill-active': '--color-performance-signal-soft',
	'--color-clear-stop': '--color-performance-risk',
	'--content-width-clear': '--content-width-performance',
	'--radius-clear-sm': '--radius-performance-sm',
	'--radius-clear-md': '--radius-performance-md',
	'--shadow-clear-restraint': '--shadow-performance-panel'
};

const STANDARD_FAMILIES = [
	'color',
	'font',
	'text',
	'leading',
	'tracking',
	'space',
	'duration',
	'ease',
	'breakpoint',
	'container',
	'z',
	'opacity',
	'scale',
	'width',
	'cascade'
] as const;

export function isPerformanceToken(name: string): boolean {
	return (
		/^--(?:color|font|text|leading|tracking|space|radius|shadow|duration|ease|distance|container|breakpoint|z|opacity|scale|width|height|cascade|glass|liquid-glass|content-width)-performance(?:-|$)/.test(
			name
		)
	);
}

export function toPerformanceTokenName(name: string): string | null {
	if (isPerformanceToken(name)) return name;
	if (LEGACY_CLEAR_ALIASES[name]) return LEGACY_CLEAR_ALIASES[name];

	if (name.startsWith('--radius-')) {
		return `--radius-performance-scale-${name.slice('--radius-'.length)}`;
	}
	if (name.startsWith('--shadow-')) {
		return `--shadow-performance-scale-${name.slice('--shadow-'.length)}`;
	}
	if (name.startsWith('--glass-')) {
		return `--glass-performance-${name.slice('--glass-'.length)}`;
	}
	if (name.startsWith('--liquid-glass-')) {
		return `--liquid-glass-performance-${name.slice('--liquid-glass-'.length)}`;
	}
	if (name.startsWith('--content-width-')) {
		return `--content-width-performance-${name.slice('--content-width-'.length)}`;
	}
	if (name === '--view-transition-duration') return '--duration-performance-view-transition';
	if (name === '--header-height') return '--height-performance-header';

	for (const family of STANDARD_FAMILIES) {
		const prefix = `--${family}-`;
		if (name.startsWith(prefix)) {
			return `--${family}-performance-${name.slice(prefix.length)}`;
		}
	}

	return null;
}

export function isComponentLocalToken(name: string): boolean {
	return toPerformanceTokenName(name) === null;
}

export const legacyClearAliases = LEGACY_CLEAR_ALIASES;
