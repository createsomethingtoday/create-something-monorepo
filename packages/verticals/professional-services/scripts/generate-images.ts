/**
 * Generate images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/professional-services
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

const STYLE = `Professional architectural photography, minimalist modern architecture,
natural materials wood glass concrete, warm interior lighting at golden hour,
clean editorial style, ultra sharp details, photorealistic, 8K,
no vignette, no radial gradient, no white overlay, no fog effect, even lighting across frame,
clear unobstructed view, magazine quality, Dwell magazine style`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Forest Cabin - Hero
	{
		filename: 'projects/hero-forest-cabin.jpg',
		prompt: `${STYLE}. Stunning glass pavilion house nestled among tall pine trees in a Pacific Northwest forest,
		floor-to-ceiling windows, black steel frame, warm amber interior lighting glowing at dusk,
		western red cedar cladding, pine trees frame composition, misty atmosphere, golden hour`
	},

	// Hillside Residence - Exterior
	{
		filename: 'projects/exterior-hillside.jpg',
		prompt: `${STYLE}. Dramatic cantilevered modern house on steep forested hillside,
		cedar cladding weathered silver-grey, floor-to-ceiling glass walls,
		multiple volumes stepping down slope, native landscaping, sweeping valley views,
		Pacific Northwest architecture, golden hour light`
	},

	// Coastal Retreat - Exterior
	{
		filename: 'projects/exterior-coastal.jpg',
		prompt: `${STYLE}. Modernist beach house with horizontal lines on California coast,
		weathered cedar siding, large overhanging roof protecting glass walls,
		ipe wood deck, native coastal grasses, ocean visible in background,
		Sea Ranch inspired architecture, soft afternoon light`
	},

	// Meadow Studio - Exterior
	{
		filename: 'projects/exterior-meadow.jpg',
		prompt: `${STYLE}. Low-slung modernist pavilion in wildflower meadow,
		black timber cladding, large glass walls, flat roof with deep overhang,
		prefabricated cedar modules, golden grasses surrounding structure,
		mountains in distance, Hudson Valley landscape`
	},

	// Interior - Modern chair by window
	{
		filename: 'projects/interior-chair.jpg',
		prompt: `${STYLE}. Minimalist interior with iconic mid-century modern lounge chair,
		floor-to-ceiling window with forest view, polished concrete floor,
		natural light streaming in, warm wood accents, architectural detail shot`
	},

	// Interior - Architect's desk
	{
		filename: 'projects/interior-desk.jpg',
		prompt: `${STYLE}. Modern home office with built-in walnut desk,
		large window overlooking trees, architectural drawings on desk,
		minimal decor, task lamp, floating shelves with books,
		warm afternoon light, creative workspace`
	},

	// Interior - Built-in shelving
	{
		filename: 'projects/interior-shelf.jpg',
		prompt: `${STYLE}. Floor-to-ceiling built-in oak bookshelf in modern home,
		books and objects carefully arranged, window light from side,
		craftsmanship detail of joinery visible, warm wood tones,
		architectural millwork, minimalist styling`
	},

	// Interior - Kitchen
	{
		filename: 'projects/interior-kitchen.jpg',
		prompt: `${STYLE}. Modern kitchen in architect-designed home,
		white oak cabinetry, concrete countertops, large window with nature view,
		pendant lights over island, open shelving, minimalist design,
		warm morning light, professional appliances`
	},

	// Interior - Bedroom
	{
		filename: 'projects/interior-bedroom.jpg',
		prompt: `${STYLE}. Serene master bedroom with glass wall overlooking forest,
		low platform bed with white linens, oak floors,
		minimal nightstands, soft morning light filtering through trees,
		architectural simplicity, warm neutral palette`
	},

	// Architect headshot
	{
		filename: 'headshot-architect.jpg',
		prompt: `Professional headshot portrait of architect in their 40s,
		wearing black turtleneck, confident thoughtful expression,
		modern white studio background, soft natural lighting,
		editorial portrait style, sharp focus, warm approachable`
	},

	// OG Image
	{
		filename: 'og-image.jpg',
		prompt: `${STYLE}. Aerial view of modern cedar house in Pacific Northwest forest,
		multiple glass pavilions connected by covered walkways,
		native landscaping, harmony between architecture and nature,
		golden hour, long shadows, architectural masterplan view`
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
	console.log('Professional Services Image Generator (Cloudflare Flux)');
	console.log('=======================================================\n');

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
