/**
 * Apply the Designer Extension's client-side enhancements to a worker result
 * built from headless (MCP) DesignerData. One implementation, shared with the
 * extension: shared/designer-enhancements.ts.
 *
 * Produces "Style System", the canvas checks and republish hints, the Page
 * Structure naming and slug rewrite, the Variable Modes normalization, sorted
 * categories, and recomputed summary totals. Without a canvas result (see
 * canvas.ts), the canvas category is reported as unavailable and no republish
 * hints are added.
 */

import type { DesignerData } from '../../worker/src/types';
import {
	deriveCollectionMetadata,
	deriveEnhancedValidation,
	enhanceValidationResults,
	type CanvasAccessibilityResult,
	type EnhanceableResults,
	type EnhancedValidation
} from '../../shared/designer-enhancements';

/** DesignerData plus the derived fields the extension sends with its payload. */
export type HeadlessDesignerData = DesignerData & {
	enhancedValidation?: EnhancedValidation;
	collectionMetadata?: Record<string, number>;
};

/** Add `enhancedValidation` and `collectionMetadata`, as the extension's collector does. */
export function withDerivedFields(data: DesignerData): HeadlessDesignerData {
	return {
		...data,
		collectionMetadata: deriveCollectionMetadata(data),
		enhancedValidation: deriveEnhancedValidation(data)
	};
}

/**
 * Mutates and returns `results`. Uses `designerData.enhancedValidation` when
 * present, otherwise derives it.
 */
export function applyDesignerEnhancements<T extends EnhanceableResults>(
	results: T,
	designerData: HeadlessDesignerData,
	canvas?: CanvasAccessibilityResult
): T & EnhanceableResults {
	const data = designerData.enhancedValidation ? designerData : withDerivedFields(designerData);
	enhanceValidationResults(results, data, canvas);
	return results;
}
