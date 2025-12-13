#!/usr/bin/env node

/**
 * Upload Template Assets to R2
 *
 * Builds and uploads vertical templates to R2 for multi-tenant serving.
 * Supports versioning: each upload creates a version directory.
 *
 * Usage:
 *   node scripts/upload-template-assets.mjs [options]
 *
 * Options:
 *   --template <id>    Upload only this template (default: all)
 *   --version <ver>    Version to tag (default: from package.json)
 *   --latest           Mark this version as "latest" (default: true)
 *   --skip-build       Skip build step, upload existing build
 *
 * R2 Structure:
 *   templates-site-assets/
 *   ├── tpl_professional_services/
 *   │   ├── 1.0.0/
 *   │   │   ├── index.html
 *   │   │   ├── _app/immutable/...
 *   │   │   └── manifest.json
 *   │   ├── 1.1.0/
 *   │   │   └── ...
 *   │   └── latest/  (symlink-like: copy of current latest)
 *   └── tpl_architecture_studio/
 *       └── ...
 *
 * Canon: Less, but better. One build, unlimited tenants.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TEMPLATES = {
	tpl_professional_services: {
		packagePath: 'packages/verticals/professional-services',
		buildOutput: '.svelte-kit/cloudflare'
	},
	tpl_architecture_studio: {
		packagePath: 'packages/verticals/architecture-studio',
		buildOutput: '.svelte-kit/cloudflare'
	},
	tpl_creative_agency: {
		packagePath: 'packages/verticals/creative-agency',
		buildOutput: '.svelte-kit/cloudflare'
	},
	tpl_creative_portfolio: {
		packagePath: 'packages/verticals/creative-portfolio',
		buildOutput: '.svelte-kit/cloudflare'
	}
};

const R2_BUCKET = 'templates-site-assets';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs() {
	const args = process.argv.slice(2);
	const options = {
		template: null,
		version: null,
		latest: true,
		skipBuild: false
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--template':
				options.template = args[++i];
				break;
			case '--version':
				options.version = args[++i];
				break;
			case '--latest':
				options.latest = true;
				break;
			case '--no-latest':
				options.latest = false;
				break;
			case '--skip-build':
				options.skipBuild = true;
				break;
		}
	}

	return options;
}

function getPackageVersion(packagePath) {
	const pkgPath = path.join(packagePath, 'package.json');
	if (fs.existsSync(pkgPath)) {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
		return pkg.version || '1.0.0';
	}
	return '1.0.0';
}

function computeHash(filePath) {
	const content = fs.readFileSync(filePath);
	return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function getAllFiles(dir, baseDir = dir) {
	const files = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...getAllFiles(fullPath, baseDir));
		} else {
			files.push({
				localPath: fullPath,
				relativePath: path.relative(baseDir, fullPath)
			});
		}
	}

	return files;
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
	const options = parseArgs();
	const rootDir = process.cwd();

	console.log('📦 Template Asset Uploader\n');
	console.log('R2 Bucket:', R2_BUCKET);
	console.log('Version:', options.version || 'auto-detect');
	console.log('Mark as latest:', options.latest);
	console.log('');

	// Filter templates if specific one requested
	const templatesToUpload = options.template
		? { [options.template]: TEMPLATES[options.template] }
		: TEMPLATES;

	if (options.template && !TEMPLATES[options.template]) {
		console.error(`❌ Unknown template: ${options.template}`);
		console.error('Available:', Object.keys(TEMPLATES).join(', '));
		process.exit(1);
	}

	for (const [templateId, config] of Object.entries(templatesToUpload)) {
		console.log(`\n${'═'.repeat(60)}`);
		console.log(`📁 ${templateId}`);
		console.log('═'.repeat(60));

		const packagePath = path.join(rootDir, config.packagePath);
		const buildPath = path.join(packagePath, config.buildOutput);

		// Get version
		const version = options.version || getPackageVersion(packagePath);
		console.log(`Version: ${version}`);

		// Build if needed
		if (!options.skipBuild) {
			console.log('\n🔨 Building...');
			try {
				execSync(`pnpm build`, {
					cwd: packagePath,
					stdio: 'inherit'
				});
			} catch (error) {
				console.error(`❌ Build failed for ${templateId}`);
				continue;
			}
		}

		// Check build output exists
		if (!fs.existsSync(buildPath)) {
			console.error(`❌ Build output not found: ${buildPath}`);
			continue;
		}

		// Get all files
		const files = getAllFiles(buildPath);
		console.log(`\n📊 Found ${files.length} files`);

		// Calculate total size
		let totalSize = 0;
		for (const file of files) {
			totalSize += fs.statSync(file.localPath).size;
		}
		console.log(`Total size: ${formatBytes(totalSize)}`);

		// Generate manifest
		const manifest = {
			templateId,
			version,
			buildDate: new Date().toISOString(),
			fileCount: files.length,
			totalSizeBytes: totalSize,
			files: files.map((f) => ({
				path: f.relativePath,
				size: fs.statSync(f.localPath).size,
				hash: computeHash(f.localPath)
			}))
		};

		// Compute overall build hash
		const buildHash = crypto
			.createHash('sha256')
			.update(JSON.stringify(manifest.files.map((f) => f.hash)))
			.digest('hex')
			.slice(0, 16);
		manifest.buildHash = buildHash;

		console.log(`Build hash: ${buildHash}`);

		// Upload to R2
		console.log(`\n☁️  Uploading to R2...`);

		// Upload versioned files
		const versionPrefix = `${templateId}/${version}`;
		let uploaded = 0;

		for (const file of files) {
			const r2Key = `${versionPrefix}/${file.relativePath}`;

			try {
				execSync(
					`wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${file.localPath}" --content-type="${getContentType(file.relativePath)}"`,
					{ stdio: 'pipe' }
				);
				uploaded++;
				process.stdout.write(`\r  Uploaded: ${uploaded}/${files.length}`);
			} catch (error) {
				console.error(`\n  ❌ Failed to upload: ${file.relativePath}`);
			}
		}

		// Upload manifest
		const manifestPath = path.join(packagePath, 'manifest.json');
		fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
		execSync(
			`wrangler r2 object put "${R2_BUCKET}/${versionPrefix}/manifest.json" --file="${manifestPath}" --content-type="application/json"`,
			{ stdio: 'pipe' }
		);
		fs.unlinkSync(manifestPath);

		console.log(`\n  ✓ Uploaded ${uploaded + 1} files to ${versionPrefix}/`);

		// Copy to "latest" if requested
		if (options.latest) {
			console.log('\n📌 Marking as latest...');
			const latestPrefix = `${templateId}/latest`;

			for (const file of files) {
				const sourceKey = `${versionPrefix}/${file.relativePath}`;
				const destKey = `${latestPrefix}/${file.relativePath}`;

				try {
					// R2 doesn't have copy command, so we re-upload
					execSync(
						`wrangler r2 object put "${R2_BUCKET}/${destKey}" --file="${file.localPath}" --content-type="${getContentType(file.relativePath)}"`,
						{ stdio: 'pipe' }
					);
				} catch (error) {
					// Ignore errors for latest copy
				}
			}

			// Upload manifest to latest
			const latestManifest = { ...manifest, isLatest: true };
			const latestManifestPath = path.join(packagePath, 'latest-manifest.json');
			fs.writeFileSync(latestManifestPath, JSON.stringify(latestManifest, null, 2));
			execSync(
				`wrangler r2 object put "${R2_BUCKET}/${latestPrefix}/manifest.json" --file="${latestManifestPath}" --content-type="application/json"`,
				{ stdio: 'pipe' }
			);
			fs.unlinkSync(latestManifestPath);

			console.log(`  ✓ Copied to ${latestPrefix}/`);
		}

		console.log(`\n✅ ${templateId} uploaded successfully`);
	}

	console.log('\n\n🎉 All templates uploaded!');
	console.log(`\nNext steps:`);
	console.log(`  1. Run database migration: wrangler d1 migrations apply templates-platform-db`);
	console.log(`  2. Deploy router Worker: cd packages/templates-platform/workers/router && wrangler deploy`);
	console.log(`  3. Configure DNS: *.createsomething.space → templates-router.workers.dev`);
}

function getContentType(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	const types = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'application/javascript',
		'.mjs': 'application/javascript',
		'.json': 'application/json',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.avif': 'image/avif',
		'.svg': 'image/svg+xml',
		'.ico': 'image/x-icon',
		'.woff2': 'font/woff2',
		'.woff': 'font/woff',
		'.ttf': 'font/ttf',
		'.txt': 'text/plain',
		'.xml': 'application/xml'
	};
	return types[ext] || 'application/octet-stream';
}

main().catch(console.error);
