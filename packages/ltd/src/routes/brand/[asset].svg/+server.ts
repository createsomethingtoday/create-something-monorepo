import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The isometric cube paths (from favicon.svg)
const CUBE_PATHS = {
	top: 'M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z',
	left: 'M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z',
	right: 'M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z'
};

// Canon face opacity values
const CUBE_OPACITY = {
	top: 1.0,
	left: 0.6,
	right: 0.3
};

// Wordmark as paths - "CREATE SOMETHING" in geometric sans-serif
// Each letter is defined at a base size, then scaled/positioned
const WORDMARK_PATHS = {
	// "CREATE SOMETHING" full wordmark path (traced from geometric sans-serif)
	full: `M0 8.5h3.2v2.4H2.4v4.8h.8v2.4H0v-2.4h.8V10.9H0V8.5zm6.4 0h3.2v2.4h-.8v1.6h.8v1.6h-.8v1.6h.8v2.4H6.4v-2.4h.8v-1.6h-.8v-1.6h.8v-1.6h-.8V8.5zm6.4 0h3.2v2.4h-.8v4.8h.8v2.4h-3.2v-2.4h.8V10.9h-.8V8.5zm6.4 0h4v2.4h-1.2v4.8h1.2v2.4h-4v-2.4h.8V10.9h-.8V8.5zm7.2 0h3.2v2.4h-.8v4.8h.8v2.4h-1.6v-3.2h-.8v3.2h-1.6v-2.4h.8V10.9h-.8V8.5zm6.4 0h4v2.4h-2.4v1.6h1.6v2.4h-1.6v1.6h2.4v2.4h-4V8.5zm9.6 0h4v2.4h-2.4v1.6h1.6v1.6h-1.6v4h-1.6V8.5zm7.2 0h4v2.4h-.8v7.2h-.8v-2.4h-1.6v2.4h-.8V8.5zm6.4 0h3.2v9.6h-.8v-7.2h-.8v7.2h-.8v-7.2h-.8v7.2h-.8V8.5zm6.4 0h3.2v2.4h-.8v4.8h.8v2.4h-3.2v-2.4h.8V10.9h-.8V8.5zm6.4 0h4v2.4h-2.4v7.2h-1.6V8.5zm6.4 0h3.2v9.6h-1.6v-3.2h-.8v3.2h-1.6v-2.4h.8V10.9h-.8V8.5zm6.4 0h1.6v9.6h-1.6V8.5zm4 0h3.2v9.6h-.8v-7.2h-.8v7.2h-.8V8.5zm6.4 0h4v2.4h-1.2v7.2h-1.6v-7.2h-1.2V8.5z`,
	// Individual letters for flexible composition
	C: 'M0 0h3.2v2.4H2.4v4.8h.8v2.4H0v-2.4h.8V2.4H0V0z',
	R: 'M0 0h3.2v2.4h-.8v1.6h.8v1.6h-.8v1.6h.8v2.4H0v-2.4h.8V5.6H0V4h.8V2.4H0V0z',
	E: 'M0 0h3.2v2.4h-.8v1.6h.8v1.6h-.8v1.6h.8v2.4H0V0z',
	A: 'M0 0h3.2v2.4h-.8v4.8h.8v2.4H0v-2.4h.8V5.6H0V4h.8V2.4H0V0z',
	T: 'M0 0h4v2.4H2.8v7.2H1.2V2.4H0V0z',
	S: 'M0 0h3.2v2.4H2.4v1.6h.8v1.6h-.8v1.6h.8v2.4H0v-2.4h.8V5.6H0V4h.8V2.4H0V0z',
	O: 'M0 0h3.2v9.6H0V0zm.8 2.4v4.8h1.6V2.4H.8z',
	M: 'M0 0h3.2v9.6H2.4V2.4h-.8v7.2H.8V2.4H0V0z',
	H: 'M0 0h1.2v4h.8V0h1.2v9.6H2v-4h-.8v4H0V0z',
	I: 'M0 0h1.6v9.6H0V0z',
	N: 'M0 0h3.2v9.6H2.4l-.8-4.8v4.8H.8V4.8L0 0z',
	G: 'M0 0h3.2v2.4H2.4v4.8h.8v-2.4h-1V2.8h1.6v6.8H0V0z'
};

