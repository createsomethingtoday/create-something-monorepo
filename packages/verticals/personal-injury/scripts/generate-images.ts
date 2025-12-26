/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/personal-injury
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

const STYLE = `Professional legal photography, high-end personal injury law firm aesthetic,
clean modern design, warm trustworthy lighting, sharp focus, photorealistic, 8K,
no vignette, no radial gradient, no overlay effects, even lighting across frame,
clear unobstructed view, corporate editorial quality`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Hero - San Diego skyline with justice theme
	{
		filename: 'hero-justice.jpg',
		prompt: `${STYLE}. Dramatic aerial view of San Diego downtown skyline at golden hour,
		modern glass buildings reflecting warm sunset light, Coronado bridge visible in distance,
		Pacific Ocean horizon, palm trees framing shot, powerful professional atmosphere,
		symbolizing justice and strength, no text or overlays, clean urban landscape`
	},

	// Attorney Headshots - Martinez & Rivera team
	{
		filename: 'attorney-martinez.jpg',
		prompt: `Professional headshot portrait of confident Hispanic male attorney in his late 40s,
		salt and pepper hair neatly styled, wearing navy blue pinstripe suit with red power tie,
		strong determined expression, authoritative yet approachable demeanor,
		neutral warm grey studio background, soft professional lighting,
		trial lawyer aesthetic, editorial corporate portrait style, sharp focus`
	},
	{
		filename: 'attorney-rivera.jpg',
		prompt: `Professional headshot portrait of confident Latina woman attorney in her early 40s,
		dark hair pulled back elegantly, wearing sophisticated charcoal suit with white blouse,
		intelligent warm expression, professional yet compassionate demeanor,
		neutral warm grey studio background, soft professional lighting,
		managing partner aesthetic, editorial corporate portrait style, sharp focus`
	},
	{
		filename: 'attorney-johnson.jpg',
		prompt: `Professional headshot portrait of confident African American male attorney in his mid-30s,
		short fade haircut, wearing modern slim-fit dark grey suit with subtle pattern tie,
		confident friendly expression, approachable yet professional demeanor,
		neutral warm grey studio background, soft professional lighting,
		senior associate aesthetic, editorial corporate portrait style, sharp focus`
	},

	// OG Image
	{
		filename: 'og-image.jpg',
		prompt: `${STYLE}. Modern personal injury law firm conference room in high-rise building,
		floor-to-ceiling windows with San Diego harbor view, polished mahogany table,
		scales of justice decoration visible, warm golden hour light,
		professional legal environment conveying trust and success`
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
	console.log('Personal Injury Image Generator (Cloudflare Flux)');
	console.log('=================================================\n');

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
