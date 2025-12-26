/**
 * Generate high-resolution architecture images using Gemini Imagen 3
 *
 * Usage:
 *   GOOGLE_API_KEY=your-key npx tsx scripts/generate-images.ts
 *
 * Generates cohesive, high-resolution images for the architecture-studio template.
 */

import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
	console.error('Error: GOOGLE_API_KEY environment variable required');
	process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '../static/projects');

// Imagen 3 endpoint
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;

// Style prefix for consistency across all images
const STYLE_PREFIX = `Professional architectural photography, minimalist modern architecture,
natural materials (wood, glass, concrete), integration with natural landscape,
warm interior lighting at golden hour, clean editorial style, high dynamic range,
ultra sharp details, 8K quality, shot on Hasselblad medium format camera`;

interface ImageSpec {
	filename: string;
	prompt: string;
	aspectRatio: '3:4' | '4:3' | '1:1' | '16:9';
}

// All images needed for the template
const IMAGES: ImageSpec[] = [
	// Forest Cabin Project
	{
		filename: 'hero-forest-cabin.jpg',
		prompt: `${STYLE_PREFIX}. Stunning glass pavilion house nestled among tall pine trees in a Scandinavian forest.
		The structure features floor-to-ceiling windows, a black steel frame, and warm amber interior lighting glowing at dusk.
		Pine trees frame the composition. Misty atmosphere, golden hour lighting.`,
		aspectRatio: '16:9'
	},
	{
		filename: 'forest-cabin-01.jpg',
		prompt: `${STYLE_PREFIX}. Interior of a modern forest cabin, double-height living space with floor-to-ceiling windows
		overlooking pine forest. Minimalist furniture, concrete floor, wood-clad ceiling, warm afternoon light streaming in.
		A person reading on a low sofa.`,
		aspectRatio: '3:4'
	},
	{
		filename: 'forest-cabin-02.jpg',
		prompt: `${STYLE_PREFIX}. Modern kitchen in a forest cabin, open plan with island counter,
		black cabinetry, concrete countertops, large window with forest view. Copper pendant lights,
		morning light, minimalist design.`,
		aspectRatio: '3:4'
	},
	{
		filename: 'forest-cabin-03.jpg',
		prompt: `${STYLE_PREFIX}. Exterior detail of modern cabin, showing the junction of black steel frame
		and floor-to-ceiling glass, with pine trees reflected. Clean geometric lines, high contrast.`,
		aspectRatio: '3:4'
	},

	// Hillside Residence Project
	{
		filename: 'exterior-hillside.jpg',
		prompt: `${STYLE_PREFIX}. Dramatic cantilevered modern house on a steep hillside,
		concrete and glass construction, floating above the landscape. Sweeping valley views,
		dramatic clouds, golden hour light hitting the structure.`,
		aspectRatio: '4:3'
	},
	{
		filename: 'hillside-01.jpg',
		prompt: `${STYLE_PREFIX}. Open plan living space in a hillside home with panoramic floor-to-ceiling windows,
		polished concrete floors, built-in walnut shelving, minimal furniture. Valley views beyond.`,
		aspectRatio: '4:3'
	},
	{
		filename: 'hillside-02.jpg',
		prompt: `${STYLE_PREFIX}. Master bedroom in hillside residence with glass wall overlooking mountains,
		floating bed platform, oak floors, pure white linens, morning light.`,
		aspectRatio: '16:9'
	},

	// Coastal Retreat Project
	{
		filename: 'exterior-coastal.jpg',
		prompt: `${STYLE_PREFIX}. Modernist beach house with horizontal lines, white concrete walls,
		large overhanging roof, infinity pool merging with ocean horizon. Blue sky, coastal vegetation.`,
		aspectRatio: '1:1'
	},
	{
		filename: 'coastal-01.jpg',
		prompt: `${STYLE_PREFIX}. Living room interior with ocean view, white walls, natural linen furniture,
		woven textures, driftwood accents. Floor-to-ceiling sliding glass doors open to terrace. Afternoon light.`,
		aspectRatio: '3:4'
	},
	{
		filename: 'coastal-02.jpg',
		prompt: `${STYLE_PREFIX}. Outdoor deck of coastal home with built-in seating, fire pit,
		ocean view at sunset. Warm amber lighting, wooden decking, minimalist design.`,
		aspectRatio: '4:3'
	},

	// Meadow Studio Project
	{
		filename: 'exterior-meadow.jpg',
		prompt: `${STYLE_PREFIX}. Low-slung modernist pavilion in a wildflower meadow,
		black timber cladding, large glass walls, flat roof with deep overhang.
		Golden grasses, soft evening light, mountains in distance.`,
		aspectRatio: '4:3'
	},
	{
		filename: 'meadow-01.jpg',
		prompt: `${STYLE_PREFIX}. Artist studio interior with north-facing skylights,
		white walls, concrete floor, large canvas on easel, minimal furnishings.
		Natural diffused light, creative workspace.`,
		aspectRatio: '3:4'
	},
	{
		filename: 'meadow-02.jpg',
		prompt: `${STYLE_PREFIX}. Entry sequence to meadow pavilion, covered walkway with timber slats
		creating shadow patterns, meadow grasses visible through gaps. Zen-like approach.`,
		aspectRatio: '3:4'
	},

	// Woodland House Project
	{
		filename: 'exterior-woodland.jpg',
		prompt: `${STYLE_PREFIX}. Contemporary timber house among deciduous trees in autumn,
		vertical cedar cladding weathered to silver-grey, large windows,
		fallen leaves on ground, soft diffused light through canopy.`,
		aspectRatio: '3:4'
	},
	{
		filename: 'woodland-01.jpg',
		prompt: `${STYLE_PREFIX}. Double-height living room with timber frame exposed,
		wood-burning stove, floor-to-ceiling bookshelf, autumn forest visible through windows.
		Warm interior, reading nook.`,
		aspectRatio: '4:3'
	},
	{
		filename: 'woodland-02.jpg',
		prompt: `${STYLE_PREFIX}. Home library in woodland house, built-in oak shelving,
		leather reading chair by window, forest view, afternoon light streaming in,
		books and objects carefully arranged.`,
		aspectRatio: '4:3'
	},
	{
		filename: 'woodland-03.jpg',
		prompt: `${STYLE_PREFIX}. Construction detail showing timber joinery of woodland house,
		mortise and tenon joints, natural wood grain, craftsmanship detail shot.`,
		aspectRatio: '1:1'
	},

	// Team and OG Image
	{
		filename: '../team/principal.jpg',
		prompt: `Professional headshot portrait of a distinguished architect in their 50s,
		salt and pepper hair, wearing black turtleneck, standing in a modern white studio space.
		Soft natural lighting, shallow depth of field, warm and approachable expression.
		High-end editorial portrait style.`,
		aspectRatio: '1:1'
	},
	{
		filename: '../og-image.jpg',
		prompt: `${STYLE_PREFIX}. Dramatic aerial view of a cluster of modern glass and concrete houses
		nestled in a forested hillside, showing the harmony between architecture and nature.
		Golden hour, long shadows, architectural masterplan visualization.`,
		aspectRatio: '1:1'
	}
];

