/**
 * P4-Judge Phase
 * AI verification using Workers AI or external LLM
 */

import type { Env, Finding, Verdict } from '../types';
import { storeFinding } from './memory';

interface JudgeResult {
  findings: Finding[];
  verifiedCount: number;
  llmCalls: number;
  tokensUsed: number;
}

// Persona prompts for different rule categories
const PERSONA_PROMPTS: Record<string, string> = {
  SECURITY: `You are a security expert reviewing Webflow Designer Extension code.
Your task is to determine if a flagged code pattern is a genuine security risk or a false positive.

Consider:
- Is this a known-safe library pattern (React, jQuery, Webpack runtime)?
- Is the code in a test file or development context?
- Could this pattern be exploited in a sandboxed iframe environment?
- Is there evidence of malicious intent?`,

  INTEGRITY: `You are a platform integrity expert reviewing Webflow Designer Extension code.
Your task is to determine if a flagged pattern violates Webflow's platform guidelines.

Consider:
- Does this pattern degrade the Designer user experience?
- Is there a legitimate use case for this pattern?
- Could this pattern conflict with Designer functionality?
- Is this a common library pattern that's generally acceptable?`,
};

const VERDICT_SCHEMA = `
Respond with ONLY valid JSON in this format:
{
  "verdict": "PASS" | "FAIL" | "INVESTIGATE",
  "reasoning": "Brief explanation (1-2 sentences)",
  "confidence": 0-100
}`;

/**
 * Run P4-Judge phase: AI verification for findings
 */
export async function runJudgePhase(
  env: Env,
  findings: Finding[],
  appType?: string
): Promise<JudgeResult> {
  const result: Finding[] = [];
  let verifiedCount = 0;
  let llmCalls = 0;
  let tokensUsed = 0;

  // Process findings in batches of 3 (concurrency limit)
  const batchSize = 3;
  for (let i = 0; i < findings.length; i += batchSize) {
    const batch = findings.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(finding => verifyFinding(env, finding, appType))
    );

    for (const { finding: verifiedFinding, tokens } of batchResults) {
      result.push(verifiedFinding);
      if (verifiedFinding.phase === 'P4-judge') {
        verifiedCount++;
        llmCalls++;
        tokensUsed += tokens;
        
        // Store the verified finding for future memory lookups
        await storeFinding(env.DB, verifiedFinding);
      }
    }
  }

  return { findings: result, verifiedCount, llmCalls, tokensUsed };
}

/**
 * Verify a single finding using AI
 */
async function verifyFinding(
  env: Env,
  finding: Finding,
  appType?: string
): Promise<{ finding: Finding; tokens: number }> {
  // Skip low-severity findings to reduce API costs
  if (finding.tier === 'LOGS' || finding.tier === 'INVESTIGATE') {
    // Auto-pass investigate tier to reduce noise
    return {
      finding: {
        ...finding,
        verdict: 'INVESTIGATE',
        reasoning: 'Auto-marked for investigation (not verified by AI)',
        phase: 'P4-judge',
      },
      tokens: 0,
    };
  }

  // Build context for the LLM
  const context = buildContext(finding, appType);
  const persona = PERSONA_PROMPTS[finding.signalType || 'SECURITY'];

  try {
    // Try Workers AI first
    if (env.AI) {
      const result = await callWorkersAI(env.AI, persona, context);
      if (result) {
        return {
          finding: applyVerdict(finding, result),
          tokens: result.tokens || 0,
        };
      }
    }

    // Fallback to Gemini if configured
    if (env.GEMINI_API_KEY) {
      const result = await callGemini(env.GEMINI_API_KEY, persona, context);
      if (result) {
        return {
          finding: applyVerdict(finding, result),
          tokens: result.tokens || 0,
        };
      }
    }

    // No AI available - return as-is
    return { finding, tokens: 0 };
  } catch (err) {
    console.error('AI verification failed:', err);
    return { finding, tokens: 0 };
  }
}

/**
 * Build context string for the LLM
 */
function buildContext(finding: Finding, appType?: string): string {
  const contextLines = finding.context
    ? [
        '// Lines before:',
        ...(finding.context.before || []).map((l, i) => `${i + 1}: ${l}`),
        '',
        '// Flagged line:',
        `>>> ${finding.context.code}`,
        '',
        '// Lines after:',
        ...(finding.context.after || []).map((l, i) => `${i + 1}: ${l}`),
      ].join('\n')
    : finding.snippet;

  return `
Rule: ${finding.ruleId}
Severity: ${finding.severity || 'UNKNOWN'}
Tier: ${finding.tier || 'UNKNOWN'}
App Type: ${appType || 'designer_extension'}
File: ${finding.filePath}
Line: ${finding.line}

Code Context:
\`\`\`javascript
${contextLines}
\`\`\`

${VERDICT_SCHEMA}`;
}

interface AIVerdict {
  verdict: Verdict;
  reasoning: string;
  confidence: number;
  tokens?: number;
}

/**
 * Apply AI verdict to finding
 */
function applyVerdict(finding: Finding, verdict: AIVerdict): Finding {
  return {
    ...finding,
    verdict: verdict.verdict,
    reasoning: verdict.reasoning,
    confidenceScore: verdict.confidence,
    phase: 'P4-judge',
  };
}

/**
 * Call Workers AI for verification
 */
async function callWorkersAI(ai: Ai, persona: string, context: string): Promise<AIVerdict | null> {
  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0], {
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: context },
      ],
      max_tokens: 200,
      temperature: 0,
    } as Record<string, unknown>);

    const result = response as Record<string, unknown>;
    if ('response' in result && typeof result.response === 'string') {
      return parseAIResponse(result.response);
    }
    return null;
  } catch (err) {
    console.error('Workers AI error:', err);
    return null;
  }
}

/**
 * Call Gemini API for verification
 */
async function callGemini(apiKey: string, persona: string, context: string): Promise<AIVerdict | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${persona}\n\n${context}` }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { totalTokenCount?: number };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const verdict = parseAIResponse(text);
    if (verdict) {
      verdict.tokens = data.usageMetadata?.totalTokenCount || 0;
    }
    return verdict;
  } catch (err) {
    console.error('Gemini API error:', err);
    return null;
  }
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(text: string): AIVerdict | null {
  try {
    // Extract JSON from response (may have markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*"verdict"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIVerdict>;
    
    if (!parsed.verdict || !['PASS', 'FAIL', 'INVESTIGATE'].includes(parsed.verdict)) {
      return null;
    }

    return {
      verdict: parsed.verdict as Verdict,
      reasoning: parsed.reasoning || 'No reasoning provided',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 70,
    };
  } catch {
    return null;
  }
}
