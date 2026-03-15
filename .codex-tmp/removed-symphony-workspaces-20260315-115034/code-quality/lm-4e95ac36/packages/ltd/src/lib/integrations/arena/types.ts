/**
 * Are.na API Types
 *
 * Based on https://dev.are.na/documentation
 * Public API endpoints (no auth for read operations)
 */

export interface ArenaUser {
	id: number;
	slug: string;
	username: string;
	first_name: string;
	last_name: string;
	full_name: string;
	avatar: string;
	avatar_image: {
		thumb: string;
		display: string;
	};
}

export interface ArenaImage {
	filename: string;
	content_type: string;
	updated_at: string;
	thumb: { url: string };
	square: { url: string };
	display: { url: string };
	large: { url: string };
	original: { url: string };
}

export interface ArenaSource {
	url: string;
	title?: string;
	provider?: {
		name: string;
		url: string;
	};
}

export interface ArenaBlock {
	id: number;
	title: string;
	updated_at: string;
	created_at: string;
	state: 'available' | 'failure' | 'procesed' | 'processing';
	comment_count: number;
	generated_title: string;
	class: 'Image' | 'Text' | 'Link' | 'Media' | 'Attachment';
	base_class: 'Block';
	content?: string;
	content_html?: string;
	description?: string;
	description_html?: string;
	source?: ArenaSource;
	image?: ArenaImage;
	embed?: {
		url: string;
		type: string;
		title?: string;
		author_name?: string;
		author_url?: string;
		source_url?: string;
		thumbnail_url?: string;
		html?: string;
	};
	user: ArenaUser;
	connections?: ArenaChannelRef[];
}

export interface ArenaChannelRef {
	id: number;
	title: string;
	slug: string;
	status: 'public' | 'closed' | 'private';
	user: ArenaUser;
}

export interface ArenaChannel {
	id: number;
	title: string;
	slug: string;
	status: 'public' | 'closed' | 'private';
	user_id: number;
	user: ArenaUser;
	created_at: string;
	updated_at: string;
	published: boolean;
	open: boolean;
	collaboration: boolean;
	follower_count: number;
	length: number;
	kind: 'default' | 'profile';
	metadata?: {
		description?: string;
	};
	contents?: ArenaBlock[];
	collaborators?: ArenaUser[];
}

export interface ArenaChannelContentsResponse {
	base_class: 'Channel';
	class: 'Channel';
	contents: ArenaBlock[];
	length: number;
	total_pages: number;
	current_page: number;
	per: number;
}

export interface ArenaSearchResponse {
	term: string;
	total_pages: number;
	current_page: number;
	per: number;
	channels?: ArenaChannel[];
	blocks?: ArenaBlock[];
	users?: ArenaUser[];
}

export interface ArenaSyncConfig {
	channels: string[];
	masterId?: string;
	cacheMinutes?: number;
}

export interface ArenaSyncResult {
	channel: string;
	blocksProcessed: number;
	examplesCreated: number;
	examplesUpdated: number;
	resourcesCreated: number;
	resourcesUpdated: number;
	errors: string[];
}