async function generateImage(spec: ImageSpec): Promise<void> {
	console.log(`Generating: ${spec.filename}...`);

	const response = await fetch(IMAGEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			instances: [{ prompt: spec.prompt }],
			parameters: {
				sampleCount: 1,
				aspectRatio: spec.aspectRatio,
				safetyFilterLevel: 'block_few',
				personGeneration: 'allow_adult'
			}
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`API error for ${spec.filename}: ${error}`);
	}

	const data = await response.json();

	if (!data.predictions?.[0]?.bytesBase64Encoded) {
		throw new Error(`No image data returned for ${spec.filename}`);
	}

	const imageBuffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
	const outputPath = path.join(OUTPUT_DIR, spec.filename);

	// Ensure directory exists
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, imageBuffer);

	console.log(`  ✓ Saved: ${outputPath} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
}

async function main() {
	console.log('Architecture Studio Image Generator');
	console.log('====================================\n');
	console.log(`Generating ${IMAGES.length} images...\n`);

	let success = 0;
	let failed = 0;

	for (const spec of IMAGES) {
		try {
			await generateImage(spec);
			success++;
			// Rate limiting - wait between requests
			await new Promise(resolve => setTimeout(resolve, 2000));
		} catch (error) {
			console.error(`  ✗ Failed: ${spec.filename}`, error);
			failed++;
		}
	}

	console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
