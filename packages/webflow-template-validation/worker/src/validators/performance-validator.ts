/**
 * Performance Validator - Page performance and optimization analysis
 *
 * Validates:
 * - Page load speed and metrics
 * - Resource optimization
 * - Render blocking resources
 * - Core Web Vitals estimation
 */

import {
	PerformanceAnalysisResult,
	ValidationIssue,
	PerformanceMetrics,
	ParsedHTML
} from '../types';
import { fetchHTML, parseHTML } from '../utils/fetch-utils';

const PERFORMANCE_THRESHOLDS = {
	pageWeightWarning: 1 * 1024 * 1024, // 1MB
	pageWeightError: 3 * 1024 * 1024,   // 3MB
	loadTimeWarning: 3000, // 3 seconds
	loadTimeError: 5000,   // 5 seconds
	imageCountWarning: 20,
	imageCountError: 50,
	scriptCountWarning: 10,
	scriptCountError: 20
};

export async function validatePerformance(siteUrl: string): Promise<PerformanceAnalysisResult> {
	console.log(`Starting performance validation for ${siteUrl}`);

	try {
		// Fetch and parse the homepage
		const htmlResult = await fetchHTML(siteUrl);
		const parsedHTML = parseHTML(htmlResult.html);

		// Analyze performance metrics
		const metrics = await analyzePerformanceMetrics(siteUrl, htmlResult, parsedHTML);

		// Generate performance issues
		const issues = generatePerformanceIssues(metrics, parsedHTML);

		// Calculate performance statistics
		const stats = calculatePerformanceStats(metrics, parsedHTML);

		return {
			issues,
			stats,
			metrics
		};

	} catch (error) {
		console.error('Performance validation error:', error);
		return {
			issues: [{
				id: 'performance-analysis-failed',
				category: 'Performance & Optimization',
				severity: 'warning',
				message: 'Performance analysis could not be completed',
				description: `Error analyzing performance: ${error instanceof Error ? error.message : 'Unknown error'}`,
				howToFix: 'Check that the site URL is accessible for performance analysis'
			}],
			stats: {
				totalPageWeight: 0,
				renderBlockingResources: 0,
				lazyLoadingImplemented: false,
				averageLoadTime: 0
			},
			metrics: createEmptyMetrics()
		};
	}
}

async function analyzePerformanceMetrics(siteUrl: string, htmlResult: any, parsedHTML: ParsedHTML): Promise<PerformanceMetrics> {
	const startTime = Date.now();

	// Estimate page weight from HTML and resources
	const estimatedPageWeight = await estimatePageWeight(parsedHTML, siteUrl);

	// Analyze resource counts
	const resourceCounts = {
		images: parsedHTML.images.length,
		scripts: parsedHTML.scripts.length,
		stylesheets: parsedHTML.stylesheets.length,
		fonts: await countFontResources(parsedHTML)
	};

	// Estimate performance metrics (simplified for demo)
	// In production, you'd use tools like Lighthouse API or PageSpeed Insights
	const estimatedFCP = estimateFirstContentfulPaint(htmlResult.loadTime, resourceCounts);
	const estimatedLCP = estimateLargestContentfulPaint(estimatedFCP, parsedHTML.images.length);
	const estimatedCLS = estimateCumulativeLayoutShift(parsedHTML);
	const estimatedTBT = estimateTotalBlockingTime(parsedHTML.scripts.length);

	return {
		firstContentfulPaint: estimatedFCP,
		largestContentfulPaint: estimatedLCP,
		cumulativeLayoutShift: estimatedCLS,
		totalBlockingTime: estimatedTBT,
		pageWeight: estimatedPageWeight,
		resourceCounts
	};
}

async function estimatePageWeight(parsedHTML: ParsedHTML, baseUrl: string): Promise<number> {
	let totalWeight = 0;

	// Estimate HTML size (we already have this)
	totalWeight += new Blob([parsedHTML.document.documentElement?.outerHTML || '']).size;

	// Estimate CSS weight (rough approximation)
	totalWeight += parsedHTML.stylesheets.length * 50 * 1024; // ~50KB per stylesheet

	// Estimate JS weight (rough approximation)
	totalWeight += parsedHTML.scripts.filter(s => s.src).length * 100 * 1024; // ~100KB per external script

	// For images, we'd need to fetch each one for accurate size
	// For now, estimate based on count and typical sizes
	totalWeight += parsedHTML.images.length * 200 * 1024; // ~200KB per image (conservative estimate)

	return totalWeight;
}

