// Asset types
export interface Asset {
	id: string;
	name: string;
	description?: string;
	type: 'Template' | 'Library' | 'App';
	status: 'Draft' | 'Scheduled' | 'Upcoming' | 'Published' | 'Rejected' | 'Delisted';
	thumbnailUrl?: string;
	websiteUrl?: string;
	marketplaceUrl?: string;
	submittedDate?: string;
	publishedDate?: string;
	tags?: string[];
	// Metrics
	uniqueViewers?: number;
	cumulativePurchases?: number;
	cumulativeRevenue?: number;
	// Creator link
	creatorId?: string;
	creatorEmail?: string;
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
