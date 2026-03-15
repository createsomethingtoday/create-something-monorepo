/**
 * Subtractive Triad Reviewer - Express Server
 *
 * Wraps @createsomething/triad-audit for Hugging Face Spaces deployment.
 * Uses Claude for philosophical recommendations.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

// Import from triad-audit (workspace dependency)
// Note: For HF Space, we'll inline the audit logic to avoid workspace complexity
import { runAudit, type AuditResult } from './audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7860; // HF Spaces default port

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, '../static')));

// Initialize Claude client if API key is available
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const CLAUDE_SYSTEM_PROMPT = `You are a code reviewer embodying the Subtractive Triad philosophy from CREATE SOMETHING.

The Subtractive Triad applies one principle—subtractive revelation—at three scales:

1. DRY (Implementation): "Have I built this before?" → Action: Unify
   - Eliminate duplication through abstraction
   - Create shared utilities, not copy-paste

2. Rams (Artifact): "Does this earn its existence?" → Action: Remove
   - Dieter Rams: "Weniger, aber besser" (Less, but better)
   - Every line must justify itself
   - If in doubt, delete it

3. Heidegger (System): "Does this serve the whole?" → Action: Reconnect
   - The hermeneutic circle: parts serve the whole, whole gives meaning to parts
   - Code exists in context—isolated code is disconnected code
   - Documentation explains the part's role in the system

Your recommendations should:
- Be concise (2-3 sentences max)
- Ground suggestions in the philosophy
- Provide specific, actionable next steps
- Explain WHY through the lens of the triad, not just WHAT to fix

Remember: Creation is the discipline of removing what obscures.`;

/**
 * Get Claude's philosophical assessment of the audit results
 */
async function getClaudeAssessment(
  result: AuditResult,
  code: string
): Promise<string | null> {
  if (!anthropic) return null;

  const violationsSummary = [
    ...result.dry.violations.slice(0, 2).map(v => `- DRY: ${v.message}`),
    ...result.rams.violations.slice(0, 2).map(v => `- Rams: ${v.message}`),
    ...result.heidegger.violations.slice(0, 2).map(v => `- Heidegger: ${v.message}`),
  ].join('\n');

  const commendationsSummary = [
    ...result.dry.commendations.map(c => `- DRY: ${c}`),
    ...result.rams.commendations.map(c => `- Rams: ${c}`),
    ...result.heidegger.commendations.map(c => `- Heidegger: ${c}`),
  ].join('\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Provide a brief philosophical assessment of this code based on the Subtractive Triad audit:

**Scores:**
- DRY (Implementation): ${result.dry.score}/10
- Rams (Artifact): ${result.rams.score}/10
- Heidegger (System): ${result.heidegger.score}/10
- Overall: ${result.overall}/10

**Key Violations:**
${violationsSummary || 'None significant'}

**Commendations:**
${commendationsSummary || 'None'}

**Code preview:**
\`\`\`
${code.slice(0, 1000)}
\`\`\`

Write 3-4 sentences that:
1. Summarize the code's relationship to the Subtractive Triad
2. Identify the most important area for improvement
3. End with an actionable next step

Be philosophical but practical.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return null;
  } catch (error) {
    console.error('Claude API error:', error);
    return null;
  }
}

/**
 * POST /api/audit
 * Main audit endpoint
 */
app.post('/api/audit', async (req: Request, res: Response) => {
  try {
    const { code, filename = 'code.ts', language = 'typescript' } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (code.length > 100000) {
      return res.status(400).json({ error: 'Code too large (max 100KB)' });
    }

    // Run the audit
    const result = await runAudit(code, filename, language);

    // Get Claude's philosophical assessment if available
    const claudeAssessment = await getClaudeAssessment(result, code);

    return res.json({
      success: true,
      result,
      claudeAssessment,
      hasClaudeIntegration: !!anthropic,
    });
  } catch (error) {
    console.error('Audit error:', error);
    return res.status(500).json({
      error: 'Audit failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasClaudeIntegration: !!anthropic,
    version: '1.0.0',
  });
});

/**
 * Serve the frontend for any non-API route
 */
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../static/index.html'));
});

app.listen(PORT, () => {
  console.log(`Subtractive Triad Reviewer running on port ${PORT}`);
  console.log(`Claude integration: ${anthropic ? 'enabled' : 'disabled (set ANTHROPIC_API_KEY)'}`);
});
