export const CUSTOM_CODE_POLICY_VERSION: string;
export const CUSTOM_CODE_POLICY_IDS: Readonly<{
  EXTERNAL_LIBRARY_NOT_ALLOWED: 'custom-code.external-library-not-allowed';
  INLINE_SCRIPT_NOT_ALLOWED: 'custom-code.inline-script-not-allowed';
  APPROVED_GSAP: 'custom-code.approved-gsap';
  VALIDATOR_REVIEW_BRIDGE: 'validator-review-bridge';
  WEBFLOW_PLATFORM_SCRIPT: 'custom-code.webflow-platform-script';
  NON_EXECUTABLE_SCRIPT_DATA: 'custom-code.non-executable-script-data';
}>;

export interface CustomCodeVerdict {
  allowed: boolean;
  disposition?: 'allowed' | 'review-gsap' | 'rejected';
  policy: string;
  message: string;
  resolvedSrc?: string;
}

export interface CustomCodeFinding {
  kind: 'external' | 'inline';
  index: number;
  policy: string;
  message: string;
  source?: string;
  excerpt?: string;
}

export interface CustomCodeAnalysis {
  passed: boolean;
  policyVersion: string;
  findings: CustomCodeFinding[];
  allowed: CustomCodeFinding[];
  stats: {
    externalScriptCount: number;
    inlineScriptCount: number;
    rejectedScriptCount: number;
  };
}

export function classifyExternalScriptSource(source: string, pageUrl: string): CustomCodeVerdict;
export function classifyInlineScript(script: string, attributes?: string): CustomCodeVerdict;
export function extractCustomCodeSurface(
  html: string,
  pageUrl: string
): {
  externalScripts: Array<{ source: string; resolvedSrc: string; attributes: string }>;
  inlineScripts: Array<{ content: string; attributes: string }>;
};
export function analyzeCustomCodeHtml(html: string, pageUrl: string): CustomCodeAnalysis;
export function buildCustomCodeSurfaceCanonical(html: string, pageUrl: string): string;
export function createCustomCodeSurfaceHash(html: string, pageUrl: string): Promise<string>;
