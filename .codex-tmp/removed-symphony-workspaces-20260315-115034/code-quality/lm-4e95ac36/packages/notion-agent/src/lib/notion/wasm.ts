/**
 * WebAssembly bindings for high-performance Notion data processing.
 * 
 * Functions in this module are implemented in Rust and compiled to WASM
 * for 10x+ performance improvements on CPU-intensive operations.
 * 
 * Note: The bundler target auto-initializes WASM on import.
 */

// Import WASM functions - bundler target auto-initializes
import {
	format_schema as wasmFormatSchema,
	simplify_pages as wasmSimplifyPages,
	find_duplicates as wasmFindDuplicates,
	estimate_tokens as wasmEstimateTokens
} from '@create-something/notion-tools';

// With bundler target, WASM is auto-initialized on import
let initialized = true;

/**
 * Initialize the WASM module.
 * With bundler target, this is a no-op as WASM initializes on import.
 */
export async function initWasm(): Promise<void> {
	// No-op for bundler target - WASM initializes on import
	initialized = true;
}

/**
 * Check if WASM is initialized.
 */
export function isWasmInitialized(): boolean {
	return initialized;
}

/**
 * Format a Notion database schema for LLM context.
 * 
 * @param propertiesJson - JSON string of Notion database properties
 * @returns Formatted schema JSON string
 */
export function formatSchema(propertiesJson: string): string {
	return wasmFormatSchema(propertiesJson);
}

/**
 * Simplify Notion page objects for agent processing.
 * Extracts titles and key metadata.
 * 
 * @param pagesJson - JSON string of Notion page objects
 * @returns Simplified pages JSON string
 */
export function simplifyPages(pagesJson: string): string {
	return wasmSimplifyPages(pagesJson);
}

/**
 * Find duplicate pages by title.
 * 
 * @param pagesJson - JSON string of pages with id, title, created_time
 * @param keepStrategy - 'oldest' or 'newest' - which duplicate to keep
 * @returns Result JSON with pages_to_archive array
 */
export function findDuplicates(pagesJson: string, keepStrategy: string = 'oldest'): string {
	return wasmFindDuplicates(pagesJson, keepStrategy);
}

/**
 * Estimate token count for text.
 * Fast approximation using byte-level heuristics.
 * 
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
	return wasmEstimateTokens(text);
}

// Type definitions for WASM function results

export interface FormattedSchema {
	properties: Array<{
		name: string;
		type: string;
		options?: string[];
	}>;
}

export interface SimplifiedPage {
	id: string;
	title: string;
	title_property_name: string;
	created_time: string;
	last_edited_time: string;
	url: string;
}

export interface DuplicateResult {
	total_pages: number;
	duplicate_groups: number;
	pages_to_archive: string[];
	summary: string;
}
