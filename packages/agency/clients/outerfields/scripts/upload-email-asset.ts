#!/usr/bin/env tsx
/**
 * Upload Email Assets to R2
 *
 * DRY utility for uploading images to R2 for use in email templates.
 * Assets are stored under `email/` prefix and accessible via public CDN.
 *
 * Usage:
 *   pnpm tsx scripts/upload-email-asset.ts <file-path> [--name custom-name]
 *
 * Examples:
 *   pnpm tsx scripts/upload-email-asset.ts ~/Desktop/screenshot.png
 *   pnpm tsx scripts/upload-email-asset.ts ./assets/feature-preview.jpg --name video-landing-page
 *
 * Output:
 *   ✅ Uploaded: https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/email/video-landing-page.png
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { basename, extname } from 'path';

// R2 Configuration
const R2_BUCKET = 'outerfields-videos';
const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';
const EMAIL_PREFIX = 'email';

// Supported image types
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

interface UploadOptions {
	filePath: string;
	customName?: string;
}

function parseArgs(): UploadOptions {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
		console.log(`
Upload Email Assets to R2

Usage:
  pnpm tsx scripts/upload-email-asset.ts <file-path> [--name custom-name]

Examples:
  pnpm tsx scripts/upload-email-asset.ts ~/Desktop/screenshot.png
  pnpm tsx scripts/upload-email-asset.ts ./assets/preview.jpg --name video-landing-page

Options:
  --name    Custom filename (without extension). Defaults to original filename.
  --help    Show this help message.
`);
		process.exit(0);
	}

	const filePath = args[0];
	const nameIndex = args.indexOf('--name');
	const customName = nameIndex >= 0 ? args[nameIndex + 1] : undefined;

	return { filePath, customName };
}

function validateFile(filePath: string): void {
	if (!existsSync(filePath)) {
		console.error(`❌ File not found: ${filePath}`);
		process.exit(1);
	}

	const stats = statSync(filePath);
	if (!stats.isFile()) {
		console.error(`❌ Not a file: ${filePath}`);
		process.exit(1);
	}

	const ext = extname(filePath).toLowerCase();
	if (!SUPPORTED_EXTENSIONS.includes(ext)) {
		console.error(`❌ Unsupported file type: ${ext}`);
		console.error(`   Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
		process.exit(1);
	}

	// Warn if file is large (>2MB)
	const sizeMB = stats.size / (1024 * 1024);
	if (sizeMB > 2) {
		console.warn(`⚠️  Large file (${sizeMB.toFixed(1)}MB). Consider optimizing for email.`);
	}
}

function generateR2Key(filePath: string, customName?: string): string {
	const ext = extname(filePath).toLowerCase();
	const name = customName || basename(filePath, ext);

	// Sanitize name: lowercase, replace spaces with hyphens, remove special chars
	const sanitized = name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');

	// Add timestamp to prevent caching issues
	const timestamp = Date.now();

	return `${EMAIL_PREFIX}/${sanitized}-${timestamp}${ext}`;
}

function uploadToR2(filePath: string, r2Key: string): void {
	console.log(`📤 Uploading to R2...`);
	console.log(`   Bucket: ${R2_BUCKET}`);
	console.log(`   Key: ${r2Key}`);

	try {
		execSync(`wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${filePath}"`, {
			stdio: 'inherit',
			cwd: process.cwd()
		});
	} catch (error) {
		console.error(`❌ Upload failed. Make sure you're authenticated with Cloudflare.`);
		console.error(`   Run: wrangler login`);
		process.exit(1);
	}
}

function main() {
	const { filePath, customName } = parseArgs();

	console.log(`\n📁 File: ${filePath}`);
	validateFile(filePath);

	const r2Key = generateR2Key(filePath, customName);
	uploadToR2(filePath, r2Key);

	const publicUrl = `${CDN_BASE}/${r2Key}`;

	console.log(`\n✅ Uploaded successfully!\n`);
	console.log(`Public URL:`);
	console.log(`${publicUrl}`);
	console.log(`\nHTML for email template:`);
	console.log(`<img src="${publicUrl}" alt="Description" style="width: 100%; border-radius: 8px;" />`);
	console.log(`\nResend template variable:`);
	console.log(`"IMAGE_URL": "${publicUrl}"`);
	console.log('');
}

main();
