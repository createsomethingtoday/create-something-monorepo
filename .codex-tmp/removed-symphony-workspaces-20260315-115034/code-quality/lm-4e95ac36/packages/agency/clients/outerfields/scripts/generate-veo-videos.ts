#!/usr/bin/env npx ts-node
/**
 * OUTERFIELDS Veo 3.1 Video Generation Script
 *
 * Generates AI videos using Google's Veo 3.1 via Vertex AI
 * and uploads them to Cloudflare Stream for delivery.
 *
 * Prerequisites:
 * 1. Google Cloud project with Vertex AI enabled
 * 2. GOOGLE_APPLICATION_CREDENTIALS environment variable set
 * 3. Cloudflare API token with Stream permissions
 *
 * Usage:
 *   npx ts-node scripts/generate-veo-videos.ts [--dry-run] [--video-id <id>]
 *
 * Environment variables:
 *   GOOGLE_CLOUD_PROJECT - GCP project ID
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account key
 *   CLOUDFLARE_API_TOKEN - CF API token
 *   CLOUDFLARE_ACCOUNT_ID - CF account ID
 */

import { OUTERFIELDS_VIDEO_PROMPTS, createVeoRequest, estimateCost, type VeoPrompt } from './veo-prompts';

// ============================================
// Configuration
// ============================================

interface Config {
	gcpProject: string;
	gcpLocation: string;
	cfAccountId: string;
	cfApiToken: string;
	outputDir: string;
	dryRun: boolean;
	specificVideoId?: string;
}

function loadConfig(): Config {
	const gcpProject = process.env.GOOGLE_CLOUD_PROJECT;
	const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const videoIdIndex = args.indexOf('--video-id');
	const specificVideoId = videoIdIndex !== -1 ? args[videoIdIndex + 1] : undefined;

	if (!dryRun && (!gcpProject || !cfAccountId || !cfApiToken)) {
		console.error('Missing required environment variables:');
		if (!gcpProject) console.error('  - GOOGLE_CLOUD_PROJECT');
		if (!cfAccountId) console.error('  - CLOUDFLARE_ACCOUNT_ID');
		if (!cfApiToken) console.error('  - CLOUDFLARE_API_TOKEN');
		console.error('\nRun with --dry-run to preview without credentials.');
		process.exit(1);
	}

	return {
		gcpProject: gcpProject || 'demo-project',
		gcpLocation: 'us-central1',
		cfAccountId: cfAccountId || 'demo-account',
		cfApiToken: cfApiToken || 'demo-token',
		outputDir: './generated-videos',
		dryRun,
		specificVideoId
	};
}

// ============================================
// Vertex AI / Veo 3.1 Client
// ============================================

interface VeoGenerationResult {
	videoId: string;
	videoUrl: string;
	thumbnailUrl: string;
	duration: number;
	status: 'success' | 'failed';
	error?: string;
}

