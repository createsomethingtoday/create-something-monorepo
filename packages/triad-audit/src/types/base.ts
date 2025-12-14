/**
 * Base Types for Subtractive Triad Audit
 *
 * Shared primitives used across all audit domains.
 * This file exists to prevent circular dependencies.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Violation {
	type: string;
	severity: Severity;
	message: string;
	file?: string;
	files?: string[];
	lines?: number;
	suggestion: string;
}

export interface Commendation {
	level: 'dry' | 'rams' | 'heidegger';
	component: string;
	reason: string;
}
