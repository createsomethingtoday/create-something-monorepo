/**
 * AI Analysis Utility (Google Gemini)
 * Matches original IC implementation
 */

import type { ScanReport, Ruleset, AiAnalysisResult } from '../types';

// Checklist content for AI context
const CHECKLIST_CONTENT = `# App Bundle Review Checklist (Condensed for AI Context)

## Security (Critical)
- No eval(), new Function(), or string-based timers
- No parent/top document access
- No hardcoded API keys or secrets
- No obfuscated code
- HTTPS only (no http://, ws://)
- No external script injection
- No external iframes (except auth)
- No hardware access (mic/cam)
- No fingerprinting libraries

## Production Readiness
- No localhost/dev URLs
- No console.log in production
- Proper error handling

## Data Privacy
- No localStorage for sensitive tokens
- No session replay tools
- Clear data handling

## UX
- User-initiated actions only
- No forced redirects
- No unauthorized popups`;

// LLMs.txt content (summarized)
const LLMS_CONTENT = `# Webflow Code Components Guidelines (Summarized)

Code Components run in Shadow DOM isolation within Webflow Designer.
Must follow CSP restrictions and sandbox policies.
No access to parent frame or host document.
All network requests must be HTTPS.
No dynamic code execution allowed.
Components should be deterministic and side-effect free.`;

export async function analyzeReportWithAi(
  report: ScanReport,
  ruleset: Ruleset,
  apiKey: string
): Promise<AiAnalysisResult> {
  const systemInstruction = `You are a senior security analyst auditing Webflow Marketplace app bundles.

Your job is to:
1. Find risks the regex-based scanner might have MISSED
2. Suggest new rules to improve the scanner
3. Identify noisy rules that generate false positives
4. Ask clarifying questions for edge cases

Context files are provided. Be thorough but concise.`;

  const userPrompt = `## Current Ruleset Summary
${ruleset.rules.length} rules covering: ${[...new Set(ruleset.rules.map(r => r.category))].join(', ')}

## Scan Report Summary
- Verdict: ${report.verdict}
- Files scanned: ${report.bundleSummary.scannedFileCount}
- Total findings: ${Object.values(report.findings).reduce((acc, f) => acc + f.count, 0)}

## Findings by Rule
${Object.entries(report.findings).map(([ruleId, data]) => 
  `- ${ruleId}: ${data.count} matches (${data.rule.severity})`
).join('\n')}

## Sample Findings (first 5 per rule)
${Object.entries(report.findings).slice(0, 5).map(([ruleId, data]) =>
  `### ${ruleId}\n${data.items.slice(0, 3).map(i => 
    `- ${i.filePath}:${i.line} - "${i.snippet.substring(0, 100)}"`
  ).join('\n')}`
).join('\n\n')}

## Context: Review Checklist
${CHECKLIST_CONTENT.substring(0, 2000)}

## Context: Webflow Guidelines
${LLMS_CONTENT.substring(0, 1500)}

Based on this analysis, provide your assessment in the following JSON format:
{
  "missedRisks": [
    {
      "title": "string",
      "whyItMatters": "string",
      "evidence": [{"filePath": "string", "line": number|null, "snippet": "string"}],
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "suggestedNextCheck": "string"
    }
  ],
  "suggestedRuleAdditions": [
    {
      "proposedRuleName": "string",
      "rationale": "string",
      "suggestedRegexOrAstIdea": "string",
      "recommendedFileGlobs": ["string"],
      "falsePositiveNotes": ["string"],
      "confidence": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "suggestedNoiseReductions": [
    {
      "currentIssue": "string",
      "proposal": "string",
      "riskOfHidingRealIssues": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "questionsForReviewer": ["string"],
  "reviewStatusRecommendation": "MANUAL_REVIEW_REQUIRED" | "LOOKS_GOOD"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || response.statusText;
      throw new Error(`Gemini API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response text from Gemini');
    }

    // Parse the JSON response with cleanup
    const result = parseAiResponse(text);
    return result;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

/**
 * Safely parse AI response JSON with cleanup
 */
function parseAiResponse(text: string): AiAnalysisResult {
  let jsonText = text.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();
  
  // Try parsing directly first
  try {
    return JSON.parse(jsonText) as AiAnalysisResult;
  } catch (firstError) {
    // Try to fix common JSON issues
    let fixedJson = jsonText
      // Remove trailing commas before } or ]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      // Fix unquoted property names (common LLM mistake)
      .replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, ' ');
    
    try {
      return JSON.parse(fixedJson) as AiAnalysisResult;
    } catch (secondError) {
      // Return a fallback response with the error info
      console.error('Failed to parse AI response:', text.substring(0, 500));
      return {
        missedRisks: [],
        suggestedRuleAdditions: [],
        suggestedNoiseReductions: [],
        questionsForReviewer: [
          `AI response parsing failed. Raw response started with: "${text.substring(0, 200)}..."`
        ],
        reviewStatusRecommendation: 'MANUAL_REVIEW_REQUIRED'
      };
    }
  }
}
