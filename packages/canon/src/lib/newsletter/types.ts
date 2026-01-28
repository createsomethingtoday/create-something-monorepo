/**
 * Newsletter Module Types
 *
 * Shared types for newsletter subscription and unsubscribe functionality.
 *
 * @packageDocumentation
 */

import type { Property } from '../analytics/types.js';

// Re-export for convenience with alias for backwards compatibility
export type PropertyDomain = Property;
export type { Property };

/**
 * Result from processing an unsubscribe request
 */
export interface UnsubscribeResult {
	success: boolean;
	error: string | null;
	email: string | null;
}

/**
 * Props for the UnsubscribePage component
 */
export interface UnsubscribePageProps {
	data: UnsubscribeResult;
	property: PropertyDomain;
}

/**
 * Newsletter subscription request body
 */
export interface NewsletterRequest {
	email: string;
	website?: string; // Honeypot field - should be empty
	turnstileToken?: string;
	source?: string; // Optional source override, defaults to property
}

/**
 * Cloudflare Turnstile verification response
 */
export interface TurnstileResponse {
	success: boolean;
	'error-codes'?: string[];
}

/**
 * Newsletter subscription result
 */
export interface NewsletterResult {
	success: boolean;
	message: string;
	emailId?: string;
}

/**
 * KV Namespace type (minimal interface)
 */
interface KVNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * D1 Database type (minimal interface)
 */
interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
}

interface D1Result {
	success: boolean;
	meta: { changes: number };
}

/**
 * Environment bindings required for newsletter operations
 */
export interface NewsletterEnv {
	DB: D1Database;
	CACHE?: KVNamespace;
	RESEND_API_KEY: string;
	TURNSTILE_SECRET_KEY?: string;
}
