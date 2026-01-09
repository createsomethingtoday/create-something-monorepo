#!/usr/bin/env npx tsx
/**
 * OUTERFIELDS Thumbnail Generator (Cloudflare Flux)
 *
 * Generates cohesive thumbnails and hero images for the demo experience.
 * Uses a consistent dark tech/startup aesthetic with purple accents.
 *
 * Usage:
 *   cd packages/agency/clients/outerfields
 *   npx tsx scripts/generate-thumbnails.ts
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
const OUTPUT_DIR = path.join(__dirname, '../static/thumbnails');

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

// Consistent OUTERFIELDS visual style
const STYLE = `Cinematic tech photography, dark moody aesthetic, pure black background,
subtle purple accent lighting, modern startup office, professional quality,
16:9 aspect ratio, shallow depth of field, documentary style, high contrast,
ultrawide monitors with dark themed interfaces, minimal and clean composition`;

interface ImageSpec {
	filename: string;
	prompt: string;
	category: 'hero' | 'thumbnail';
}

const IMAGES: ImageSpec[] = [
	// ============================================
	// HERO IMAGE
	// ============================================
	{
		filename: 'hero-building-outerfields.jpg',
		category: 'hero',
		prompt: `${STYLE}. Wide cinematic shot of modern tech startup office at golden hour.
		Diverse team of developers collaborating around large ultrawide monitors displaying
		dark-themed code editors and design software. Exposed brick walls, large windows
		with warm natural light streaming in. Purple LED accent lights. Whiteboard with
		system architecture diagrams visible. Documentary photography style, team celebration
		moment, authentic candid feel. Infinity symbol logo visible on screen.`
	},

	// ============================================
	// CONTINUE WATCHING - Development Progress
	// ============================================
	{
		filename: 'dev-video-player.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Over-the-shoulder view of developer at ultrawide monitor.
		VS Code open with TypeScript/Svelte code, dark theme IDE with purple syntax highlighting.
		Browser preview showing custom video player with dark UI. Mechanical keyboard visible.
		Focused coding session, late night atmosphere, purple ambient glow.`
	},
	{
		filename: 'design-dashboard.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Designer's workspace with large iMac display showing Figma.
		Dark-themed admin dashboard design with charts and graphs visible.
		Drawing tablet on minimal desk, purple accent lighting from monitor glow.
		Clean workspace, professional design environment.`
	},

	// ============================================
	// PLATFORM DEVELOPMENT - Technical Deep Dives
	// ============================================
	{
		filename: 'architecture-edge.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Developer at whiteboard drawing system architecture diagram.
		Boxes connected by arrows, labels like "Edge Worker", "D1", "KV Cache" visible.
		Dark room with purple ambient lighting, world map with glowing nodes on screen behind.
		Technical planning session, focused expression.`
	},
	{
		filename: 'realtime-analytics.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Close-up of monitor showing real-time analytics dashboard.
		Dark themed UI with live updating charts, numbers incrementing, engagement heatmap.
		Purple and blue data visualization colors. Terminal window visible with streaming data.
		Developer's hands on keyboard in foreground.`
	},
	{
		filename: 'multi-tenant.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Split screen showing three different branded websites.
		Each with unique branding but same underlying structure visible.
		Browser address bar showing different subdomains. Code editor visible showing
		routing logic. Multi-tenant architecture visualization.`
	},
	{
		filename: 'stripe-integration.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Monitor displaying Stripe dashboard with subscription products.
		Checkout flow visible with payment form. Dark themed interface.
		Code editor with webhook handler code visible. Purple accent lighting.
		Professional fintech development environment.`
	},

	// ============================================
	// DESIGN SYSTEM - Visual Language
	// ============================================
	{
		filename: 'canon-tokens.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Figma file showing design token library. Color swatches
		in pure black and white with opacity variations. Typography scale visible.
		CSS custom properties code alongside. Dieter Rams inspired minimal aesthetic.
		Design system documentation, educational composition.`
	},
	{
		filename: 'motion-design.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. UI elements mid-animation on screen. Easing curve visualization
		graph visible. Before/after comparison of static vs animated states.
		Timeline editor interface. Subtle motion blur effect. Purple accent transitions.`
	},
	{
		filename: 'svelte-components.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. VS Code with Svelte component file open, syntax highlighting
		showing $state() and $effect() runes. Component preview browser on right side.
		Dark themed IDE, component composition diagram visible. Clean code aesthetic.`
	},

	// ============================================
	// TEAM INSIGHTS - Behind the Scenes
	// ============================================
	{
		filename: 'why-we-built.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Documentary style portrait of founder in modern office.
		Speaking to camera, natural lighting from large window. Bookshelf with tech books
		in background. Genuine expression, storytelling moment. Casual but professional attire.
		Authentic startup founder aesthetic.`
	},
	{
		filename: 'problem-uscreen.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Split screen comparison view. Left side: cluttered, slow interface
		with frustrated user. Right side: clean, fast OUTERFIELDS dashboard with satisfied user.
		Before/after transformation. Problem-solution visual narrative.`
	},
	{
		filename: 'creator-first.jpg',
		category: 'thumbnail',
		prompt: `${STYLE}. Diverse group of content creators - photographer, educator,
		fitness instructor - each in their element. Collage style composition showing
		different creative pursuits unified by technology. Community celebration moment.
		Inspirational, warm lighting despite dark overall aesthetic.`
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
	console.log('╔════════════════════════════════════════════════════╗');
	console.log('║  OUTERFIELDS Thumbnail Generator (Cloudflare Flux) ║');
	console.log('╚════════════════════════════════════════════════════╝\n');

	const apiToken = getApiToken();
	console.log(`Using API token: ${apiToken.substring(0, 10)}...\n`);

	const heroes = IMAGES.filter((i) => i.category === 'hero');
	const thumbnails = IMAGES.filter((i) => i.category === 'thumbnail');

	console.log(`📷 Generating ${heroes.length} hero image(s) and ${thumbnails.length} thumbnails...\n`);

	let success = 0;
	let failed = 0;

	for (const spec of IMAGES) {
		try {
			await generateImage(spec, apiToken);
			success++;
			// Rate limit: 3 second delay between requests
			await new Promise((r) => setTimeout(r, 3000));
		} catch (error) {
			console.error(`  ✗ Failed: ${spec.filename}`, (error as Error).message);
			failed++;
		}
	}

	console.log(`\n✨ Complete: ${success} succeeded, ${failed} failed`);
	console.log(`\nOutput directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
