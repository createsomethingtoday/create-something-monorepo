/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/creative-agency
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

const STYLE = `High-end brand photography, clean minimalist aesthetic, professional creative agency portfolio,
sharp focus, even lighting, no vignette, no radial gradient, no overlay effects,
magazine editorial quality, Behance featured project style, 8K`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Vesta Financial - Fintech rebrand, corporate, premium blue-chip
	{
		filename: 'work/vesta-hero.jpg',
		prompt: `${STYLE}. Sleek fintech brand identity mockup on dark background,
		premium credit card and mobile app interface floating in 3D space,
		elegant blue and white color scheme, abstract geometric patterns,
		high-end financial technology aesthetic, clean corporate design`
	},
	{
		filename: 'work/vesta-01.jpg',
		prompt: `${STYLE}. Brand guidelines book open on marble desk,
		showing sophisticated fintech logo and typography system,
		gold foil details, premium paper stock, minimalist layout,
		professional brand identity presentation`
	},
	{
		filename: 'work/vesta-02.jpg',
		prompt: `${STYLE}. Modern office lobby with large-scale brand installation,
		illuminated fintech company logo on dark wall, sleek reception desk,
		floor-to-ceiling windows, premium corporate interior`
	},
	{
		filename: 'work/vesta-03.jpg',
		prompt: `${STYLE}. Times Square billboard mockup at night,
		bold fintech brand advertisement, clean typography,
		blue gradient background, urban environment, advertising display`
	},

	// Nimbus - Developer cloud platform, technical, bold
	{
		filename: 'work/nimbus-hero.jpg',
		prompt: `${STYLE}. Developer tool brand identity, dark mode interface design,
		code editor aesthetic with syntax highlighting colors,
		abstract cloud infrastructure visualization, purple and cyan accents,
		technical but approachable, modern SaaS product design`
	},
	{
		filename: 'work/nimbus-01.jpg',
		prompt: `${STYLE}. Landing page design on large monitor in modern office,
		developer-focused SaaS website, dark theme with neon accents,
		terminal-inspired typography, API documentation layout,
		clean desk setup with mechanical keyboard`
	},
	{
		filename: 'work/nimbus-02.jpg',
		prompt: `${STYLE}. Conference booth design for tech company,
		bold geometric brand graphics, interactive demo stations,
		developer swag displayed, modern trade show aesthetic,
		purple and white color scheme`
	},

	// Heirloom - Heritage furniture, craftsmanship, warm
	{
		filename: 'work/heirloom-hero.jpg',
		prompt: `${STYLE}. Luxury furniture e-commerce website on laptop,
		warm natural lighting, handcrafted wooden furniture in background,
		heritage brand aesthetic, cream and brown color palette,
		lifestyle photography, artisan craftsmanship feel`
	},
	{
		filename: 'work/heirloom-01.jpg',
		prompt: `${STYLE}. Elegant packaging design for furniture brand,
		kraft paper boxes with minimal logo, fabric swatches,
		wood samples, care instruction booklet,
		sustainable luxury packaging, artisan brand materials`
	},
	{
		filename: 'work/heirloom-02.jpg',
		prompt: `${STYLE}. Mobile app product page showing wooden chair,
		clean e-commerce interface, lifestyle photography,
		warm color palette, elegant typography,
		premium furniture shopping experience`
	},

	// Team headshots
	{
		filename: 'team/alex.jpg',
		prompt: `Professional headshot portrait of creative director in their late 30s,
		stylish but approachable, dark hair, wearing black turtleneck,
		confident warm expression, neutral studio background,
		soft natural lighting, editorial portrait style, sharp focus`
	},
	{
		filename: 'team/jordan.jpg',
		prompt: `Professional headshot portrait of strategy director in early 30s,
		modern business casual, short dark hair, wearing grey blazer,
		intelligent thoughtful expression, neutral studio background,
		soft natural lighting, editorial portrait style, sharp focus`
	},

	// OG Image
	{
		filename: 'og-image.jpg',
		prompt: `${STYLE}. Creative agency portfolio collage,
		multiple brand identity projects arranged in grid layout,
		diverse color schemes, logos and mockups,
		professional design studio aesthetic, dark background,
		sophisticated creative work showcase`
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
	console.log('Creative Agency Image Generator (Cloudflare Flux)');
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
