/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/silhouettes
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
const OUTPUT_DIR = path.join(__dirname, '../static/images');

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

const STYLE = `Minimalist fashion photography, editorial style, professional photography,
clean composition, high fashion, 3:4 aspect ratio portrait orientation,
no vignette, no radial gradient, no fog effect, even lighting across frame,
clear unobstructed view, magazine quality, TOTEME inspired aesthetic`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// New Products (4)
	{
		filename: 'product-wool-coat.png',
		prompt: `${STYLE}. Scandinavian woman wearing relaxed wool coat in neutral beige color,
		clean white studio background, soft natural lighting, symmetrical composition,
		minimalist Scandinavian aesthetic, timeless design`
	},
	{
		filename: 'product-trousers.png',
		prompt: `${STYLE}. Scandinavian woman wearing high-waist black trousers with white shirt,
		clean white background, soft shadows, minimalist styling, professional model pose,
		elegant simplicity`
	},
	{
		filename: 'product-wrap-dress.png',
		prompt: `${STYLE}. Scandinavian woman wearing silk wrap dress in cream color,
		clean background, soft natural lighting, elegant pose, flowing fabric,
		sophisticated minimalism`
	},
	{
		filename: 'product-shirt-dress.png',
		prompt: `${STYLE}. Scandinavian woman wearing oversized shirt dress in white,
		clean studio background, natural lighting, simple composition, relaxed fit,
		modern minimalist fashion`
	},

	// Iconic Pieces (4)
	{
		filename: 'iconic-blazer.png',
		prompt: `${STYLE}. Tailored black blazer on white background,
		professional product photography, high contrast, clean composition,
		luxurious fabric detail visible, sharp tailoring, timeless design`
	},
	{
		filename: 'iconic-sweater.png',
		prompt: `${STYLE}. Cream cashmere sweater folded on white surface,
		professional product photography, soft lighting, clean composition,
		luxurious texture visible, high-end knitwear, minimal styling`
	},
	{
		filename: 'iconic-leather-jacket.png',
		prompt: `${STYLE}. Black leather jacket detail shot,
		professional product photography, high contrast, clean composition,
		leather texture visible, modern classic design, editorial quality`
	},
	{
		filename: 'iconic-midi-skirt.png',
		prompt: `${STYLE}. Beige midi skirt on hanger against white background,
		professional product photography, soft shadows, clean composition,
		elegant drape, neutral tones, minimalist presentation`
	},

	// Gallery Images (3)
	{
		filename: 'gallery-1.png',
		prompt: `${STYLE}. Artistic portrait of woman in black outfit,
		dramatic lighting, high contrast, professional photography,
		architectural composition, strong silhouette, elegant pose`
	},
	{
		filename: 'gallery-2.png',
		prompt: `${STYLE}. Architectural detail shot of woman in neutral tones,
		geometric composition, professional photography, clean lines,
		modern minimalist aesthetic, sophisticated styling`
	},
	{
		filename: 'gallery-3.png',
		prompt: `${STYLE}. Close-up detail of fabric texture in neutral colors,
		soft lighting, professional photography, material focus,
		tactile quality, minimalist composition, high-end fashion detail`
	},

	// Design Statement Images (2)
	{
		filename: 'statement-back.png',
		prompt: `${STYLE}. Full length portrait of woman in beige coat,
		white studio background, centered composition, professional model,
		timeless elegance, editorial quality, Scandinavian minimalism`
	},
	{
		filename: 'statement-front.png',
		prompt: `${STYLE}. Portrait of woman in black turtleneck,
		white background, soft lighting, face visible, confident expression,
		professional headshot style, modern minimalist fashion`
	},

	// Icons Feature Image (1)
	{
		filename: 'icons-feature.png',
		prompt: `${STYLE}. Elegant woman in timeless black dress,
		white background, classic pose, vertical composition,
		sophisticated styling, professional portrait, enduring design,
		modern classic aesthetic`
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
	console.log('Silhouettes Image Generator (Cloudflare Flux)');
	console.log('===============================================\n');

	const apiToken = getApiToken();
	console.log(`Using API token: ${apiToken.substring(0, 10)}...\n`);
	console.log(`Generating ${IMAGES.length} images...\n`);

	let success = 0;
	let failed = 0;

	for (const spec of IMAGES) {
		try {
			await generateImage(spec, apiToken);
			success++;
			// Rate limit: 3 second delay between requests
			await new Promise((r) => setTimeout(r, 3000));
		} catch (error) {
			console.error(`  ✗ Failed: ${spec.filename}`, (error as Error).message);
			failed++;
		}
	}

	console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