// Generate wordmark group with proper letter spacing
function generateWordmark(text: string, fill: string, fontSize: number = 18): string {
	const letterSpacing = fontSize * 0.85; // Tight tracking
	const spaceWidth = fontSize * 0.4;
	let x = 0;
	let paths = '';

	for (const char of text) {
		if (char === ' ') {
			x += spaceWidth;
			continue;
		}

		const letterPath = WORDMARK_PATHS[char as keyof typeof WORDMARK_PATHS];
		if (letterPath && char !== 'full') {
			const scale = fontSize / 9.6; // Base letter height is 9.6
			paths += `<path d="${letterPath}" fill="${fill}" transform="translate(${x}, 0) scale(${scale})"/>`;
			x += letterSpacing;
		}
	}

	return paths;
}

// SVG generators for each asset type
const assets: Record<string, (params: { light?: boolean }) => string> = {
	// Icon with background (512x512)
	'icon-with-bg': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000" rx="64"/>
  <g transform="translate(128, 128) scale(8)">
    <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
</svg>`,

	// Icon circular (512x512)
	'icon-circular': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="#000000"/>
  <g transform="translate(128, 128) scale(8)">
    <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
</svg>`,

	// Icon only (transparent background)
	'icon-only': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
  <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
  <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
</svg>`,

	// Wordmark white (for dark backgrounds) - text with embedded font
	'wordmark-white': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 32">
  <defs>
    <style>
      @font-face {
        font-family: 'Wordmark';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2') format('woff2');
        font-weight: 600;
      }
      .wm { font-family: 'Wordmark', 'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    </style>
  </defs>
  <text x="0" y="24" class="wm" fill="#FFFFFF" font-size="26">CREATE SOMETHING</text>
</svg>`,

	// Wordmark black (for light backgrounds)
	'wordmark-black': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 32">
  <defs>
    <style>
      @font-face {
        font-family: 'Wordmark';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2') format('woff2');
        font-weight: 600;
      }
      .wm { font-family: 'Wordmark', 'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    </style>
  </defs>
  <text x="0" y="24" class="wm" fill="#000000" font-size="26">CREATE SOMETHING</text>
</svg>`,

	// Horizontal lockup light (for dark backgrounds)
	'lockup-horizontal-light': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 40">
  <defs>
    <style>
      @font-face {
        font-family: 'Wordmark';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2') format('woff2');
        font-weight: 600;
      }
      .wm { font-family: 'Wordmark', 'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    </style>
  </defs>
  <g transform="translate(4, 4) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="44" y="28" class="wm" fill="#FFFFFF" font-size="22">CREATE SOMETHING</text>
</svg>`,

	// Horizontal lockup dark (for light backgrounds)
	'lockup-horizontal-dark': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 40">
  <defs>
    <style>
      @font-face {
        font-family: 'Wordmark';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2') format('woff2');
        font-weight: 600;
      }
      .wm { font-family: 'Wordmark', 'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    </style>
  </defs>
  <g transform="translate(4, 4) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#000000" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#000000" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#000000" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="44" y="28" class="wm" fill="#000000" font-size="22">CREATE SOMETHING</text>
</svg>`,

	// Stacked lockup light (for dark backgrounds)
	'lockup-stacked-light': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
  <defs>
    <style>
      @font-face {
        font-family: 'Wordmark';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2') format('woff2');
        font-weight: 600;
      }
      .wm { font-family: 'Wordmark', 'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    </style>
  </defs>
  <g transform="translate(64, 4) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="80" y="55" class="wm" fill="#FFFFFF" font-size="16" text-anchor="middle">CREATE</text>
  <text x="80" y="75" class="wm" fill="#FFFFFF" font-size="16" text-anchor="middle">SOMETHING</text>
</svg>`,

	// Stacked lockup dark (for light backgrounds)
	'lockup-stacked-dark': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
  <defs>
    <style>
      @font-face {
        font-family: 'Wordmark';
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2') format('woff2');
        font-weight: 600;
      }
      .wm { font-family: 'Wordmark', 'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    </style>
  </defs>
  <g transform="translate(64, 4) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#000000" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#000000" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#000000" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="80" y="55" class="wm" fill="#000000" font-size="16" text-anchor="middle">CREATE</text>
  <text x="80" y="75" class="wm" fill="#000000" font-size="16" text-anchor="middle">SOMETHING</text>
</svg>`
};

export const GET: RequestHandler = async ({ params }) => {
	const assetName = params.asset;

	if (!assetName || !assets[assetName]) {
		throw error(404, 'Asset not found');
	}

	const svg = assets[assetName]({});

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
