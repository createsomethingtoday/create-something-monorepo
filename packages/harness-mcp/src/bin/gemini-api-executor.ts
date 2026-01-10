/**
 * Direct Gemini API executor using API key (bypasses OAuth CLI)
 *
 * Uses the Gemini REST API directly with the provided API key
 * to avoid quota limitations on OAuth free tier.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GEMINI_API_KEY = 'AIzaSyDQdJaHKDo6ARQ30sOrAE6wUKBMIGSYFmc';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

interface BeadsIssue {
  id: string;
  title: string;
  description?: string;
  labels?: string[];
  status?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
      }>;
    };
  }>;
}

function readBeadsIssue(issueId: string, cwd: string): BeadsIssue | null {
  const beadsPath = join(cwd, '.beads', 'issues.jsonl');

  try {
    const content = readFileSync(beadsPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const issue = JSON.parse(line) as BeadsIssue;
        if (issue.id === issueId) {
          return issue;
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to read Beads issue ${issueId}:`, (error as Error).message);
    return null;
  }
}

function extractFilePath(description: string): string | null {
  // Extract file path from description like "Review packages/io/src/routes/papers/norvig-partnership/+page.svelte"
  const match = description.match(/packages\/[^\s]+\.svelte/);
  return match ? match[0] : null;
}

export async function executeWithGeminiAPI(issueId: string, cwd: string): Promise<void> {
  console.log(`\n🤖 Executing with Gemini API (${GEMINI_MODEL})...`);

  // Read the Beads issue
  const issue = readBeadsIssue(issueId, cwd);
  if (!issue) {
    throw new Error(`Issue ${issueId} not found`);
  }

  console.log(`   Issue: ${issue.title}`);

  // Extract file path from description
  const filePath = issue.description ? extractFilePath(issue.description) : null;
  if (!filePath) {
    throw new Error(`Could not extract file path from issue description`);
  }

  console.log(`   File: ${filePath}`);

  // Read the file content
  const fullPath = join(cwd, filePath);
  let fileContent: string;
  try {
    fileContent = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
  }

  console.log(`   Size: ${fileContent.length} chars`);

  // Build the prompt with file content
  const prompt = `You are a writing editor reviewing content against "Nicely Said" writing principles.

TASK: Review the following file for voice and clarity issues.

FILE: ${filePath}
CONTENT:
\`\`\`
${fileContent}
\`\`\`

REVIEW CRITERIA (from voice-canon.md):
1. Marketing jargon - Flag: cutting-edge, revolutionary, leverage, synergy, solutions, seamless, robust
2. Vague claims - Flag: significantly improved, many users, better outcomes, considerable improvements
3. Specificity - All claims should be measurable with numbers
4. Structure - Lead with outcome or insight, philosophy earns place after metrics
5. Clarity - Prefer shorter words, active voice, plain language

OUTPUT FORMAT:
For each issue found, provide:
- Line number (approximate)
- Problem type (jargon/vague/specificity/structure/clarity)
- Current text
- Recommended change
- Rationale

If no issues found, say "No voice issues detected - content follows Nicely Said principles."`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,  // Lower temperature for more consistent reviews
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates[0]?.content?.parts[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini API');
    }

    console.log('\n📝 Voice Audit Results:');
    console.log('─'.repeat(80));
    console.log(text);
    console.log('─'.repeat(80));

    // Write results to a file for later review
    const resultsPath = join(cwd, `.beads/voice-audits/${issueId}.md`);
    try {
      const fs = await import('node:fs');
      const dir = join(cwd, '.beads/voice-audits');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const markdown = `# Voice Audit: ${issue.title}

**Issue:** ${issueId}
**File:** ${filePath}
**Date:** ${new Date().toISOString()}

---

${text}
`;

      fs.writeFileSync(resultsPath, markdown, 'utf-8');
      console.log(`\n💾 Results saved to: ${resultsPath}`);
    } catch (error) {
      console.warn(`\n⚠️  Could not save results: ${(error as Error).message}`);
    }

    console.log('\n✅ Voice audit complete.');

  } catch (error) {
    console.error('\n❌ Gemini API execution failed:', (error as Error).message);
    throw error;
  }
}