async function generateVideoWithVeo(
	prompt: VeoPrompt,
	config: Config
): Promise<VeoGenerationResult> {
	const request = createVeoRequest(prompt);

	console.log(`\n🎬 Generating: ${prompt.title}`);
	console.log(`   Duration: ${prompt.duration}s | Style: ${prompt.style}`);

	if (config.dryRun) {
		console.log('   [DRY RUN] Would send to Vertex AI Veo 3.1');
		console.log(`   Prompt preview: ${prompt.prompt.substring(0, 100)}...`);

		// Simulate response for dry run
		return {
			videoId: `veo_${prompt.id}_${Date.now()}`,
			videoUrl: `https://storage.googleapis.com/${config.gcpProject}/veo-output/${prompt.id}.mp4`,
			thumbnailUrl: `https://storage.googleapis.com/${config.gcpProject}/veo-output/${prompt.id}_thumb.jpg`,
			duration: prompt.duration,
			status: 'success'
		};
	}

	// Real Vertex AI Veo 3.1 API call
	// Note: Veo 3.1 is accessed through Vertex AI's generative models API
	const endpoint = `https://${config.gcpLocation}-aiplatform.googleapis.com/v1/projects/${config.gcpProject}/locations/${config.gcpLocation}/publishers/google/models/veo-3.1:generateVideo`;

	try {
		// Get access token from ADC
		const { GoogleAuth } = await import('google-auth-library');
		const auth = new GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform']
		});
		const client = await auth.getClient();
		const accessToken = await client.getAccessToken();

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken.token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				instances: [{
					prompt: request.prompt,
					negativePrompt: request.negative_prompt,
					durationSeconds: request.duration_seconds,
					aspectRatio: request.aspect_ratio,
					resolution: request.resolution
				}],
				parameters: {
					sampleCount: 1,
					seed: request.seed
				}
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Veo API error: ${response.status} - ${error}`);
		}

		const result = await response.json();

		// Veo returns a long-running operation - poll for completion
		const operationName = result.name;
		const video = await pollForCompletion(operationName, config);

		return {
			videoId: `veo_${prompt.id}`,
			videoUrl: video.uri,
			thumbnailUrl: video.thumbnailUri,
			duration: prompt.duration,
			status: 'success'
		};
	} catch (error) {
		console.error(`   ❌ Generation failed: ${error}`);
		return {
			videoId: `veo_${prompt.id}`,
			videoUrl: '',
			thumbnailUrl: '',
			duration: prompt.duration,
			status: 'failed',
			error: String(error)
		};
	}
}

async function pollForCompletion(
	operationName: string,
	config: Config,
	maxAttempts = 60,
	intervalMs = 10000
): Promise<{ uri: string; thumbnailUri: string }> {
	const { GoogleAuth } = await import('google-auth-library');
	const auth = new GoogleAuth({
		scopes: ['https://www.googleapis.com/auth/cloud-platform']
	});

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const client = await auth.getClient();
		const accessToken = await client.getAccessToken();

		const response = await fetch(
			`https://${config.gcpLocation}-aiplatform.googleapis.com/v1/${operationName}`,
			{
				headers: {
					'Authorization': `Bearer ${accessToken.token}`
				}
			}
		);

		const operation = await response.json();

		if (operation.done) {
			if (operation.error) {
				throw new Error(operation.error.message);
			}
			return {
				uri: operation.response.generatedVideos[0].uri,
				thumbnailUri: operation.response.generatedVideos[0].thumbnailUri
			};
		}

		console.log(`   ⏳ Generating... (${attempt + 1}/${maxAttempts})`);
		await new Promise(resolve => setTimeout(resolve, intervalMs));
	}

	throw new Error('Video generation timed out');
}

// ============================================
// Cloudflare Stream Upload
// ============================================

interface StreamUploadResult {
	uid: string;
	playbackUrl: string;
	thumbnailUrl: string;
	dashUrl: string;
	hlsUrl: string;
}

async function uploadToCloudflareStream(
	videoUrl: string,
	prompt: VeoPrompt,
	config: Config
): Promise<StreamUploadResult> {
	console.log(`   📤 Uploading to Cloudflare Stream...`);

	if (config.dryRun) {
		console.log('   [DRY RUN] Would upload to Cloudflare Stream');
		return {
			uid: `cf_${prompt.id}`,
			playbackUrl: `https://customer-xyz.cloudflarestream.com/cf_${prompt.id}/iframe`,
			thumbnailUrl: `https://customer-xyz.cloudflarestream.com/cf_${prompt.id}/thumbnails/thumbnail.jpg`,
			dashUrl: `https://customer-xyz.cloudflarestream.com/cf_${prompt.id}/manifest/video.mpd`,
			hlsUrl: `https://customer-xyz.cloudflarestream.com/cf_${prompt.id}/manifest/video.m3u8`
		};
	}

	// Upload via URL
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/stream/copy`,
		{
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${config.cfApiToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				url: videoUrl,
				meta: {
					name: prompt.title,
					category: prompt.category,
					outerfieldsId: prompt.id
				},
				requireSignedURLs: false,
				allowedOrigins: ['outerfields.createsomething.agency', 'localhost:5173']
			})
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Stream upload failed: ${response.status} - ${error}`);
	}

	const result = await response.json();
	const video = result.result;

	// Wait for video to be ready
	await waitForStreamReady(video.uid, config);

	return {
		uid: video.uid,
		playbackUrl: `https://customer-${config.cfAccountId}.cloudflarestream.com/${video.uid}/iframe`,
		thumbnailUrl: `https://customer-${config.cfAccountId}.cloudflarestream.com/${video.uid}/thumbnails/thumbnail.jpg`,
		dashUrl: `https://customer-${config.cfAccountId}.cloudflarestream.com/${video.uid}/manifest/video.mpd`,
		hlsUrl: `https://customer-${config.cfAccountId}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`
	};
}

