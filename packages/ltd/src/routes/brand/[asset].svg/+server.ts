import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The supplied offset-ring mark is the canonical CREATE SOMETHING identity.
// Keep the compact geometry in one generator so every public download matches
// browser, web-clip, social, and Organization assets.
function ringMark(color: string, transform: string): string {
	return `<g transform="${transform}" fill="none" stroke="${color}" stroke-width="8.5">
    <circle cx="53" cy="50" r="41.5"/>
    <circle cx="43.5" cy="50" r="31.5"/>
  </g>`;
}

const WORDMARK_DEFS = `<defs>
    <style>
      .wm { font-family: Arial, Helvetica, sans-serif; font-weight: 700; letter-spacing: 0; }
    </style>
  </defs>`;

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
  ${ringMark('#FFFFFF', 'translate(56 56) scale(4)')}
</svg>`,

	// Icon circular (512x512)
	'icon-circular': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="#000000"/>
  ${ringMark('#FFFFFF', 'translate(56 56) scale(4)')}
</svg>`,

	// Icon only (transparent background)
	'icon-only': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  ${ringMark('#FFFFFF', 'translate(3.5 3.5) scale(.25)')}
</svg>`,

	// Wordmark white (for dark backgrounds) - local/system font stack
	'wordmark-white': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 32">
  ${WORDMARK_DEFS}
  <text x="0" y="24" class="wm" fill="#FFFFFF" font-size="26">CREATE SOMETHING</text>
</svg>`,

	// Wordmark black (for light backgrounds)
	'wordmark-black': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 32">
  ${WORDMARK_DEFS}
  <text x="0" y="24" class="wm" fill="#000000" font-size="26">CREATE SOMETHING</text>
</svg>`,

	// Horizontal lockup light (for dark backgrounds)
	'lockup-horizontal-light': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 40">
  ${WORDMARK_DEFS}
  ${ringMark('#FFFFFF', 'translate(4 4) scale(.25)')}
  <text x="44" y="28" class="wm" fill="#FFFFFF" font-size="22">CREATE SOMETHING</text>
</svg>`,

	// Horizontal lockup dark (for light backgrounds)
	'lockup-horizontal-dark': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 40">
  ${WORDMARK_DEFS}
  ${ringMark('#000000', 'translate(4 4) scale(.25)')}
  <text x="44" y="28" class="wm" fill="#000000" font-size="22">CREATE SOMETHING</text>
</svg>`,

	// Stacked lockup light (for dark backgrounds)
	'lockup-stacked-light': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
  ${WORDMARK_DEFS}
  ${ringMark('#FFFFFF', 'translate(64 4) scale(.25)')}
  <text x="80" y="55" class="wm" fill="#FFFFFF" font-size="16" text-anchor="middle">CREATE</text>
  <text x="80" y="75" class="wm" fill="#FFFFFF" font-size="16" text-anchor="middle">SOMETHING</text>
</svg>`,

	// Stacked lockup dark (for light backgrounds)
	'lockup-stacked-dark': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
  ${WORDMARK_DEFS}
  ${ringMark('#000000', 'translate(64 4) scale(.25)')}
  <text x="80" y="55" class="wm" fill="#000000" font-size="16" text-anchor="middle">CREATE</text>
  <text x="80" y="75" class="wm" fill="#000000" font-size="16" text-anchor="middle">SOMETHING</text>
</svg>`
};

export const GET: RequestHandler = async ({ params, url }) => {
	const assetName = params.asset;
	const isDownload = url.searchParams.get('download') === '1';

	if (!assetName || !assets[assetName]) {
		throw error(404, 'Asset not found');
	}

	const svg = assets[assetName]({});

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Content-Disposition': isDownload ? `attachment; filename="${assetName}.svg"` : 'inline',
			'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
