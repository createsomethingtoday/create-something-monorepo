/**
 * Generate architecture images using Cloudflare Workers AI (Flux)
 *
 * Usage:
 *   cd packages/verticals/architecture-studio
 *   npx tsx scripts/generate-images-cf.ts
 *
 * Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars
 * Or uses wrangler's stored credentials
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const OUTPUT_DIR = path.join(__dirname, '../static/projects');

// Get API token from wrangler config or environment
function getApiToken(): string {
	if (process.env.CLOUDFLARE_API_TOKEN) {
		return process.env.CLOUDFLARE_API_TOKEN;
	}

	// Try to get from wrangler config (macOS location)
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
clean editorial style, high dynamic range, ultra sharp details, photorealistic, 8K`;

interface ImageSpec {
	filename: string;
	prompt: string;
}

const IMAGES: ImageSpec[] = [
	// Forest Cabin
	{
		filename: 'hero-forest-cabin.jpg',
		prompt: `${STYLE}. Stunning glass pavilion house nestled among tall pine trees in a Scandinavian forest,
		floor-to-ceiling windows, black steel frame, warm amber interior lighting glowing at dusk,
		pine trees frame composition, misty atmosphere, golden hour`
	},
	{
		filename: 'forest-cabin-01.jpg',
		prompt: `${STYLE}. Interior of modern forest cabin, double-height living space with
		floor-to-ceiling windows overlooking pine forest, minimalist furniture, concrete floor,
		wood-clad ceiling, warm afternoon light streaming in`
	},
	{
		filename: 'forest-cabin-02.jpg',
		prompt: `${STYLE}. Modern kitchen in forest cabin, open plan with island counter,
		black cabinetry, concrete countertops, large window with forest view, copper pendant lights`
	},
	{
		filename: 'forest-cabin-03.jpg',
		prompt: `${STYLE}. Exterior detail of modern cabin showing junction of black steel frame
		and floor-to-ceiling glass with pine trees reflected, clean geometric lines`
	},

	// Hillside Residence
	{
		filename: 'exterior-hillside.jpg',
		prompt: `${STYLE}. Dramatic cantilevered modern house on steep hillside,
		concrete and glass construction floating above landscape, sweeping valley views,
		dramatic clouds, golden hour light`
	},
	{
		filename: 'hillside-01.jpg',
		prompt: `${STYLE}. Open plan living space in hillside home with panoramic floor-to-ceiling windows,
		polished concrete floors, built-in walnut shelving, minimal furniture, valley views`
	},
	{
		filename: 'hillside-02.jpg',
		prompt: `${STYLE}. Master bedroom in hillside residence with glass wall overlooking mountains,
		floating bed platform, oak floors, pure white linens, morning light`
	},

	// Coastal Retreat
	{
		filename: 'exterior-coastal.jpg',
		prompt: `${STYLE}. Modernist beach house with horizontal lines, white concrete walls,
		large overhanging roof, infinity pool merging with ocean horizon, blue sky, coastal vegetation`
	},
	{
		filename: 'coastal-01.jpg',
		prompt: `${STYLE}. Living room interior with ocean view, white walls, natural linen furniture,
		floor-to-ceiling sliding glass doors open to terrace, afternoon light`
	},
	{
		filename: 'coastal-02.jpg',
		prompt: `${STYLE}. Outdoor deck of coastal home with built-in seating, fire pit,
		ocean view at sunset, wooden decking, minimalist design`
	},

	// Meadow Studio
	{
		filename: 'exterior-meadow.jpg',
		prompt: `${STYLE}. Low-slung modernist pavilion in wildflower meadow,
		black timber cladding, large glass walls, flat roof with deep overhang,
		golden grasses, mountains in distance`
	},
	{
		filename: 'meadow-01.jpg',
		prompt: `${STYLE}. Artist studio interior with north-facing skylights,
		white walls, concrete floor, large canvas on easel, natural diffused light`
	},
	{
		filename: 'meadow-02.jpg',
		prompt: `${STYLE}. Entry sequence to meadow pavilion, covered walkway with timber slats
		creating shadow patterns, meadow grasses visible through gaps`
	},

	// Woodland House
	{
		filename: 'exterior-woodland.jpg',
		prompt: `${STYLE}. Contemporary timber house among deciduous trees in autumn,
		vertical cedar cladding weathered to silver-grey, large windows, fallen leaves`
	},
	{
		filename: 'woodland-01.jpg',
		prompt: `${STYLE}. Double-height living room with timber frame exposed,
		wood-burning stove, floor-to-ceiling bookshelf, autumn forest through windows`
	},
	{
		filename: 'woodland-02.jpg',
		prompt: `${STYLE}. Home library in woodland house, built-in oak shelving,
		leather reading chair by window, forest view, afternoon light`
	},
	{
		filename: 'woodland-03.jpg',
		prompt: `${STYLE}. Construction detail showing timber joinery, mortise and tenon joints,
		natural wood grain, craftsmanship detail`
	},

	// Team and OG
	{
		filename: '../team/principal.jpg',
		prompt: `Professional headshot portrait of distinguished architect in 50s,
		salt and pepper hair, black turtleneck, modern white studio space,
		soft natural lighting, warm approachable expression, editorial portrait`
	},
	{
		filename: '../og-image.jpg',
		prompt: `${STYLE}. Aerial view of cluster of modern glass and concrete houses
		nestled in forested hillside, harmony between architecture and nature, golden hour, long shadows`
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

	const data = await response.json() as { result?: { image?: string }; success: boolean };

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
	console.log('Architecture Studio Image Generator (Cloudflare Flux)');
	console.log('=====================================================\n');

	const apiToken = getApiToken();
	console.log(`Using API token: ${apiToken.substring(0, 10)}...\n`);
	console.log(`Generating ${IMAGES.length} images...\n`);

	let success = 0;
	let failed = 0;

	for (const spec of IMAGES) {
		try {
			await generateImage(spec, apiToken);
			success++;
			// Rate limiting
			await new Promise((r) => setTimeout(r, 3000));
		} catch (error) {
			console.error(`  ✗ Failed: ${spec.filename}`, (error as Error).message);
			failed++;
		}
	}

	console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
