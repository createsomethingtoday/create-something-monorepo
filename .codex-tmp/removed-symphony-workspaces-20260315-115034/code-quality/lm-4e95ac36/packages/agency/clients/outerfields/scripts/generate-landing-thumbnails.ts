#!/usr/bin/env npx tsx
/**
 * OUTERFIELDS Landing Page Video Thumbnail Generator (Gemini / Imagen)
 *
 * Goal: generate 16:9 JPG thumbnails for the marketing landing page videos
 * (used by `src/lib/components/FeaturedVideos.svelte`) so they can be uploaded to R2.
 *
 * Usage:
 *   cd packages/agency/clients/outerfields
 *   GEMINI_API_KEY="..." npx tsx scripts/generate-landing-thumbnails.ts
 *
 * Options:
 *   --force                 Regenerate even if file exists
 *   --only <slug>           Only generate a single thumbnail (e.g. "weatherford-promo")
 *   --out <dir>             Output directory (default: ./assets/thumbnails)
 *
 * Notes:
 * - Uses Imagen 3 generation endpoint first (16:9, JPEG)
 * - Falls back to Gemini image generation if Imagen is unavailable
 */
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

type ThumbnailSpec = {
	slug: string;
	filename: string;
	prompt: string;
};

const DEFAULT_OUT_DIR = join(process.cwd(), 'assets', 'thumbnails');

function readArg(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	if (idx === -1) return undefined;
	return process.argv[idx + 1];
}

const FORCE = process.argv.includes('--force');
const ONLY = readArg('--only');
const OUT_DIR = readArg('--out') ? join(process.cwd(), readArg('--out')!) : DEFAULT_OUT_DIR;

function getGeminiKey(): string {
	const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
	if (!key) {
		throw new Error(
			'Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Set it in your environment before running this script.'
		);
	}
	return key;
}

const GLOBAL_STYLE = `Professional marketing thumbnail, cinematic documentary still frame,
sharp focus, high contrast, natural lighting, no text, no logos, no watermarks,
no subtitles, no UI overlays, clean composition, 16:9 aspect ratio`;

const THUMBNAILS: ThumbnailSpec[] = [
	{
		slug: 'weatherford-promo',
		filename: 'weatherford-promo.jpg',
		prompt: `${GLOBAL_STYLE}. Texas small-town promo scene: charming main street in Weatherford, Texas,
warm golden hour light, historic storefronts, friendly community atmosphere, cinematic color grading,
wide establishing shot suitable as a video thumbnail.`
	},
	{
		slug: 'texas-state-fair',
		filename: 'texas-state-fair.jpg',
		prompt: `${GLOBAL_STYLE}. Texas State Fair scene at dusk: iconic neon lights, Ferris wheel in background,
crowd atmosphere, vibrant but tasteful colors, cinematic wide shot, festive energy without any readable signage.`
	},
	{
		slug: 'gotv-uscca',
		filename: 'gotv-uscca.jpg',
		prompt: `${GLOBAL_STYLE}. Podcast interview setup: two people in a modern studio with microphones,
soft key lighting, shallow depth of field, professional documentary look, subtle tech aesthetic,
no readable branding on microphones or walls.`
	},
	{
		slug: 'hilti-anchors',
		filename: 'hilti-anchors.jpg',
		prompt: `${GLOBAL_STYLE}. Product showcase: close-up macro of industrial anchors and fasteners on a clean workbench,
dramatic side lighting, premium product photography, workshop background softly blurred,
no logos or brand marks visible.`
	},
	{
		slug: 'staccato-promo',
		filename: 'staccato-promo.jpg',
		prompt: `${GLOBAL_STYLE}. Outdoor range promo scene: cinematic action shot of a professional shooter at a modern training range,
backlit dust particles, crisp detail, safety-forward presentation, no visible brand logos or readable signage.`
	},
	{
		slug: 'uscca-expo-promo',
		filename: 'uscca-expo-promo.jpg',
		prompt: `${GLOBAL_STYLE}. Expo promo scene: speaker on stage at a large conference with audience silhouettes,
dramatic stage lighting, shallow depth of field, energetic but clean composition,
no readable banners or logos.`
	}
];

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithImagen3(prompt: string, apiKey: string): Promise<Buffer> {
	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				instances: [{ prompt }],
				parameters: {
					sampleCount: 1,
					aspectRatio: '16:9',
					outputOptions: { mimeType: 'image/jpeg' }
				}
			})
		}
	);

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Imagen-3 API error: ${response.status} ${err.substring(0, 300)}`);
	}

	const data = (await response.json()) as { predictions?: Array<{ bytesBase64Encoded?: string }> };
	const b64 = data.predictions?.[0]?.bytesBase64Encoded;
	if (!b64) throw new Error('Imagen-3 response did not include image bytes');
	return Buffer.from(b64, 'base64');
}

async function generateWithGeminiFallback(prompt: string, apiKey: string): Promise<Buffer> {
	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
					responseModalities: ['image', 'text'],
					responseMimeType: 'text/plain'
				}
			})
		}
	);

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Gemini fallback API error: ${response.status} ${err.substring(0, 300)}`);
	}

	const data = (await response.json()) as {
		candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }>;
	};
	const parts = data.candidates?.[0]?.content?.parts ?? [];
	const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
	if (!imagePart?.inlineData?.data) throw new Error('Gemini fallback response did not include image bytes');
	return Buffer.from(imagePart.inlineData.data, 'base64');
}

async function generateThumbnail(spec: ThumbnailSpec, apiKey: string) {
	const outputPath = join(OUT_DIR, spec.filename);

	if (existsSync(outputPath) && !FORCE) {
		console.log(`Skipping (exists): ${spec.filename}`);
		return;
	}

	if (existsSync(outputPath) && FORCE) {
		await unlink(outputPath);
	}

	console.log(`Generating: ${spec.filename}`);

	let image: Buffer | null = null;
	try {
		image = await generateWithImagen3(spec.prompt, apiKey);
		console.log('  ✓ Saved (Imagen-3)');
	} catch (err) {
		console.log(`  ⚠ Imagen-3 unavailable, trying Gemini fallback...`);
		image = await generateWithGeminiFallback(spec.prompt, apiKey);
		console.log('  ✓ Saved (Gemini fallback)');
	}

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, image);
	console.log(`  → ${outputPath}`);
}

async function main() {
	console.log('OUTERFIELDS Landing Thumbnail Generator (Gemini / Imagen)');
	console.log('========================================================\n');

	const apiKey = getGeminiKey();
	const selected = ONLY ? THUMBNAILS.filter((t) => t.slug === ONLY) : THUMBNAILS;

	if (ONLY && selected.length === 0) {
		throw new Error(`Unknown --only slug "${ONLY}". Available: ${THUMBNAILS.map((t) => t.slug).join(', ')}`);
	}

	console.log(`Output directory: ${OUT_DIR}`);
	console.log(`Thumbnails: ${selected.length}${ONLY ? ` (only: ${ONLY})` : ''}`);
	console.log(`Force: ${FORCE ? 'yes' : 'no'}\n`);

	let ok = 0;
	let failed = 0;

	for (const spec of selected) {
		try {
			await generateThumbnail(spec, apiKey);
			ok++;
			// Keep well under typical rate limits
			await sleep(6000);
		} catch (e) {
			failed++;
			console.error(`  ✗ Failed: ${spec.filename}`, e);
		}
	}

	console.log(`\nDone: ${ok} succeeded, ${failed} failed`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

