/**
 * Screenshot Capture and Vision Analysis for Plagiarism Detection
 */

import puppeteer from '@cloudflare/puppeteer';
import type { Env } from './types';

// =============================================================================
// Screenshot Capture
// =============================================================================

/**
 * Capture a screenshot of a URL using Cloudflare Browser Rendering.
 */
export async function captureScreenshot(url: string, env: Env): Promise<ArrayBuffer | null> {
	let browser;
	try {
		console.log(`[Screenshot] Starting capture for ${url}`);

		// Launch browser using Cloudflare Browser Rendering
		console.log('[Screenshot] Launching browser...');
		browser = await puppeteer.launch(env.BROWSER);
		console.log('[Screenshot] Browser launched successfully');

		const page = await browser.newPage();
		console.log('[Screenshot] New page created');

		// Set viewport for consistent screenshots
		await page.setViewport({ width: 1280, height: 720 });
		console.log('[Screenshot] Viewport set');

		// Navigate to URL with timeout
		console.log(`[Screenshot] Navigating to ${url}...`);
		await page.goto(url, {
			waitUntil: 'load',  // Changed from 'networkidle0' - more lenient
			timeout: 60000      // Increased from 30s to 60s
		});
		console.log('[Screenshot] Page loaded');

		// Capture screenshot as JPEG
		// For vision analysis, we capture above-the-fold content (first ~3 viewports)
		// to stay within the 128K token context limit while capturing key design elements
		console.log('[Screenshot] Capturing screenshot...');
		const screenshot = await page.screenshot({
			type: 'jpeg',
			quality: 60,      // Reduced from 85 to save tokens
			fullPage: false,  // Viewport only to stay under token limit
			clip: {
				x: 0,
				y: 0,
				width: 1280,
				height: 2160    // 3 viewports worth (720 * 3)
			}
		});

		console.log(`[Screenshot] SUCCESS: Captured ${url} (${screenshot.byteLength} bytes)`);

		return screenshot.buffer;
	} catch (error: any) {
		console.error(`[Screenshot] FAILED for ${url}:`, {
			message: error?.message || String(error),
			stack: error?.stack,
			name: error?.name
		});
		return null;
	} finally {
		if (browser) {
			try {
				await browser.close();
				console.log('[Screenshot] Browser closed');
			} catch (e) {
				console.error('[Screenshot] Error closing browser:', e);
			}
		}
	}
}

/**
 * Capture and store screenshots for both original and copy URLs.
 */
export async function captureAndStoreScreenshots(
	caseId: string,
	originalUrl: string,
	allegedCopyUrl: string,
	env: Env
): Promise<{ originalKey: string | null; copyKey: string | null }> {
	const [originalScreenshot, copyScreenshot] = await Promise.all([
		captureScreenshot(originalUrl, env),
		captureScreenshot(allegedCopyUrl, env)
	]);

	let originalKey: string | null = null;
	let copyKey: string | null = null;

	if (originalScreenshot) {
		originalKey = `${caseId}/original.jpg`;
		await env.SCREENSHOTS.put(originalKey, originalScreenshot);
		console.log(`[Screenshot] Stored original: ${originalKey}`);
	}

	if (copyScreenshot) {
		copyKey = `${caseId}/copy.jpg`;
		await env.SCREENSHOTS.put(copyKey, copyScreenshot);
		console.log(`[Screenshot] Stored copy: ${copyKey}`);
	}

	return { originalKey, copyKey };
}

// =============================================================================
// Vision Analysis
// =============================================================================

/**
 * Get vision analysis if screenshots are available in R2.
 * Returns null if screenshots don't exist, allowing graceful degradation.
 */
export async function getVisionAnalysis(
	caseId: string,
	env: Env
): Promise<string | null> {
	try {
		const [originalImg, copyImg] = await Promise.all([
			env.SCREENSHOTS.get(`${caseId}/original.jpg`),
			env.SCREENSHOTS.get(`${caseId}/copy.jpg`)
		]);

		if (!originalImg || !copyImg) {
			return null;
		}

		// Convert R2 objects to byte arrays for Workers AI
		const originalBytes = new Uint8Array(await originalImg.arrayBuffer());
		const copyBytes = new Uint8Array(await copyImg.arrayBuffer());

		console.log(`[Vision] Analyzing screenshots (${originalBytes.length} bytes, ${copyBytes.length} bytes)`);

		// Use Cloudflare's vision model to analyze both screenshots
		// The model expects images as arrays of numbers
		const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
			prompt: 'Compare these two website screenshots for plagiarism. Analyze layout, design elements, typography, color schemes, spacing, and component structure. Describe specific similarities and differences.',
			image: [Array.from(originalBytes), Array.from(copyBytes)]
		});

		console.log('[Vision] Analysis complete');
		return response.response || null;
	} catch (error: any) {
		console.error('[Vision] Analysis failed:', {
			message: error?.message || String(error),
			name: error?.name
		});
		return null;
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert Uint8Array to base64 without causing stack overflow.
 * Standard btoa(String.fromCharCode(...array)) fails on large images.
 */
export function arrayBufferToBase64(bytes: Uint8Array): string {
	const CHUNK_SIZE = 0x8000; // 32KB chunks
	let binary = '';

	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
		binary += String.fromCharCode(...chunk);
	}

	return btoa(binary);
}
