/**
 * Asset Utilities - Asset analysis and optimization detection
 */

const LICENSING_PATTERNS = [
	/shutterstock/i,
	/getty/i,
	/istockphoto/i,
	/adobe.*stock/i,
	/dreamstime/i,
	/bigstock/i,
	/stockphoto/i,
	/depositphotos/i,
	/123rf/i,
	/alamy/i,
	/watermark/i
];

const OPTIMAL_FORMATS = ['webp', 'avif'];
const GOOD_FORMATS = ['jpeg', 'jpg', 'png'];
const OUTDATED_FORMATS = ['bmp', 'tiff', 'tif'];

export function detectLicensingIssues(fileName: string, url: string): { hasIssues: boolean; issues: string[] } {
	const issues: string[] = [];

	// Check filename and URL for stock photo patterns
	const fullText = `${fileName} ${url}`.toLowerCase();

	LICENSING_PATTERNS.forEach(pattern => {
		if (pattern.test(fullText)) {
			const service = pattern.source.replace(/\\/g, '').replace(/\.\*/g, ' ');
			issues.push(`Potential ${service} stock photo detected`);
		}
	});

	// Check for suspicious naming patterns
	if (/\d{8,}/.test(fileName)) {
		issues.push('File name suggests stock photo ID number');
	}

	if (/watermark|preview|sample/i.test(fullText)) {
		issues.push('File appears to be watermarked or sample content');
	}

	return {
		hasIssues: issues.length > 0,
		issues
	};
}

/**
 * Lightweight optimization analysis using only metadata (no buffer download).
 * Saves 1 subrequest per asset by using HEAD instead of GET.
 */
export function analyzeImageOptimizationFromMetadata(
	size: number,
	mimeType: string
): { isOptimized: boolean; recommendation?: string; analysis: any } {
	const format = mimeType.toLowerCase();

	let isOptimized = false;
	let recommendation: string | undefined;

	// SVG is always considered optimized (vector)
	if (format.includes('svg')) {
		return {
			isOptimized: true,
			recommendation: undefined,
			analysis: {
				format,
				size,
				sizeCategory: getSizeCategory(size),
				formatCategory: 'optimal',
				compressionEstimate: { potential: 'none', estimated_savings: 'Vector format - no compression needed' }
			}
		};
	}

	// Basic format analysis
	if (OPTIMAL_FORMATS.some(fmt => format.includes(fmt))) {
		isOptimized = true;
	} else if (GOOD_FORMATS.some(fmt => format.includes(fmt))) {
		if (size < 100 * 1024) {
			isOptimized = true;
		} else {
			recommendation = `Consider converting to WebP format for ${Math.round((1 - 0.7) * 100)}% size reduction`;
		}
	} else if (OUTDATED_FORMATS.some(fmt => format.includes(fmt))) {
		recommendation = 'Convert to modern format (WebP or JPEG/PNG)';
	}

	// Size-based optimization analysis
	if (size > 500 * 1024) {
		isOptimized = false;
		if (!recommendation) {
			recommendation = 'Image is very large - compress or resize';
		}
	}

	const analysis = {
		format,
		size,
		sizeCategory: getSizeCategory(size),
		formatCategory: getFormatCategory(format),
		compressionEstimate: estimateCompression(size, format)
	};

	return {
		isOptimized,
		recommendation,
		analysis
	};
}

