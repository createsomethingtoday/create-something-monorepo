/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/restaurant
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

const STYLE = `Professional food and restaurant photography, high-end fine dining aesthetic,
warm inviting atmosphere, rich colors, appetizing presentation, editorial food photography,
soft natural lighting, shallow depth of field where appropriate, magazine quality, 8K,
no vignette, no text overlays, clear unobstructed view`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Hero - Restaurant Interior
	{
		filename: 'hero-interior.jpg',
		prompt: `${STYLE}. Elegant modern restaurant interior at golden hour,
		warm ambient lighting, exposed brick wall with contemporary art,
		open kitchen visible in background, well-dressed diners enjoying meals,
		Pacific Northwest fine dining aesthetic, white tablecloths,
		sophisticated yet welcoming atmosphere, Seattle restaurant ambiance`
	},

	// Menu Items - Featured Dishes
	{
		filename: 'menu/ribeye.jpg',
		prompt: `${STYLE}. Wood-fired ribeye steak perfectly cooked medium rare,
		14oz dry-aged beef on elegant white plate, roasted bone marrow on side,
		fingerling potatoes arranged artistically, red wine jus drizzled,
		fresh herbs garnish, dark slate table background, steam rising`
	},
	{
		filename: 'menu/tasting-menu.jpg',
		prompt: `${STYLE}. Elegant five-course tasting menu overview,
		multiple small plates artistically arranged on long wooden board,
		seasonal ingredients visible, colorful presentation,
		fine dining plating techniques, chef's table perspective,
		Pacific Northwest ingredients, artistic culinary presentation`
	},
	{
		filename: 'menu/oysters.jpg',
		prompt: `${STYLE}. Fresh oysters on the half shell,
		arranged on crushed ice with seaweed, mignonette sauce in small vessel,
		cocktail sauce and lemon wedges, elegant presentation,
		Pacific Northwest oyster varieties, raw bar aesthetic`
	},
	{
		filename: 'menu/duck-confit.jpg',
		prompt: `${STYLE}. Crispy duck confit leg on elegant white plate,
		white bean cassoulet underneath, cherry gastrique drizzle,
		frisée salad garnish, French bistro meets Pacific Northwest,
		golden crispy skin visible, rich colors`
	},
	{
		filename: 'menu/chocolate-torte.jpg',
		prompt: `${STYLE}. Flourless dark chocolate torte dessert,
		elegant slice on white plate, raspberry coulis artistic swirl,
		fresh whipped cream quenelle, fresh raspberries,
		cocoa powder dusting, fine dining dessert presentation`
	},

	// OG Image
	{
		filename: 'og-image.jpg',
		prompt: `${STYLE}. Overhead view of elegant restaurant table setting,
		beautifully plated dishes, wine glasses, warm candlelight,
		Pacific Northwest fine dining, intimate dinner atmosphere,
		rich colors, inviting and appetizing scene`
	},

	// Team - Executive Chef
	{
		filename: 'team/chef-williams.jpg',
		prompt: `Professional chef portrait, distinguished male executive chef in clean white chef's coat,
		confident welcoming expression, professional kitchen environment blurred in background,
		warm natural lighting, editorial portrait photography style, approachable and experienced,
		Pacific Northwest culinary professional, mid-40s, subtle smile, clean composition,
		restaurant kitchen setting, high-end culinary establishment, 8K quality`
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
	console.log('Restaurant Image Generator (Cloudflare Flux)');
	console.log('============================================\n');

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
