/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/medical-practice
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

const STYLE = `Professional medical photography, modern healthcare facility aesthetic,
clean clinical design, warm trustworthy lighting, sharp focus, photorealistic, 8K,
no vignette, no radial gradient, no overlay effects, even lighting across frame,
clear unobstructed view, healthcare editorial quality`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Hero - Medical Practice Interior
	{
		filename: 'hero-clinic.jpg',
		prompt: `${STYLE}. Modern medical clinic waiting room with warm welcoming atmosphere,
		comfortable seating, natural light from large windows, potted plants,
		clean white and soft blue color scheme, reception desk visible,
		healthcare facility in Seattle, professional yet comforting environment,
		no patients visible, empty modern clinic lobby`
	},

	// Provider Headshots
	{
		filename: 'provider-chen.jpg',
		prompt: `Professional headshot portrait of Asian American woman physician in her late 30s,
		Dr. Sarah Chen, wearing white lab coat over professional attire,
		warm confident smile, approachable and trustworthy expression,
		stethoscope around neck, neutral warm grey studio background,
		soft professional lighting, family medicine doctor aesthetic,
		editorial corporate portrait style, sharp focus`
	},
	{
		filename: 'provider-rodriguez.jpg',
		prompt: `Professional headshot portrait of Hispanic male physician in his early 40s,
		Dr. Michael Rodriguez, wearing white lab coat over dress shirt and tie,
		confident professional expression, trustworthy and experienced demeanor,
		stethoscope around neck, neutral warm grey studio background,
		soft professional lighting, internal medicine doctor aesthetic,
		editorial corporate portrait style, sharp focus`
	},
	{
		filename: 'provider-thompson.jpg',
		prompt: `Professional headshot portrait of woman nurse practitioner in her early 30s,
		Jessica Thompson ARNP, wearing navy blue scrubs or professional medical attire,
		warm friendly smile, approachable and caring expression,
		stethoscope around neck, neutral warm grey studio background,
		soft professional lighting, pediatric nurse practitioner aesthetic,
		editorial healthcare portrait style, sharp focus`
	},

	// OG Image
	{
		filename: 'og-image.jpg',
		prompt: `${STYLE}. Modern medical examination room with natural light,
		clean white walls, medical equipment neatly arranged,
		examination table with fresh paper, computer workstation,
		professional healthcare environment, Seattle medical practice,
		warm inviting clinical space, no people visible`
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
	console.log('Medical Practice Image Generator (Cloudflare Flux)');
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
