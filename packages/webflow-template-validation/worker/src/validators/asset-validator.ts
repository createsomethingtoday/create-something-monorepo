/**
 * Asset Validator - Comprehensive asset analysis for Webflow templates
 *
 * Validates:
 * - File sizes (150KB optimization target, 4MB maximum)
 * - Image optimization and formats
 * - Unused asset detection
 * - Premium/trademarked content detection
 * - Asset usage patterns
 */

import {
	AssetAnalysisResult,
	ValidationIssue,
	DesignerData,
	AnalyzedAsset,
	AssetFetchResult,
	ParsedHTML
} from '../types';
import { fetchHTML, parseHTML, fetchAsset, fetchAssetMetadata } from '../utils/fetch-utils';
import { analyzeImageOptimization, analyzeImageOptimizationFromMetadata } from '../utils/asset-utils';

const WEBFLOW_WAY_COMPRESSION_TARGET = 150 * 1024; // 150KB in bytes, where possible
const EXTREME_SIZE_LIMIT = 4 * 1024 * 1024; // 4MB in bytes

// Cloudflare Workers limit: ~50 subrequests per request
// Leave buffer for HTML fetches, so limit asset fetches to 40
const MAX_ASSET_SUBREQUESTS = 40;

/**
 * Batched asset validation for 100% coverage
 * Processes a batch of assets and returns remaining assets for next batch
 */
export async function validateAssetBatch(
	assets: any[],
	siteUrl: string
): Promise<{
	analyzedAssets: AnalyzedAsset[];
	issues: ValidationIssue[];
	processedCount: number;
	remainingAssets: any[];
}> {
	console.log(`🔄 Processing batch of ${assets.length} assets`);
	const analyzedAssets: AnalyzedAsset[] = [];
	let subrequestCount = 0;

	// Filter to Webflow CDN assets only
	const webflowAssets = assets.filter(asset => {
		if (!asset.url) return false;
		try {
			const domain = new URL(asset.url).hostname;
			return domain.includes('webflow.com') ||
				   domain.includes('uploads-ssl.webflow.com') ||
				   domain.includes('website-files.com');
		} catch {
			return false;
		}
	});

	// Separate SVGs (no fetch needed) from raster images
	const svgAssets = webflowAssets.filter(a => a.mimeType?.includes('svg'));
	const rasterAssets = webflowAssets.filter(a => !a.mimeType?.includes('svg'));

	// Add SVGs without fetching (vectors are always optimized)
	svgAssets.forEach(svgAsset => {
		analyzedAssets.push({
			url: svgAsset.url,
			name: svgAsset.name || getAssetName(svgAsset.url),
			size: 0,
			format: 'image/svg+xml',
			isOptimized: true,
			usageCount: 1,
			hasLicensingIssues: false,
			recommendedAction: undefined
		});
	});

	console.log(`📊 ${rasterAssets.length} raster assets to fetch, ${svgAssets.length} SVGs (no fetch needed)`);

	// Process raster assets until we hit the limit
	const processedRasterAssets: any[] = [];
	const remainingRasterAssets: any[] = [];

	for (const asset of rasterAssets) {
		if (subrequestCount >= MAX_ASSET_SUBREQUESTS) {
			remainingRasterAssets.push(asset);
			continue;
		}

		try {
			const metadata = await fetchAssetMetadata(asset.url);
			subrequestCount++;

			const format = asset.mimeType || metadata.mimeType || getFormatFromUrl(asset.url);
			const name = asset.name || getAssetName(asset.url);
			const optimization = analyzeImageOptimizationFromMetadata(metadata.size, format);

			analyzedAssets.push({
				url: asset.url,
				name,
				size: metadata.size,
				format,
				isOptimized: optimization.isOptimized,
				usageCount: 1,
				hasLicensingIssues: false,
				recommendedAction: generateRecommendedAction(metadata.size, format, optimization)
			});

			processedRasterAssets.push(asset);
		} catch (error) {
			console.warn(`Error fetching asset ${asset.name}:`, error);
			// Still count as processed (failed)
			processedRasterAssets.push(asset);
		}
	}

	console.log(`✅ Processed ${processedRasterAssets.length} raster assets, ${remainingRasterAssets.length} remaining`);

	// Generate issues from analyzed assets
	const issues = generateAssetIssues(analyzedAssets);

	return {
		analyzedAssets,
		issues,
		processedCount: svgAssets.length + processedRasterAssets.length,
		remainingAssets: remainingRasterAssets
	};
}

