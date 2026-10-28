import {
	findHtmlEmbedScripts,
	findProhibitedMarketplaceCustomCode,
	type HtmlEmbedScriptFinding,
	type MarketplaceCustomCodeFinding
} from '@create-something/gsap-validation-worker/font-custom-code-policy';
import type { CustomCodeAnalysisResult, ValidationIssue } from '../types';
import { fetchHTML } from '../utils/fetch-utils';

const HOW_TO_FIX: Record<MarketplaceCustomCodeFinding['policy'], string> = {
	'custom-code-font-loading':
		'Remove the custom font code, add the eligible Google or OFL font through Site settings > Fonts, publish again, and rerun validation.',
	'custom-code-schema-markup-not-allowed': 'Remove the schema markup, publish again, and rerun validation.',
	'custom-code-html-embed-not-allowed':
		'Rebuild the embed with native Webflow elements (for video, the Video element or a YouTube/Vimeo iframe), keep only inline SVG, CSS, or approved scripts in HTML Embeds, publish again, and rerun validation.'
};

// This validator does not run the GSAP worker's script checks, so embed scripts are surfaced
// for reviewer verification instead of passing silently.
function toEmbedScriptIssue(finding: HtmlEmbedScriptFinding, index: number): ValidationIssue {
	return {
		id: index === 0 ? finding.policy : `${finding.policy}-${index + 1}`,
		category: 'Custom Code & Site Settings',
		severity: 'warning',
		message: finding.message,
		description: `${finding.kind}: ${finding.source}`,
		howToFix:
			'Keep only approved GSAP scripts in HTML Embeds and document them on the Instructions page; remove any other script, publish again, and rerun validation.',
		details: {
			policy: finding.policy,
			kind: finding.kind,
			source: finding.source
		}
	};
}

function toValidationIssue(finding: MarketplaceCustomCodeFinding, index: number): ValidationIssue {
	return {
		id: index === 0 ? finding.policy : `${finding.policy}-${index + 1}`,
		category: 'Custom Code & Site Settings',
		severity: 'error',
		message: finding.message,
		description: `${finding.kind}: ${finding.source}`,
		howToFix: HOW_TO_FIX[finding.policy],
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
			issues: [...findings.map(toValidationIssue), ...findHtmlEmbedScripts(html).map(toEmbedScriptIssue)],
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
