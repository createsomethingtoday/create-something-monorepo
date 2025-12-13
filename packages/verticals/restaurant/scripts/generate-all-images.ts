/**
 * Generate all restaurant images using Google Imagen 4
 *
 * Usage: GOOGLE_API_KEY=your-key npx tsx scripts/generate-all-images.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
	console.error('Error: GOOGLE_API_KEY environment variable is required');
	console.error('Usage: GOOGLE_API_KEY=your-key npx tsx scripts/generate-all-images.ts');
	process.exit(1);
}

interface ImageSpec {
	path: string;
	prompt: string;
	aspectRatio: string;
}

const images: ImageSpec[] = [
	// Hero image
	{
		path: 'hero/restaurant-dining.jpg',
		prompt: 'Elegant fine dining restaurant interior at golden hour, warm ambient lighting, white tablecloths, wine glasses catching light, Seattle waterfront visible through large windows, sophisticated atmosphere, professional food photography, high-end establishment',
		aspectRatio: '16:9'
	},
	// Menu items
	{
		path: 'menu/halibut.jpg',
		prompt: 'Gourmet pan-seared halibut fillet with golden crispy skin, plated on fine white porcelain, microgreens and edible flowers garnish, delicate sauce pool, professional food photography, high-end restaurant plating, soft lighting',
		aspectRatio: '4:3'
	},
	{
		path: 'menu/ribeye.jpg',
		prompt: 'Prime ribeye steak perfectly medium-rare, thick cut with beautiful marbling visible, charred grill marks, served on warm plate with herb butter melting on top, professional food photography, fine dining presentation',
		aspectRatio: '4:3'
	},
	{
		path: 'menu/tasting.jpg',
		prompt: 'Elegant tasting menu course, artistic plating on slate plate, deconstructed elements with sauces and foam, edible flowers, tweezered microgreens, professional food photography, Michelin-star presentation',
		aspectRatio: '4:3'
	},
	// Team - chef chen
	{
		path: 'team/chef-chen.jpg',
		prompt: 'Professional portrait of a female pastry chef in her early 30s, Asian American, wearing a white chef coat, friendly expression, holding a delicate plated dessert, modern bakery kitchen background, professional photography, warm natural lighting',
		aspectRatio: '3:4'
	}
];

async function generateImage(prompt: string, aspectRatio: string): Promise<Buffer | null> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GOOGLE_API_KEY}`;

	const requestBody = {
		instances: [{ prompt }],
		parameters: {
			sampleCount: 1,
			aspectRatio,
			personGeneration: 'allow_adult'
		}
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const error = await response.text();
			console.error(`API error: ${response.status} - ${error}`);
			return null;
		}

		const data = await response.json();

		if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
			return Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
		}

		console.error('No image data in response:', JSON.stringify(data, null, 2));
		return null;
	} catch (error) {
		console.error('Request failed:', error);
		return null;
	}
}

async function main() {
	const staticDir = path.join(__dirname, '..', 'static');

	console.log('Generating restaurant images with Google Imagen 4...\n');

	for (const image of images) {
		const outputPath = path.join(staticDir, image.path);
		const outputDir = path.dirname(outputPath);

		// Ensure output directory exists
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		console.log(`Generating: ${image.path}`);
		console.log(`Prompt: ${image.prompt.substring(0, 60)}...`);

		const imageBuffer = await generateImage(image.prompt, image.aspectRatio);

		if (imageBuffer) {
			fs.writeFileSync(outputPath, imageBuffer);
			console.log(`✓ Saved (${Math.round(imageBuffer.length / 1024)}KB)\n`);
		} else {
			console.log(`✗ Failed to generate\n`);
		}

		// Rate limiting - wait between requests
		await new Promise(resolve => setTimeout(resolve, 3000));
	}

	console.log('Done!');
}

main().catch(console.error);