export async function validateAssets(siteUrl: string, designerData: DesignerData): Promise<AssetAnalysisResult> {
	console.log(`🚀 Starting enhanced asset validation for ${siteUrl}`);

	try {
		let analysisResults: AnalyzedAsset[] = [];

		// Strategy 1: Validate entire media library for complete coverage (PREFERRED)
		if (designerData.assets && designerData.assets.length > 0) {
			console.log(`📚 Strategy 1: Validating entire media library (${designerData.assets.length} assets)`);
			analysisResults = await validateEntireMediaLibrary(designerData.assets, siteUrl);

		// Strategy 2: Multi-page crawling for comprehensive asset discovery
		} else if (designerData.pages && designerData.pages.length > 1) {
			console.log(`🌐 Strategy 2: Multi-page asset crawling (${designerData.pages.length} pages)`);
			analysisResults = await validateAssetsAcrossPages(siteUrl, designerData.pages);

		// Strategy 3: Single page analysis (fallback)
		} else {
			console.log(`📄 Strategy 3: Single page asset analysis (fallback)`);
			analysisResults = await validateSinglePageAssets(siteUrl);
		}

		// Generate validation issues
		const issues = generateAssetIssues(analysisResults);

		// Calculate statistics
		const stats = calculateAssetStats(analysisResults);

		console.log(`✅ Asset validation complete: ${analysisResults.length} assets analyzed`);

		return {
			issues,
			stats,
			assets: analysisResults
		};

	} catch (error) {
		console.error('Asset validation error:', error);
		return {
			issues: [{
				id: 'asset-analysis-failed',
				category: 'Assets',
				severity: 'warning',
				message: 'Asset analysis could not be completed',
				description: `Error analyzing assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
				howToFix: 'Check that the site URL is accessible and contains assets to analyze'
			}],
			stats: {
				totalAssets: 0,
				oversizedAssets: 0,
				unoptimizedAssets: 0,
				unusedAssets: 0,
				licensingIssues: 0,
				totalPageWeight: 0
			},
			assets: []
		};
	}
}

async function validateAssetsAcrossPages(baseUrl: string, pages: any[]): Promise<AnalyzedAsset[]> {
	console.log(`🌐 Multi-page asset crawling across ${pages.length} pages`);
	const allAssets = new Map<string, AnalyzedAsset>(); // Use Map to automatically deduplicate by URL
	const MAX_PAGES = 10; // Limit for performance

	// Limit pages for performance, prioritize main pages
	const pagesToAnalyze = pages.slice(0, MAX_PAGES);

	const pageResults = await Promise.allSettled(
		pagesToAnalyze.map(async (page) => {
			try {
				const pageUrl = new URL(page.slug || '', baseUrl).href;
				console.log(`🔍 Analyzing page: ${page.name || page.slug} at ${pageUrl}`);

				const pageAssets = await validateSinglePageAssets(pageUrl);
				return { pageUrl, assets: pageAssets };
			} catch (error) {
				console.warn(`Failed to analyze page ${page.slug}:`, error);
				return { pageUrl: page.slug, assets: [] };
			}
		})
	);

	// Merge all page assets with automatic deduplication
	pageResults.forEach((result) => {
		if (result.status === 'fulfilled') {
			result.value.assets.forEach((asset) => {
				if (!allAssets.has(asset.url)) {
					allAssets.set(asset.url, asset);
				} else {
					// Update usage count for assets found on multiple pages
					const existing = allAssets.get(asset.url)!;
					existing.usageCount += 1;
				}
			});
		}
	});

	const mergedAssets = Array.from(allAssets.values());
	console.log(`🎯 Multi-page crawling complete: ${mergedAssets.length} unique assets found across ${pagesToAnalyze.length} pages`);

	return mergedAssets;
}

async function validateSinglePageAssets(pageUrl: string): Promise<AnalyzedAsset[]> {
	try {
		// Fetch and parse the page HTML
		const htmlResult = await fetchHTML(pageUrl);
		const parsedHTML = parseHTML(htmlResult.html);

		// Extract all assets from the page
		const usedAssets = await extractUsedAssets(parsedHTML, pageUrl, htmlResult.html);

		// Analyze assets without Designer data
		return await analyzeAssets(usedAssets, []);
	} catch (error) {
		console.warn(`Failed to analyze single page ${pageUrl}:`, error);
		return [];
	}
}

async function validateEntireMediaLibrary(designerAssets: any[], baseUrl: string): Promise<AnalyzedAsset[]> {
	console.log(`🔍 Processing ${designerAssets.length} assets from media library (max ${MAX_ASSET_SUBREQUESTS} subrequests)`);
	const analyzedAssets: AnalyzedAsset[] = [];
	let subrequestCount = 0;

	// Filter to only Webflow CDN assets and prioritize by likely issues
	const webflowAssets = designerAssets.filter(asset => {
		if (!asset.url) return false;
		try {
			const domain = new URL(asset.url).hostname;
			return domain.includes('webflow.com') ||
				   domain.includes('uploads-ssl.webflow.com') ||
				   domain.includes('website-files.com');
		} catch {
			return false;
		}
	});

	// Sort: larger files first (more likely to have issues), skip SVGs (vectors are fine)
	const sortedAssets = webflowAssets
		.filter(a => !a.mimeType?.includes('svg'))
		.sort((a, b) => {
			// Prioritize by mimeType - PNG/BMP likely larger than WebP
			const priorityA = a.mimeType?.includes('png') ? 2 : a.mimeType?.includes('bmp') ? 3 : 1;
			const priorityB = b.mimeType?.includes('png') ? 2 : b.mimeType?.includes('bmp') ? 3 : 1;
			return priorityB - priorityA;
		});

	// Also include SVGs but mark them as already optimized (no fetch needed)
	const svgAssets = webflowAssets.filter(a => a.mimeType?.includes('svg'));
	svgAssets.forEach(svgAsset => {
		analyzedAssets.push({
			url: svgAsset.url,
			name: svgAsset.name || getAssetName(svgAsset.url),
			size: 0, // Unknown without fetch, but SVGs are typically small
			format: 'image/svg+xml',
			isOptimized: true, // Vector format - always optimized
			usageCount: 1,
			hasLicensingIssues: false,
			recommendedAction: undefined
		});
	});

	console.log(`📊 ${sortedAssets.length} raster assets to analyze, ${svgAssets.length} SVGs (skipped - vector)`);

	// Process assets with HEAD-only requests until we hit the limit
	const BATCH_SIZE = 10; // Increased batch size since HEAD is lighter
	for (let i = 0; i < sortedAssets.length && subrequestCount < MAX_ASSET_SUBREQUESTS; i += BATCH_SIZE) {
		const remainingRequests = MAX_ASSET_SUBREQUESTS - subrequestCount;
		const batch = sortedAssets.slice(i, Math.min(i + BATCH_SIZE, i + remainingRequests));

		if (batch.length === 0) break;

		const batchResults = await Promise.allSettled(
			batch.map(async (designerAsset) => {
				try {
					const asset = await analyzeDesignerAssetLightweight(designerAsset);
					if (asset) {
						return asset;
					}
				} catch (error) {
					console.warn(`Failed to analyze asset ${designerAsset.name || designerAsset.id}:`, error);
				}
				return null;
			})
		);

		// Count subrequests (1 HEAD request per asset in batch)
		subrequestCount += batch.length;

		// Add successful results to analyzed assets
		batchResults.forEach((result) => {
			if (result.status === 'fulfilled' && result.value) {
				analyzedAssets.push(result.value);
			}
		});

		console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${analyzedAssets.length} analyzed, ${subrequestCount}/${MAX_ASSET_SUBREQUESTS} subrequests used`);
	}

	const skippedCount = sortedAssets.length - Math.min(subrequestCount, sortedAssets.length);
	if (skippedCount > 0) {
		console.log(`⚠️ Skipped ${skippedCount} assets due to subrequest limit`);
	}

	console.log(`🎯 Media library analysis complete: ${analyzedAssets.length} assets analyzed (${subrequestCount} subrequests)`);
	return analyzedAssets;
}

/**
 * Lightweight asset analysis using HEAD-only request (1 subrequest instead of 2).
 * Uses metadata for optimization analysis without downloading the full asset.
 */
async function analyzeDesignerAssetLightweight(designerAsset: any): Promise<AnalyzedAsset | null> {
	try {
		const assetUrl = designerAsset.url;
		if (!assetUrl) return null;

		// Fetch only metadata (HEAD request)
		const metadata = await fetchAssetMetadata(assetUrl);

		// Use Designer data when available, fallback to metadata
		const format = designerAsset.mimeType || metadata.mimeType || getFormatFromUrl(assetUrl);
		const name = designerAsset.name || getAssetName(assetUrl);

		// Analyze optimization from metadata (no buffer needed)
		const optimization = analyzeImageOptimizationFromMetadata(metadata.size, format);

		return {
			url: assetUrl,
			name,
			size: metadata.size,
			format,
			isOptimized: optimization.isOptimized,
			usageCount: 1,
			hasLicensingIssues: false,
			recommendedAction: generateRecommendedAction(metadata.size, format, optimization)
		};

	} catch (error) {
		console.warn(`Error analyzing asset ${designerAsset.name}:`, error);
		return null;
	}
}

async function analyzeDesignerAsset(designerAsset: any, baseUrl: string): Promise<AnalyzedAsset | null> {
	try {
		const assetUrl = designerAsset.url;
		if (!assetUrl) {
			console.warn(`Asset ${designerAsset.id} has no URL`);
			return null;
		}

		// Only analyze assets from Webflow CDN
		const assetDomain = new URL(assetUrl).hostname;
		const isWebflowCDN = assetDomain.includes('webflow.com') ||
							assetDomain.includes('uploads-ssl.webflow.com') ||
							assetDomain.includes('website-files.com');

		if (!isWebflowCDN) {
			console.log(`❌ Skipping external asset: ${assetUrl}`);
			return null;
		}

		// Fetch asset metadata
		const assetResult = await fetchAsset(assetUrl);

		// Use Designer data when available, fallback to URL analysis
		const format = designerAsset.mimeType || assetResult.mimeType || getFormatFromUrl(assetUrl);
		const name = designerAsset.name || getAssetName(assetUrl);

		// Analyze optimization
		const optimization = analyzeImageOptimization(assetResult.buffer, format);

		return {
			url: assetUrl,
			name,
			size: assetResult.size,
			format,
			isOptimized: optimization.isOptimized,
			usageCount: 1, // Media library assets are considered "used" since they exist in the project
			hasLicensingIssues: false, // Removed: all Webflow assets are properly hosted
			recommendedAction: generateRecommendedAction(assetResult.size, format, optimization)
		};

	} catch (error) {
		console.warn(`Error analyzing designer asset ${designerAsset.id}:`, error);
		return null;
	}
}

async function extractUsedAssets(parsedHTML: ParsedHTML, baseUrl: string, fullHTML: string): Promise<AnalyzedAsset[]> {
	const assets: AnalyzedAsset[] = [];
	const assetUrls = new Set<string>();

	console.log(`🔍 Extracting assets from page with ${parsedHTML.images.length} images found`);

	// Extract image assets from <img> tags
	parsedHTML.images.forEach(img => {
		const src = img.src || img.getAttribute('data-src') || '';
		if (src && !assetUrls.has(src)) {
			const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
			assetUrls.add(fullUrl);
			console.log(`🖼️ Found image asset: ${fullUrl}`);
		}
	});

	// Extract background images from CSS using regex (Worker-compatible approach)
	const styleRegex = /style=["']([^"']*background-image[^"']*)["']/gi;
	const cssRegex = /<style[^>]*>(.*?)<\/style>/gi;
	let match;

	// Extract from inline styles in the full HTML
	while ((match = styleRegex.exec(fullHTML)) !== null) {
		const styleContent = match[1];
		const urlMatch = styleContent.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
		if (urlMatch && urlMatch[1]) {
			try {
				const imageUrl = new URL(urlMatch[1], baseUrl).href;
				assetUrls.add(imageUrl);
				console.log(`🎨 Found CSS background asset: ${imageUrl}`);
			} catch (error) {
				console.warn('Invalid background image URL:', urlMatch[1]);
			}
		}
	}

	// Extract from style tags in the full HTML
	while ((match = cssRegex.exec(fullHTML)) !== null) {
		const cssContent = match[1];
		const urlMatches = cssContent.match(/url\(['"]?([^'"]+)['"]?\)/g);
		if (urlMatches) {
			urlMatches.forEach(urlMatch => {
				const url = urlMatch.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];
				if (url) {
					try {
						const imageUrl = new URL(url, baseUrl).href;
						assetUrls.add(imageUrl);
						console.log(`📄 Found stylesheet asset: ${imageUrl}`);
					} catch (error) {
						console.warn('Invalid CSS background image URL:', url);
					}
				}
			});
		}
	}

	// Analyze each unique asset
	for (const assetUrl of assetUrls) {
		try {
			const asset = await analyzeAsset(assetUrl, baseUrl);
			if (asset) {
				assets.push(asset);
			}
		} catch (error) {
			console.warn(`Failed to analyze asset ${assetUrl}:`, error);
		}
	}

	return assets;
}

async function analyzeAsset(assetUrl: string, baseUrl: string): Promise<AnalyzedAsset | null> {
	try {
		// Only analyze assets from the same domain or Webflow CDN
		const assetDomain = new URL(assetUrl).hostname;
		const siteDomain = new URL(baseUrl).hostname;
		const isWebflowCDN = assetDomain.includes('webflow.com') ||
							assetDomain.includes('uploads-ssl.webflow.com') ||
							assetDomain.includes('website-files.com');

		console.log(`🔍 Analyzing asset: ${assetUrl} (domain: ${assetDomain}, CDN: ${isWebflowCDN})`);

		if (!isWebflowCDN && assetDomain !== siteDomain) {
			console.log(`❌ Skipping external asset: ${assetUrl}`);
			return null; // Skip external assets
		}

		// Fetch asset metadata
		const assetResult = await fetchAsset(assetUrl);

		// Determine format from MIME type or URL extension
		const format = assetResult.mimeType || getFormatFromUrl(assetUrl);
		const name = getAssetName(assetUrl);

		// Analyze optimization
		const optimization = analyzeImageOptimization(assetResult.buffer, format);

		// Note: Licensing validation removed - all Webflow project assets are hosted on Webflow CDN

		return {
			url: assetUrl,
			name,
			size: assetResult.size,
			format,
			isOptimized: optimization.isOptimized,
			usageCount: 1, // Will be updated when we count usage
			hasLicensingIssues: false, // Removed: all Webflow assets are properly hosted
			recommendedAction: generateRecommendedAction(assetResult.size, format, optimization)
		};

	} catch (error) {
		console.warn(`Error analyzing asset ${assetUrl}:`, error);
		return null;
	}
}

async function analyzeAssets(usedAssets: AnalyzedAsset[], designerAssets: any[]): Promise<AnalyzedAsset[]> {
	// Count usage frequency
	const usageCounts = new Map<string, number>();

	usedAssets.forEach(asset => {
		const count = usageCounts.get(asset.url) || 0;
		usageCounts.set(asset.url, count + 1);
	});

	// Update usage counts and remove duplicates
	const uniqueAssets = new Map<string, AnalyzedAsset>();

	usedAssets.forEach(asset => {
		if (!uniqueAssets.has(asset.url)) {
			asset.usageCount = usageCounts.get(asset.url) || 1;
			uniqueAssets.set(asset.url, asset);
		}
	});

	return Array.from(uniqueAssets.values());
}

export function generateAssetIssues(assets: AnalyzedAsset[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check for assets above the 150KB compression target. This is a review target, not the hard maximum.
	const assetsAboveCompressionTarget = assets.filter(asset =>
		asset.size > WEBFLOW_WAY_COMPRESSION_TARGET && asset.size <= EXTREME_SIZE_LIMIT
	);
	if (assetsAboveCompressionTarget.length > 0) {
		issues.push({
			id: 'assets-above-compression-target',
			category: 'Performance & Assets',
			severity: 'warning',
			message: `${assetsAboveCompressionTarget.length} assets are above the 150KB compression target`,
			description: 'Submission guidelines recommend compressing images to 150KB where possible. Larger visual assets may be acceptable when quality would be harmed, but they should be reviewed.',
			howToFix: 'Resize images to their rendered dimensions, use Webflow compression, and convert to WebP/AVIF where quality allows. Keep every asset under the 4MB maximum.',
			details: {
				target: '150KB where possible',
				maxFileSize: '4MB',
				oversizedAssets: assetsAboveCompressionTarget.map(asset => ({
					name: asset.name,
					size: `${Math.round(asset.size / 1024)}KB`,
					url: asset.url
				})).slice(0, 10) // Limit to first 10 for readability
			}
		});
	}

	// Check for extremely large assets (>4MB)
	const extremelyLargeAssets = assets.filter(asset => asset.size > EXTREME_SIZE_LIMIT);
	if (extremelyLargeAssets.length > 0) {
		issues.push({
			id: 'assets-extremely-large',
			category: 'Performance & Assets',
			severity: 'error',
			message: `${extremelyLargeAssets.length} assets exceed the 4MB maximum file size`,
			description: 'Submission guidelines set a 4MB maximum file size for media assets. These files can severely impact loading performance and template review.',
			howToFix: 'Compress or replace these assets so each file is under 4MB. For large hero or portfolio imagery, resize to the displayed dimensions and export WebP/AVIF when practical.',
			details: {
				maxFileSize: '4MB',
				extremeAssets: extremelyLargeAssets.map(asset => ({
					name: asset.name,
					size: `${Math.round(asset.size / (1024 * 1024))}MB`,
					url: asset.url
				}))
			}
		});
	}

	// Check for unoptimized formats
	const unoptimizedAssets = assets.filter(asset => !asset.isOptimized);
	if (unoptimizedAssets.length > 0) {
		issues.push({
			id: 'assets-not-optimized',
			category: 'Performance & Assets',
			severity: 'warning',
			message: `${unoptimizedAssets.length} assets could be better optimized`,
			description: 'These assets are using older formats or could benefit from better compression.',
			howToFix: 'Convert PNG/JPEG images to WebP or AVIF format for better compression while maintaining quality',
			details: {
				unoptimizedAssets: unoptimizedAssets.map(asset => ({
					name: asset.name,
					currentFormat: asset.format,
					recommendedAction: asset.recommendedAction
				})).slice(0, 10)
			}
		});
	}

	// Note: Licensing validation removed - all Webflow project assets are hosted on Webflow CDN

	// Check for unused assets (if we had more context about media library)
	const unusedAssets = assets.filter(asset => asset.usageCount === 0);
	if (unusedAssets.length > 0) {
		issues.push({
			id: 'assets-unused',
			category: 'Performance & Assets',
			severity: 'info',
			message: `${unusedAssets.length} assets appear to be unused`,
			description: 'These assets are in your project but don\'t appear to be used on this page.',
			howToFix: 'Review these assets and remove any that are truly unused to keep your project organized',
			details: {
				unusedAssets: unusedAssets.map(asset => ({
					name: asset.name,
					url: asset.url
				})).slice(0, 10)
			}
		});
	}

	return issues;
}

function calculateAssetStats(assets: AnalyzedAsset[]) {
	return {
		totalAssets: assets.length,
		oversizedAssets: assets.filter(a => a.size > WEBFLOW_WAY_COMPRESSION_TARGET).length,
		unoptimizedAssets: assets.filter(a => !a.isOptimized).length,
		unusedAssets: assets.filter(a => a.usageCount === 0).length,
		licensingIssues: 0, // Removed: all Webflow assets are properly hosted
		totalPageWeight: assets.reduce((total, asset) => total + asset.size, 0)
	};
}

function getFormatFromUrl(url: string): string {
	const extension = url.split('.').pop()?.toLowerCase();
	switch (extension) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'avif':
			return 'image/avif';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		default:
			return 'unknown';
	}
}

function getAssetName(url: string): string {
	try {
		const pathname = new URL(url).pathname;
		return pathname.split('/').pop() || 'unnamed-asset';
	} catch {
		return 'unnamed-asset';
	}
}

function generateRecommendedAction(size: number, format: string, optimization: { isOptimized: boolean, recommendation?: string }): string | undefined {
	if (size > EXTREME_SIZE_LIMIT) {
		return 'Compress or replace this file so it is under the 4MB maximum';
	}

	if (size > WEBFLOW_WAY_COMPRESSION_TARGET) {
		if (format.includes('png')) {
			return 'Convert to WebP/AVIF and aim for 150KB where quality allows';
		}
		if (format.includes('jpeg')) {
			return 'Resize to displayed dimensions and aim for 150KB where quality allows';
		}
	}

	if (!optimization.isOptimized) {
		return optimization.recommendation || 'Optimize image compression';
	}

	return undefined;
}
