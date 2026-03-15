export interface Master {
	id: string;
	slug: string;
	name: string;
	tagline?: string;
	birth_year?: number;
	death_year?: number;
	discipline?: string;
	portrait_url?: string;
	biography?: string;
	legacy?: string;
	created_at: number;
	updated_at: number;
}

export interface Principle {
	id: string;
	master_id: string;
	title: string;
	description?: string;
	order_index?: number;
	category?: string;
	created_at: number;
}

export interface Quote {
	id: string;
	master_id: string;
	quote_text: string;
	context?: string;
	source_url?: string;
	created_at: number;
}

export interface Resource {
	id: string;
	master_id?: string;
	title: string;
	type?: 'transcript' | 'video' | 'article' | 'book';
	url?: string;
	description?: string;
	year?: number;
	featured: number;
	created_at: number;
}

export interface Example {
	id: string;
	master_id: string;
	title?: string;
	image_url?: string;
	description?: string;
	year?: number;
	created_at: number;
}

export interface CanonReference {
	id: string;
	master_id?: string;
	principle_id?: string;
	reference_type: 'paper' | 'experiment' | 'case_study';
	reference_slug: string;
	reference_domain: 'io' | 'space' | 'agency';
	description?: string;
	created_at: number;
}

// Extended types with joined data
export interface MasterWithPrinciples extends Master {
	principles: Principle[];
	quotes: Quote[];
	examples: Example[];
	resources: Resource[];
}

export interface PrincipleWithMaster extends Principle {
	master: Master;
}
