/**
 * Generate team images using Google Imagen 4
 *
 * Usage: npx tsx scripts/generate-team-images.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
	console.error('Error: GOOGLE_API_KEY environment variable is required');
	console.error('Usage: GOOGLE_API_KEY=your-key npx tsx scripts/generate-team-images.ts');
	process.exit(1);
}

interface TeamMember {
	filename: string;
	prompt: string;
}

const teamMembers: TeamMember[] = [
	{
		filename: 'chef-williams.jpg',
		prompt: 'Professional portrait of a male executive chef in his 40s, African American, wearing a pristine white chef coat and toque, warm smile, arms crossed confidently, kitchen background softly blurred, professional photography, high-end restaurant setting, warm lighting'
	},
	{
		filename: 'chef-chen.jpg',
		prompt: 'Professional portrait of a female pastry chef in her early 30s, Asian American, wearing a white chef coat, friendly expression, holding a delicate plated dessert, modern bakery kitchen background, professional photography, warm natural lighting'
	},
	{
		filename: 'sommelier-torres.jpg',
		prompt: 'Professional portrait of a male sommelier in his 40s, Hispanic, wearing a dark suit with sommelier pin, confident smile, holding a wine glass, wine cellar or upscale restaurant background, professional photography, elegant lighting'
	}
];

async function generateImage(prompt: string): Promise<Buffer | null> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GOOGLE_API_KEY}`;

	const requestBody = {
		instances: [{ prompt }],
		parameters: {
			sampleCount: 1,
			aspectRatio: '3:4',
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
	const outputDir = path.join(__dirname, '..', 'static', 'team');

	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	console.log('Generating team images with Google Imagen 4...\n');

	for (const member of teamMembers) {
		console.log(`Generating: ${member.filename}`);
		console.log(`Prompt: ${member.prompt.substring(0, 80)}...`);

		const imageBuffer = await generateImage(member.prompt);

		if (imageBuffer) {
			const outputPath = path.join(outputDir, member.filename);
			fs.writeFileSync(outputPath, imageBuffer);
			console.log(`✓ Saved to: ${outputPath} (${Math.round(imageBuffer.length / 1024)}KB)\n`);
		} else {
			console.log(`✗ Failed to generate ${member.filename}\n`);
		}

		// Rate limiting - wait between requests
		await new Promise(resolve => setTimeout(resolve, 3000));
	}

	console.log('Done!');
}

main().catch(console.error);
