import {
	findProhibitedMarketplaceCustomCode,
	type MarketplaceCustomCodeFinding
} from '@create-something/gsap-validation-worker/font-custom-code-policy';
import type { CustomCodeAnalysisResult, ValidationIssue } from '../types';
import { fetchHTML } from '../utils/fetch-utils';

function toValidationIssue(finding: MarketplaceCustomCodeFinding, index: number): ValidationIssue {
	return {
		id: index === 0 ? finding.policy : `${finding.policy}-${index + 1}`,
		category: 'Custom Code & Site Settings',
		severity: 'error',
		message: finding.message,
		description: `${finding.kind}: ${finding.source}`,
		howToFix:
			finding.policy === 'custom-code-font-loading'
				? 'Remove the custom font code, add the eligible Google or OFL font through Site settings > Fonts, publish again, and rerun validation.'
				: 'Remove the schema markup, publish again, and rerun validation.',
		details: {
			policy: finding.policy,
			kind: finding.kind,
			source: finding.source
		}
	};
}

export async function validateCustomCode(siteUrl: string): Promise<CustomCodeAnalysisResult> {
	try {
		const { html } = await fetchHTML(siteUrl);
		const findings = findProhibitedMarketplaceCustomCode(html);
		return {
			issues: findings.map(toValidationIssue),
			stats: {
				fontCustomCodeFindings: findings.filter(
					(finding) => finding.policy === 'custom-code-font-loading'
				).length,
				schemaMarkupFindings: findings.filter(
					(finding) => finding.policy === 'custom-code-schema-markup-not-allowed'
				).length,
				analysisComplete: true
			}
		};
	} catch (error) {
		return {
			issues: [
				{
					id: 'custom-code-analysis-unavailable',
					category: 'Custom Code & Site Settings',
					severity: 'error',
					message: 'Custom code validation could not inspect the published site.',
					description: error instanceof Error ? error.message : 'Unknown fetch failure',
					howToFix: 'Confirm the published site is public, then rerun validation.'
				}
			],
			stats: {
				fontCustomCodeFindings: 0,
				schemaMarkupFindings: 0,
				analysisComplete: false
			}
		};
	}
}
