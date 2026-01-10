/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/professional-services-philosophy
 *   npx tsx scripts/generate-images.ts
 *
 * Authentication: Uses wrangler's stored OAuth token automatically.
 * Model: @cf/black-forest-labs/flux-1-schnell (1024x1024, high quality)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const OUTPUT_DIR = path.join(__dirname, '../static');

function getApiToken(): string {
	if (process.env.CLOUDFLARE_API_TOKEN) {
		return process.env.CLOUDFLARE_API_TOKEN;
	}

	const configPaths = [
		path.join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml'),
		path.join(process.env.HOME || '', '.local/share/wrangler/config/default.toml'),
		path.join(process.env.HOME || '', '.wrangler/config/default.toml')
	];

	for (const configPath of configPaths) {
		if (fs.existsSync(configPath)) {
			const config = fs.readFileSync(configPath, 'utf-8');
			const match = config.match(/oauth_token\s*=\s*"([^"]+)"/);
			if (match) return match[1];
		}
	}

	throw new Error('No Cloudflare API token found. Set CLOUDFLARE_API_TOKEN env var.');
}

const STYLE = `Professional architectural photography, award-winning composition,
natural lighting, ultra sharp details, photorealistic, 8K resolution,
no vignette, no radial gradient, clean unobstructed view, Dwell magazine style`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// === Opening Gallery (4 images) ===
	{
		filename: 'gallery/residential.jpg',
		prompt: `${STYLE}. Stunning modern residential home with clean white facade,
		large floor-to-ceiling windows, flat roof with wooden overhang,
		manicured lawn and mature olive trees, Mediterranean blue sky,
		warm golden hour lighting, luxury real estate photography`
	},
	{
		filename: 'gallery/commercial.jpg',
		prompt: `${STYLE}. Contemporary glass office tower reflecting clouds,
		geometric steel and glass facade, dramatic low angle perspective,
		urban downtown skyline background, sharp architectural lines,
		blue hour twilight lighting, corporate headquarters building`
	},
	{
		filename: 'gallery/interior.jpg',
		prompt: `${STYLE}. Luxury minimalist living room interior,
		double height ceiling with floor-to-ceiling windows,
		white oak herringbone floors, designer furniture,
		neutral cream palette with warm wood accents, natural light flooding in,
		architectural digest style interior`
	},
	{
		filename: 'gallery/landscape.jpg',
		prompt: `${STYLE}. Modern landscape architecture design,
		geometric infinity pool with clean edges,
		manicured ornamental grasses and sculptural plantings,
		stone terrace overlooking rolling hills, sunset sky,
		contemporary outdoor living space`
	},

	// === Selected Works Projects ===
	{
		filename: 'projects/casa-moderna.jpg',
		prompt: `${STYLE}. Casa Moderna - stunning contemporary villa,
		white stucco walls with floor-to-ceiling glass, cantilevered roof,
		swimming pool in foreground reflecting the architecture,
		mature palm trees and Mediterranean landscaping,
		golden hour with warm interior lights glowing, luxury residence`
	},
	{
		filename: 'projects/urban-loft.jpg',
		prompt: `${STYLE}. Industrial loft apartment interior,
		exposed brick walls and steel beam ceiling,
		polished concrete floors, open floor plan,
		large factory windows with city view,
		modern furniture mixed with industrial elements,
		warm afternoon light streaming through windows`
	},
	{
		filename: 'projects/horizon-tower.jpg',
		prompt: `${STYLE}. Horizon Tower - sleek glass skyscraper,
		twisting geometric form reaching into blue sky,
		reflective glass facade with horizontal sun shades,
		modern urban plaza at base with water feature,
		dramatic upward perspective, corporate architecture`
	},
	{
		filename: 'projects/zen-retreat.jpg',
		prompt: `${STYLE}. Japanese-inspired luxury spa resort building,
		low horizontal pavilion with deep wooden overhangs,
		reflecting pool with floating stones,
		bamboo groves and maple trees surrounding,
		zen garden with raked gravel, tranquil atmosphere,
		twilight lighting with warm interior glow`
	},

	// === Background Images ===
	{
		filename: 'backgrounds/stats-bg.jpg',
		prompt: `${STYLE}. Dramatic architectural interior atrium,
		multi-story space with geometric skylight above,
		clean white walls with subtle shadows,
		minimalist design with sculptural staircase,
		natural light filtering down, slightly desaturated tones,
		suitable for text overlay`
	},
	{
		filename: 'backgrounds/contact-bg.jpg',
		prompt: `${STYLE}. Modern architecture studio workshop,
		large scale architectural model on table,
		drawings and plans in background,
		warm task lighting, creative atmosphere,
		architects hands visible working on model,
		professional workspace environment`
	},

	// === Hero Background ===
	{
		filename: 'backgrounds/hero-bg.jpg',
		prompt: `${STYLE}. Aerial view of modern architectural complex,
		white geometric buildings among lush green landscape,
		multiple connected pavilions with courtyards,
		harmony between built form and nature,
		soft morning light, slight mist in distance,
		masterplan composition view`
	}
];

async function generateImage(spec: ImageSpec, apiToken: string): Promise<void> {
	console.log(`Generating: ${spec.filename}...`);

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ prompt: spec.prompt })
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`API error: ${response.status} - ${error}`);
	}

	const data = (await response.json()) as { result?: { image?: string }; success: boolean };

	if (!data.success || !data.result?.image) {
		throw new Error(`No image returned: ${JSON.stringify(data)}`);
	}

	const imageBuffer = Buffer.from(data.result.image, 'base64');
	const outputPath = path.join(OUTPUT_DIR, spec.filename);

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, imageBuffer);

	console.log(`  ✓ Saved: ${spec.filename} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
}

async function main() {
	console.log('Rudolf Template Image Generator (Cloudflare Flux)');
	console.log('==================================================\n');

	const apiToken = getApiToken();
	console.log(`Using API token: ${apiToken.substring(0, 10)}...\n`);
	console.log(`Generating ${IMAGES.length} images...\n`);

	let success = 0;
	let failed = 0;

	for (const spec of IMAGES) {
		try {
			await generateImage(spec, apiToken);
			success++;
			await new Promise((r) => setTimeout(r, 3000));
		} catch (error) {
			console.error(`  ✗ Failed: ${spec.filename}`, (error as Error).message);
			failed++;
		}
	}

	console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
