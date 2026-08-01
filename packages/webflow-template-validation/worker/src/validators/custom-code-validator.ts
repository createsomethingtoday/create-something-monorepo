import {
	findProhibitedFontCustomCode,
	type FontCustomCodeFinding
} from '@create-something/gsap-validation-worker/font-custom-code-policy';
import type { CustomCodeAnalysisResult, ValidationIssue } from '../types';
import { fetchHTML } from '../utils/fetch-utils';

function toValidationIssue(finding: FontCustomCodeFinding, index: number): ValidationIssue {
	return {
		id: index === 0 ? 'custom-code-font-loading' : `custom-code-font-loading-${index + 1}`,
		category: 'Custom Code & Site Settings',
		severity: 'error',
		message: finding.message,
		description: `${finding.kind}: ${finding.source}`,
		howToFix:
			'Remove the custom font code, add the eligible Google or OFL font through Site settings > Fonts, publish again, and rerun validation.',
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
		const findings = findProhibitedFontCustomCode(html);
		return {
			issues: findings.map(toValidationIssue),
			stats: {
				fontCustomCodeFindings: findings.length,
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
				analysisComplete: false
			}
		};
	}
}
