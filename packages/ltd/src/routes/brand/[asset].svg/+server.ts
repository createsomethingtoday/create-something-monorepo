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

	// Wordmark white (for dark backgrounds)
	'wordmark-white': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 40">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&amp;display=swap');
    .wordmark { font-family: 'Stack Sans Notch', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  </style>
  <text x="0" y="32" class="wordmark" fill="#FFFFFF" font-size="32">CREATE SOMETHING</text>
</svg>`,

	// Wordmark black (for light backgrounds)
	'wordmark-black': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 40">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&amp;display=swap');
    .wordmark { font-family: 'Stack Sans Notch', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  </style>
  <text x="0" y="32" class="wordmark" fill="#000000" font-size="32">CREATE SOMETHING</text>
</svg>`,

	// Horizontal lockup light (for dark backgrounds)
	'lockup-horizontal-light': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 48">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&amp;display=swap');
    .wordmark { font-family: 'Stack Sans Notch', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  </style>
  <g transform="translate(0, 8) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="44" y="34" class="wordmark" fill="#FFFFFF" font-size="28">CREATE SOMETHING</text>
</svg>`,

	// Horizontal lockup dark (for light backgrounds)
	'lockup-horizontal-dark': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 48">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&amp;display=swap');
    .wordmark { font-family: 'Stack Sans Notch', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  </style>
  <g transform="translate(0, 8) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#000000" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#000000" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#000000" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="44" y="34" class="wordmark" fill="#000000" font-size="28">CREATE SOMETHING</text>
</svg>`,

	// Stacked lockup light (for dark backgrounds)
	'lockup-stacked-light': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&amp;display=swap');
    .wordmark { font-family: 'Stack Sans Notch', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  </style>
  <g transform="translate(84, 8) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#FFFFFF" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="100" y="60" class="wordmark" fill="#FFFFFF" font-size="16" text-anchor="middle">CREATE</text>
  <text x="100" y="80" class="wordmark" fill="#FFFFFF" font-size="16" text-anchor="middle">SOMETHING</text>
</svg>`,

	// Stacked lockup dark (for light backgrounds)
	'lockup-stacked-dark': () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&amp;display=swap');
    .wordmark { font-family: 'Stack Sans Notch', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
  </style>
  <g transform="translate(84, 8) scale(1)">
    <path d="${CUBE_PATHS.top}" fill="#000000" fill-opacity="${CUBE_OPACITY.top}"/>
    <path d="${CUBE_PATHS.left}" fill="#000000" fill-opacity="${CUBE_OPACITY.left}"/>
    <path d="${CUBE_PATHS.right}" fill="#000000" fill-opacity="${CUBE_OPACITY.right}"/>
  </g>
  <text x="100" y="60" class="wordmark" fill="#000000" font-size="16" text-anchor="middle">CREATE</text>
  <text x="100" y="80" class="wordmark" fill="#000000" font-size="16" text-anchor="middle">SOMETHING</text>
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
