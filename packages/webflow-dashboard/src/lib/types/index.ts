// Asset types
export interface Asset {
	id: string;
	name: string;
	description?: string;
	descriptionShort?: string;
	descriptionLongHtml?: string;
	type: 'Template' | 'Library' | 'App';
	status: 'Draft' | 'Scheduled' | 'Upcoming' | 'Published' | 'Rejected' | 'Delisted';
	thumbnailUrl?: string;
	secondaryThumbnailUrl?: string;
	carouselImages?: string[];
	websiteUrl?: string;
	previewUrl?: string;
	marketplaceUrl?: string;
	submittedDate?: string;
	publishedDate?: string;
	decisionDate?: string;
	tags?: string[];
	// Metrics
	uniqueViewers?: number;
	cumulativePurchases?: number;
	cumulativeRevenue?: number;
	// Review fields
	latestReviewStatus?: string;
	latestReviewDate?: string;
	latestReviewFeedback?: string;
	rejectionFeedback?: string;
	rejectionFeedbackHtml?: string;
	qualityScore?: number;
	// Price
	priceString?: string;
	// Creator link
	creatorId?: string;
	creatorEmail?: string;
}

// Related asset (simplified)
export interface RelatedAsset {
	id: string;
	name: string;
	type: string;
	thumbnailUrl?: string;
}

// Status timeline item
export interface StatusTimelineItem {
	date: string;
	status: string;
	comment?: string;
}

export type CreateAssetInput = Omit<Asset, 'id' | 'submittedDate' | 'publishedDate' | 'uniqueViewers' | 'cumulativePurchases' | 'cumulativeRevenue'>;
export type UpdateAssetInput = Partial<CreateAssetInput>;

// User/Creator types
export interface Creator {
	id: string;
	name: string;
	email: string;
	emails?: string[]; // Multiple email aliases
	avatarUrl?: string;
	biography?: string;
	legalName?: string;
}

// API Key types
export interface ApiKey {
	id: string;
	name: string;
	createdAt: string;
	expiresAt?: string;
	lastUsedAt?: string;
	scopes: string[];
	status: 'Active' | 'Revoked' | 'Expired';
}

// Session types
export interface SessionData {
	email: string;
	createdAt?: number;
}

// Rate limit types
export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: string;
	retryAfter: number;
}

// Analytics types
export interface CategoryPerformance {
	category: string;
	revenue: number;
	templateCount: number;
	ranking: number;
}

export interface MarketplaceInsights {
	categories: CategoryPerformance[];
	lastUpdated: string;
}
