/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/law-firm
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

const STYLE = `Professional corporate photography, high-end law firm aesthetic,
clean modern design, warm professional lighting, sharp focus, photorealistic, 8K,
no vignette, no radial gradient, no overlay effects, even lighting across frame,
clear unobstructed view, corporate editorial quality`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Hero - Law Office
	{
		filename: 'hero-office.jpg',
		prompt: `${STYLE}. Stunning modern law office interior with floor-to-ceiling windows
		overlooking San Francisco skyline and bay, minimalist design with warm wood accents,
		polished concrete floors, leather seating area, legal books on built-in shelves,
		golden hour light streaming through windows, high-end corporate aesthetic,
		professional law firm reception area`
	},

	// Attorney Headshots - Morrison & Associates team
	{
		filename: 'attorney-morrison.jpg',
		prompt: `Professional headshot portrait of confident woman attorney in her mid-40s,
		dark brown hair styled professionally, wearing elegant dark navy blazer over white blouse,
		warm confident smile, authoritative yet approachable expression,
		neutral warm grey studio background, soft professional lighting,
		editorial corporate portrait style, sharp focus, high-end law firm partner aesthetic`
	},
	{
		filename: 'attorney-chen.jpg',
		prompt: `Professional headshot portrait of Asian American male attorney in his mid-30s,
		clean cut short black hair, wearing charcoal grey suit with burgundy tie,
		intelligent confident expression, professional demeanor,
		neutral warm grey studio background, soft professional lighting,
		editorial corporate portrait style, sharp focus, law firm partner aesthetic`
	},
	{
		filename: 'attorney-gonzalez.jpg',
		prompt: `Professional headshot portrait of Latina woman attorney in her early 30s,
		dark wavy hair, wearing professional black blazer over cream blouse,
		warm approachable smile, compassionate yet professional expression,
		neutral warm grey studio background, soft professional lighting,
		editorial corporate portrait style, sharp focus, law firm associate aesthetic`
	},

	// OG Image
	{
		filename: 'og-image.jpg',
		prompt: `${STYLE}. Modern law firm office conference room with San Francisco skyline view,
		long polished wood conference table, leather executive chairs,
		floor-to-ceiling windows, professional legal environment,
		golden hour light, prestigious corporate law aesthetic`
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
	console.log('Law Firm Image Generator (Cloudflare Flux)');
	console.log('==========================================\n');

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
