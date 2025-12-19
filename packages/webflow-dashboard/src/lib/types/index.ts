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

// Asset status types
export type AssetStatus = 'Draft' | 'Scheduled' | 'Upcoming' | 'Published' | 'Rejected' | 'Delisted';

// Sort configuration
export interface SortConfig {
	key: string;
	direction: 'ascending' | 'descending';
}

// Status display configuration
export interface StatusConfig {
	icon: string;
	color: string;
	darkColor: string;
	bgClass: string;
	textClass: string;
	borderClass: string;
}

// Status ordering for consistent display
export const STATUS_ORDER: AssetStatus[] = ['Published', 'Scheduled', 'Upcoming', 'Delisted', 'Rejected', 'Draft'];

// Status configuration mapping
export const STATUS_CONFIG: Record<AssetStatus, StatusConfig> = {
	Published: {
		icon: 'CheckCircle',
		color: 'var(--color-status-published)',
		darkColor: '#34D399',
		bgClass: 'bg-status-published',
		textClass: 'text-status-published',
		borderClass: 'border-status-published'
	},
	Scheduled: {
		icon: 'Calendar',
		color: 'var(--color-status-scheduled)',
		darkColor: '#3B82F6',
		bgClass: 'bg-status-scheduled',
		textClass: 'text-status-scheduled',
		borderClass: 'border-status-scheduled'
	},
	Upcoming: {
		icon: 'Clock',
		color: 'var(--color-status-upcoming)',
		darkColor: '#A78BFA',
		bgClass: 'bg-status-upcoming',
		textClass: 'text-status-upcoming',
		borderClass: 'border-status-upcoming'
	},
	Delisted: {
		icon: 'AlertCircle',
		color: 'var(--color-status-delisted)',
		darkColor: '#FBBF24',
		bgClass: 'bg-status-delisted',
		textClass: 'text-status-delisted',
		borderClass: 'border-status-delisted'
	},
	Rejected: {
		icon: 'XCircle',
		color: 'var(--color-status-rejected)',
		darkColor: '#F87171',
		bgClass: 'bg-status-rejected',
		textClass: 'text-status-rejected',
		borderClass: 'border-status-rejected'
	},
	Draft: {
		icon: 'FileText',
		color: 'var(--color-status-draft)',
		darkColor: '#9CA3AF',
		bgClass: 'bg-status-draft',
		textClass: 'text-status-draft',
		borderClass: 'border-status-draft'
	}
};