export function analyzeImageOptimization(
	buffer: ArrayBuffer,
	mimeType: string
): { isOptimized: boolean; recommendation?: string; analysis: any } {

	const size = buffer.byteLength;
	const format = mimeType.toLowerCase();

	let isOptimized = false;
	let recommendation: string | undefined;

	// SVG is a vector format. It should never receive raster conversion guidance.
	if (format.includes('svg')) {
		return {
			isOptimized: true,
			recommendation: undefined,
			analysis: {
				format: format,
				size: size,
				sizeCategory: getSizeCategory(size),
				formatCategory: 'optimal',
				compressionEstimate: { potential: 'none', estimated_savings: 'Vector format - no raster compression needed' }
			}
		};
	}

	// Basic format analysis
	if (OPTIMAL_FORMATS.some(fmt => format.includes(fmt))) {
		isOptimized = true;
	} else if (GOOD_FORMATS.some(fmt => format.includes(fmt))) {
		// JPEG/PNG can be optimized but might be acceptable
		if (size < 100 * 1024) { // Under 100KB
			isOptimized = true;
		} else {
			recommendation = `Consider converting to WebP format for ${Math.round((1 - 0.7) * 100)}% size reduction`;
		}
	} else if (OUTDATED_FORMATS.some(fmt => format.includes(fmt))) {
		recommendation = 'Convert to modern format (WebP or JPEG/PNG)';
	}

	// Size-based optimization analysis
	if (size > 500 * 1024) { // Over 500KB
		isOptimized = false;
		if (!recommendation) {
			recommendation = 'Image is very large - compress or resize';
		}
	}

	// Advanced analysis would examine the actual image data
	// This is a simplified version for demonstration
	const analysis = {
		format: format,
		size: size,
		sizeCategory: getSizeCategory(size),
		formatCategory: getFormatCategory(format),
		compressionEstimate: estimateCompression(size, format)
	};

	return {
		isOptimized,
		recommendation,
		analysis
	};
}

function getSizeCategory(size: number): string {
	if (size < 50 * 1024) return 'small'; // Under 50KB
	if (size < 150 * 1024) return 'medium'; // Under 150KB (Webflow Way limit)
	if (size < 500 * 1024) return 'large'; // Under 500KB
	return 'very-large'; // Over 500KB
}

function getFormatCategory(mimeType: string): string {
	if (OPTIMAL_FORMATS.some(fmt => mimeType.includes(fmt))) return 'optimal';
	if (GOOD_FORMATS.some(fmt => mimeType.includes(fmt))) return 'good';
	if (OUTDATED_FORMATS.some(fmt => mimeType.includes(fmt))) return 'outdated';
	return 'unknown';
}

function estimateCompression(size: number, mimeType: string): { potential: string; estimated_savings: string } {
	// Rough estimates based on typical compression ratios
	if (mimeType.includes('png')) {
		return {
			potential: 'high',
			estimated_savings: '30-70% by converting to WebP'
		};
	}

	if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
		return {
			potential: 'medium',
			estimated_savings: '20-40% by converting to WebP'
		};
	}

	if (size > 150 * 1024) {
		return {
			potential: 'high',
			estimated_savings: 'Resize or compress to meet 150KB limit'
		};
	}

	return {
		potential: 'low',
		estimated_savings: 'Already well optimized'
	};
}

export function analyzeAssetUsage(assetUrl: string, htmlContent: string): { usageCount: number; contexts: string[] } {
	const contexts: string[] = [];
	let usageCount = 0;

	// Count direct image src references
	const imgSrcRegex = new RegExp(`src=["']([^"']*${escapeRegex(assetUrl)}[^"']*)["']`, 'gi');
	const imgMatches = htmlContent.match(imgSrcRegex);
	if (imgMatches) {
		usageCount += imgMatches.length;
		contexts.push(`img src (${imgMatches.length})`);
	}

	// Count background-image CSS references
	const bgImageRegex = new RegExp(`background-image:\\s*url\\(["']?([^"']*${escapeRegex(assetUrl)}[^"']*)["']?\\)`, 'gi');
	const bgMatches = htmlContent.match(bgImageRegex);
	if (bgMatches) {
		usageCount += bgMatches.length;
		contexts.push(`background-image (${bgMatches.length})`);
	}

	// Count data-src references (lazy loading)
	const dataSrcRegex = new RegExp(`data-src=["']([^"']*${escapeRegex(assetUrl)}[^"']*)["']`, 'gi');
	const dataMatches = htmlContent.match(dataSrcRegex);
	if (dataMatches) {
		usageCount += dataMatches.length;
		contexts.push(`data-src (${dataMatches.length})`);
	}

	return {
		usageCount,
		contexts
	};
}

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function calculateTotalPageWeight(assets: Array<{ size: number }>): number {
	return assets.reduce((total, asset) => total + asset.size, 0);
}

export function identifyLargestAssets(assets: Array<{ name: string; size: number; url: string }>, count: number = 5) {
	return assets
		.sort((a, b) => b.size - a.size)
		.slice(0, count)
		.map(asset => ({
			...asset,
			sizeFormatted: formatBytes(asset.size),
			percentOfTotal: 0 // Would be calculated with total page weight
		}));
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
