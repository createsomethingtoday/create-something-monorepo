/** One entry from the SCOPES object in scopes.ts, keyed by its OAuth key (e.g. 'ai:write'). */
export interface ScopeEntry {
	/** TS constant name, e.g. AGENT_INSTRUCTIONS_READ */
	constant: string;
	/** OAuth scope key passed on authorization requests, e.g. 'agent_instructions:read' */
	key: string;
	/** SCOPE_CATEGORIES key, e.g. AGENT_INSTRUCTIONS */
	category: string;
	/** Consent-screen line, e.g. 'Read Agent Instructions data' */
	description: string;
	/** TokenAuthorizationResource names, e.g. ['Site', 'Workspace'] */
	resourceTypes: string[];
	/** Statsig FEATURE_FLAGS name gating the scope, or null when the scope is GA on deploy */
	featureFlag: string | null;
}

/** One entry from SCOPE_CATEGORIES — the grouping shown in the scope picker and consent screen. */
export interface CategoryEntry {
	key: string;
	name: string;
	description: string;
}

/** Parsed registry snapshot persisted in KV between runs. */
export interface Inventory {
	scopes: Record<string, ScopeEntry>;
	categories: Record<string, CategoryEntry>;
	/** Git blob SHA of scopes.ts — fast path: unchanged SHA means no diff needed */
	fileSha: string;
	checkedAt: string;
}

export type ScopeChangeType =
	| 'scope_added'
	| 'scope_removed'
	| 'scope_ungated'
	| 'scope_gated'
	| 'scope_modified'
	| 'category_added';

/** One route registration guarded by a scope, recovered by static extraction. */
export interface GuardedRoute {
	method: string;
	path: string;
	file: string;
}

/** Best-effort endpoint map for one scope constant. */
export interface ScopeEndpoints {
	constant: string;
	routes: GuardedRoute[];
	/** Files that reference the constant but yielded no extractable route */
	otherFiles: string[];
	searchFailed?: boolean;
}

export interface ScopeChange {
	type: ScopeChangeType;
	key: string;
	detail: string;
	scope?: ScopeEntry;
	category?: CategoryEntry;
	/** Populated for scope_added / scope_ungated when endpoint lookup ran */
	endpoints?: ScopeEndpoints;
}

export interface CommitInfo {
	sha: string;
	date: string;
	author: string;
	title: string;
	prNumber: number | null;
	tickets: string[];
}
