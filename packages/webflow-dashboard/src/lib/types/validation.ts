/**
 * Validation API Types
 *
 * Types for the GSAP validation system that calls the external
 * Cloudflare Worker for site crawling and code analysis.
 */

// Worker request/response types

export interface WorkerRequest {
	url: string;
	maxDepth: number;
	maxPages: number;
}

export interface WorkerResponse {
	url: string;
	success: boolean;
	passed: boolean;
	siteResults: {
		pageCount: number;
		analyzedCount: number;
		passedCount: number;
		failedCount: number;
	};
	pageResults: WorkerPageResult[];
	crawlStats?: CrawlStats;
}

export interface WorkerPageResult {
	url: string;
	title: string;
	passed: boolean;
	flaggedCodeCount: number;
	summary: {
		securityRiskCount: number;
		validGsapCount: number;
	};
	details: {
		flaggedCode: FlaggedCode[];
		securityRisks?: SecurityRisk[];
	};
}

export interface FlaggedCode {
	message: string;
	flaggedCode: string[];
}

export interface SecurityRisk {
	message: string;
	flaggedCode: string[];
}

export interface CrawlStats {
	duration?: number;
	pagesPerSecond?: number;
}

// Processed result types (returned by our API)

export interface ValidationResult {
	url: string;
	success: boolean;
	passed: boolean;
	timestamp: string;
	summary: ValidationSummary;
	issues: ValidationIssues;
	pageResults: PageResult[];
	crawlStats?: CrawlStats;
	recommendations: Recommendation[];
}

export interface ValidationSummary {
	totalPages: number;
	analyzedPages: number;
	passedPages: number;
	failedPages: number;
	passRate: number;
}

export interface ValidationIssues {
	totalFlaggedCode: number;
	totalSecurityRisks: number;
	totalValidGsap: number;
	commonIssues: CommonIssue[];
}

export interface CommonIssue {
	issue: string;
	count: number;
}

export interface PageResult {
	url: string;
	title: string;
	passed: boolean;
	flaggedCodeCount: number;
	securityRiskCount: number;
	validGsapCount: number;
	mainIssues: MainIssue[];
	allFlaggedCode: FlaggedCode[];
}

export interface MainIssue {
	type: string;
	preview: string;
	fullDetails: string[];
}

export interface Recommendation {
	type: 'critical' | 'warning' | 'success';
	title: string;
	description: string;
	action: string;
	required?: boolean;
	priority?: number;
}

// UI state types

export type SortOption = 'issues-high' | 'issues-low' | 'name' | 'health';

export type TabOption = 'overview' | 'pages' | 'issues' | 'recommendations';
