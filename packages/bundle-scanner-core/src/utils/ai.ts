import type { ScanReport, AiAnalysisResult, Finding } from '../types';

/**
 * Base system instruction for the AI model
 */
const BASE_SYSTEM_INSTRUCTION = `You are a Webflow Marketplace Security Review Assistant.

ROLE
Review the provided "scanReport.json" against security best practices and Webflow guidelines.

YOUR TASK:
1. Identify potential risks that may have been missed by the scanner
2. Suggest new rules that could improve detection
3. Identify false positives that could be reduced
4. Raise questions for the human reviewer

NON-NEGOTIABLE RULES
1) Do NOT change the scanner's verdict.
2) Do NOT hallucinate. Only cite evidence present in the scan report.
3) Be concise.

WHAT TO OUTPUT
Return ONLY valid JSON matching this schema:
{
  "missedRisks": [
    {
      "title": string,
      "whyItMatters": string,
      "evidence": [{"filePath": string, "line": number|null, "snippet": string}],
      "confidence": "LOW"|"MEDIUM"|"HIGH",
      "suggestedNextCheck": string
    }
  ],
  "suggestedRuleAdditions": [
    {
      "proposedRuleName": string,
      "rationale": string,
      "suggestedRegexOrAstIdea": string,
      "recommendedFileGlobs": string[],
      "falsePositiveNotes": string[],
      "confidence": "LOW"|"MEDIUM"|"HIGH"
    }
  ],
  "suggestedNoiseReductions": [
    {
      "currentIssue": string,
      "proposal": string,
      "riskOfHidingRealIssues": "LOW"|"MEDIUM"|"HIGH"
    }
  ],
  "questionsForReviewer": [string],
  "reviewStatusRecommendation": "MANUAL_REVIEW_REQUIRED" | "LOOKS_GOOD"
}`;

/**
 * Prepare a capped version of the report for AI analysis
 * to respect privacy constraints and API limits
 */
function prepareReportForAi(report: ScanReport): Record<string, unknown> {
  const cappedFindings: Record<string, unknown> = {};

  for (const [ruleId, group] of Object.entries(report.findings)) {
    if (group.count === 0) continue;

    // Take top 20 findings per rule
    const cappedItems = group.items.slice(0, 20).map((f: Finding) => ({
      filePath: f.filePath,
      line: f.line,
      snippet: f.snippet.length > 200 ? f.snippet.substring(0, 200) + '...' : f.snippet,
      trigger: f.triggerToken,
      conf: f.confidence
    }));

    cappedFindings[ruleId] = {
      ruleName: group.rule.name,
      severity: group.rule.severity,
      count: group.count,
      items: cappedItems
    };
  }

  return {
    verdict: report.verdict,
    verdictReasons: report.verdictReasons,
    bundleSummary: report.bundleSummary,
    findings: cappedFindings
  };
}

/**
 * AI provider interface for different backends
 */
export interface AiProvider {
  analyze(prompt: string, systemInstruction: string): Promise<string>;
}

/**
 * Google Gemini AI provider
 */
export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyze(prompt: string, systemInstruction: string): Promise<string> {
    // Dynamic import to make @google/genai optional
    const { GoogleGenAI } = await import('@google/genai');
    
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    if (!response.text) {
      throw new Error('No response generated from AI');
    }

    return response.text;
  }
}

/**
 * Analyze a scan report with AI assistance
 * 
 * @param report - The scan report to analyze
 * @param provider - AI provider to use
 * @param additionalContext - Optional additional context (e.g., checklist docs)
 * @returns AI analysis result
 */
export async function analyzeReportWithAi(
  report: ScanReport,
  provider: AiProvider,
  additionalContext?: string
): Promise<AiAnalysisResult> {
  const cappedReport = prepareReportForAi(report);
  
  let prompt = `REPORT TO ANALYZE:\n${JSON.stringify(cappedReport, null, 2)}`;
  
  if (additionalContext) {
    prompt = `CONTEXT:\n${additionalContext.substring(0, 30000)}\n\n${prompt}`;
  }
  
  try {
    const responseText = await provider.analyze(prompt, BASE_SYSTEM_INSTRUCTION);
    return JSON.parse(responseText) as AiAnalysisResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`AI analysis failed: ${message}`);
  }
}

/**
 * Create a Gemini provider from environment variable
 */
export function createGeminiProviderFromEnv(): GeminiProvider {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or API_KEY environment variable is required');
  }
  
  return new GeminiProvider(apiKey);
}