function estimateFirstContentfulPaint(initialLoadTime: number, resourceCounts: any): number {
	// Basic estimation based on resource count and initial load time
	const baseTime = initialLoadTime;
	const resourcePenalty = (resourceCounts.stylesheets * 200) + (resourceCounts.scripts * 100);
	return baseTime + resourcePenalty;
}

function estimateLargestContentfulPaint(fcp: number, imageCount: number): number {
	// LCP typically happens after FCP, influenced by image loading
	const imagePenalty = Math.min(imageCount * 100, 1000); // Max 1 second penalty for images
	return fcp + 500 + imagePenalty; // Base +500ms after FCP
}

function estimateCumulativeLayoutShift(parsedHTML: ParsedHTML): number {
	// Estimate CLS based on images without dimensions and other factors
	let clsScore = 0;

	// Check for images without width/height attributes
	const imagesWithoutDimensions = parsedHTML.images.filter(img =>
		!img.getAttribute('width') && !img.getAttribute('height')
	).length;

	clsScore += imagesWithoutDimensions * 0.05; // 0.05 CLS penalty per image without dimensions

	// Check for web fonts (can cause layout shift)
	const hasWebFonts = parsedHTML.document.documentElement?.outerHTML.includes('@font-face') ||
		parsedHTML.stylesheets.some(link => link.href?.includes('fonts.'));

	if (hasWebFonts) {
		clsScore += 0.1; // Base penalty for web fonts
	}

	return Math.min(clsScore, 0.5); // Cap at 0.5 (which would be very poor)
}

function estimateTotalBlockingTime(scriptCount: number): number {
	// Estimate blocking time based on script count
	// Each script might block for ~50-200ms
	return Math.min(scriptCount * 75, 2000); // Cap at 2 seconds
}

async function countFontResources(parsedHTML: ParsedHTML): Promise<number> {
	let fontCount = 0;

	// Check for Google Fonts or other font links
	parsedHTML.stylesheets.forEach(link => {
		const href = link.getAttribute('href') || '';
		if (href.includes('fonts.') || href.includes('typography') || href.includes('font')) {
			fontCount++;
		}
	});

	// Check for font-face declarations in inline styles
	const htmlContent = parsedHTML.document.documentElement?.outerHTML || '';
	const fontFaceMatches = htmlContent.match(/@font-face/gi);
	if (fontFaceMatches) {
		fontCount += fontFaceMatches.length;
	}

	return fontCount;
}