async function waitForStreamReady(
	uid: string,
	config: Config,
	maxAttempts = 30
): Promise<void> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/stream/${uid}`,
			{
				headers: {
					'Authorization': `Bearer ${config.cfApiToken}`
				}
			}
		);

		const result = await response.json();

		if (result.result.status.state === 'ready') {
			console.log('   ✅ Video ready on Stream');
			return;
		}

		if (result.result.status.state === 'error') {
			throw new Error(`Stream processing failed: ${result.result.status.errorReasonText}`);
		}

		console.log(`   ⏳ Processing... (${attempt + 1}/${maxAttempts})`);
		await new Promise(resolve => setTimeout(resolve, 5000));
	}

	throw new Error('Stream processing timed out');
}

// ============================================
// Video Manifest Generation
// ============================================

interface VideoManifestEntry {
	id: string;
	title: string;
	category: string;
	duration: number;
	style: string;
	streamUid: string;
	playbackUrl: string;
	thumbnailUrl: string;
	dashUrl: string;
	hlsUrl: string;
	generatedAt: string;
}

interface VideoManifest {
	version: string;
	generatedAt: string;
	videos: VideoManifestEntry[];
}

function generateManifest(
	results: Array<{ prompt: VeoPrompt; stream: StreamUploadResult }>
): VideoManifest {
	return {
		version: '1.0.0',
		generatedAt: new Date().toISOString(),
		videos: results.map(({ prompt, stream }) => ({
			id: prompt.id,
			title: prompt.title,
			category: prompt.category,
			duration: prompt.duration,
			style: prompt.style,
			streamUid: stream.uid,
			playbackUrl: stream.playbackUrl,
			thumbnailUrl: stream.thumbnailUrl,
			dashUrl: stream.dashUrl,
			hlsUrl: stream.hlsUrl,
			generatedAt: new Date().toISOString()
		}))
	};
}

// ============================================
// Main Execution
// ============================================

async function main() {
	console.log('\n╔════════════════════════════════════════════════════╗');
	console.log('║  OUTERFIELDS Veo 3.1 Video Generation Pipeline     ║');
	console.log('╚════════════════════════════════════════════════════╝\n');

	const config = loadConfig();

	if (config.dryRun) {
		console.log('🔍 DRY RUN MODE - No actual generation or upload\n');
	}

	// Select prompts to process
	let prompts = OUTERFIELDS_VIDEO_PROMPTS;
	if (config.specificVideoId) {
		prompts = prompts.filter(p => p.id === config.specificVideoId);
		if (prompts.length === 0) {
			console.error(`Video ID "${config.specificVideoId}" not found`);
			process.exit(1);
		}
	}

	// Cost estimate
	const estimate = estimateCost(prompts);
	console.log(`📊 Generation Plan:`);
	console.log(`   Videos: ${prompts.length}`);
	console.log(`   Total duration: ${estimate.totalSeconds}s`);
	console.log(`   Estimated cost: ${estimate.estimatedCost}`);
	console.log('');

	// Process each video
	const results: Array<{ prompt: VeoPrompt; stream: StreamUploadResult }> = [];

	for (const prompt of prompts) {
		try {
			// Generate with Veo
			const veoResult = await generateVideoWithVeo(prompt, config);

			if (veoResult.status === 'failed') {
				console.log(`   ⚠️ Skipping upload due to generation failure`);
				continue;
			}

			// Upload to Cloudflare Stream
			const streamResult = await uploadToCloudflareStream(
				veoResult.videoUrl,
				prompt,
				config
			);

			results.push({ prompt, stream: streamResult });
			console.log(`   ✅ Complete: ${streamResult.playbackUrl}`);
		} catch (error) {
			console.error(`   ❌ Failed: ${error}`);
		}
	}

	// Generate manifest
	const manifest = generateManifest(results);

	console.log('\n════════════════════════════════════════════════════');
	console.log('📋 VIDEO MANIFEST');
	console.log('════════════════════════════════════════════════════\n');
	console.log(JSON.stringify(manifest, null, 2));

	// Save manifest
	const fs = await import('fs/promises');
	const manifestPath = `${config.outputDir}/manifest.json`;

	if (!config.dryRun) {
		await fs.mkdir(config.outputDir, { recursive: true });
		await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
		console.log(`\n💾 Manifest saved to: ${manifestPath}`);
	}

	console.log('\n✨ Generation complete!');
	console.log(`   Success: ${results.length}/${prompts.length}`);
}

main().catch(console.error);
