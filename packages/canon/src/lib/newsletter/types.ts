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
	sessionId?: string;
	sourceProperty?: Property;
	landingUrl?: string;
	referrer?: string;
	intent?: string;
	lane?: string;
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
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>;
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T = unknown>(): Promise<T | null>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
	success: boolean;
	meta: { changes: number };
	results?: T[];
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