function generatePerformanceIssues(metrics: PerformanceMetrics, parsedHTML: ParsedHTML): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check page weight
	if (metrics.pageWeight > PERFORMANCE_THRESHOLDS.pageWeightError) {
		issues.push({
			id: 'page-weight-excessive',
			category: 'Performance & Optimization',
			severity: 'error',
			message: `Page weight is ${Math.round(metrics.pageWeight / 1024 / 1024)}MB (exceeds 3MB limit)`,
			description: 'Large page sizes significantly impact loading performance and user experience.',
			howToFix: 'Optimize images, minify CSS/JS, remove unused resources, and consider lazy loading',
			details: {
				pageWeight: `${Math.round(metrics.pageWeight / 1024 / 1024)}MB`,
				breakdown: {
					images: `${metrics.resourceCounts.images} images`,
					scripts: `${metrics.resourceCounts.scripts} scripts`,
					stylesheets: `${metrics.resourceCounts.stylesheets} stylesheets`
				}
			}
		});
	} else if (metrics.pageWeight > PERFORMANCE_THRESHOLDS.pageWeightWarning) {
		issues.push({
			id: 'page-weight-large',
			category: 'Performance & Optimization',
			severity: 'warning',
			message: `Page weight is ${Math.round(metrics.pageWeight / 1024 / 1024)}MB (approaching 3MB limit)`,
			description: 'Consider optimizing resources to improve loading performance.',
			howToFix: 'Compress images, optimize assets, and remove unnecessary resources'
		});
	}

	// Check for images without dimensions (CLS issue)
	const imagesWithoutDimensions = parsedHTML.images.filter(img =>
		!img.getAttribute('width') && !img.getAttribute('height')
	);

	if (imagesWithoutDimensions.length > 0) {
		issues.push({
			id: 'images-missing-dimensions',
			category: 'Performance & Optimization',
			severity: 'warning',
			message: `${imagesWithoutDimensions.length} images missing width/height attributes`,
			description: 'Images without dimensions can cause layout shift when they load.',
			howToFix: 'Add width and height attributes to all images to prevent layout shift',
			details: {
				imagesWithoutDimensions: imagesWithoutDimensions.length,
				estimatedCLS: metrics.cumulativeLayoutShift
			}
		});
	}

	// Check for render-blocking resources
	const renderBlockingScripts = parsedHTML.scripts.filter(script => {
		const src = script.getAttribute('src');
		return src && !script.hasAttribute('defer') && !script.hasAttribute('async');
	});

	if (renderBlockingScripts.length > 0) {
		issues.push({
			id: 'render-blocking-scripts',
			category: 'Performance & Optimization',
			severity: 'warning',
			message: `${renderBlockingScripts.length} render-blocking JavaScript files`,
			description: 'Render-blocking scripts can delay page rendering and First Contentful Paint.',
			howToFix: 'Add defer or async attributes to non-critical scripts, or move them to the end of the body',
			details: {
				renderBlockingScripts: renderBlockingScripts.length,
				estimatedTBT: `${metrics.totalBlockingTime}ms`
			}
		});
	}

	// Check for excessive resource counts
	if (metrics.resourceCounts.images > PERFORMANCE_THRESHOLDS.imageCountError) {
		issues.push({
			id: 'excessive-image-count',
			category: 'Performance & Optimization',
			severity: 'error',
			message: `${metrics.resourceCounts.images} images on page (exceeds recommended limit)`,
			description: 'Too many images can significantly impact loading performance.',
			howToFix: 'Implement lazy loading, use image sprites for small icons, or reduce image count'
		});
	}

	// Check Core Web Vitals estimates
	if (metrics.largestContentfulPaint > 2500) {
		const severity = metrics.largestContentfulPaint > 4000 ? 'error' : 'warning';
		issues.push({
			id: 'poor-lcp',
			category: 'Performance & Optimization',
			severity,
			message: `Estimated Largest Contentful Paint: ${metrics.largestContentfulPaint}ms (target: <2500ms)`,
			description: 'Poor LCP affects user experience and search engine rankings.',
			howToFix: 'Optimize images, reduce server response times, and eliminate render-blocking resources'
		});
	}

	if (metrics.cumulativeLayoutShift > 0.1) {
		const severity = metrics.cumulativeLayoutShift > 0.25 ? 'error' : 'warning';
		issues.push({
			id: 'high-cls',
			category: 'Performance & Optimization',
			severity,
			message: `Estimated Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)} (target: <0.1)`,
			description: 'High CLS indicates visual instability during page load.',
			howToFix: 'Add dimensions to images, reserve space for ads, and avoid inserting content above existing content'
		});
	}

	return issues;
}

function calculatePerformanceStats(metrics: PerformanceMetrics, parsedHTML: ParsedHTML) {
	const renderBlockingResources = parsedHTML.scripts.filter(script => {
		const src = script.getAttribute('src');
		return src && !script.hasAttribute('defer') && !script.hasAttribute('async');
	}).length + parsedHTML.stylesheets.length; // CSS is always render-blocking

	// Check for lazy loading implementation
	const lazyLoadingImplemented = parsedHTML.images.some(img =>
		img.hasAttribute('loading') ||
		img.hasAttribute('data-src') ||
		img.getAttribute('src')?.includes('lazy')
	);

	return {
		totalPageWeight: metrics.pageWeight,
		renderBlockingResources,
		lazyLoadingImplemented,
		averageLoadTime: (metrics.firstContentfulPaint + metrics.largestContentfulPaint) / 2
	};
}

function createEmptyMetrics(): PerformanceMetrics {
	return {
		firstContentfulPaint: 0,
		largestContentfulPaint: 0,
		cumulativeLayoutShift: 0,
		totalBlockingTime: 0,
		pageWeight: 0,
		resourceCounts: {
			images: 0,
			scripts: 0,
			stylesheets: 0,
			fonts: 0
		}
	};
}