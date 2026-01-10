#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
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
  const lines = readFileSync(beadsPath, 'utf-8').split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const issue = JSON.parse(line);
      if (issue.id === issueId) {
        return issue;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractFilePath(description: string): string | null {
  // Extract file path from description
  const match = description.match(/packages\/[^\s:]+\.svelte/);
  return match ? match[0] : null;
}

function findAuditFile(issueDescription: string, cwd: string): string | null {
  // Extract reference to original audit issue (e.g., "Reference: .beads/voice-audits/csm-xyyjx.md")
  const refMatch = issueDescription.match(/Reference:\s*\.beads\/voice-audits\/(csm-\w+)\.md/);
  if (!refMatch) return null;

  const auditPath = join(cwd, '.beads', 'voice-audits', `${refMatch[1]}.md`);
  return auditPath;
}

export async function applyAuditFixes(issueId: string, cwd: string): Promise<void> {
  console.log(`\n🔧 Applying voice audit fixes for issue ${issueId}...\n`);

  // 1. Read Beads issue
  const issue = readBeadsIssue(issueId, cwd);
  if (!issue) {
    throw new Error(`Issue ${issueId} not found`);
  }

  console.log(`📋 Issue: ${issue.title}`);

  // 2. Extract file path
  const filePath = extractFilePath(issue.description || '');
  if (!filePath) {
    throw new Error('Could not extract file path from issue description');
  }

  console.log(`📄 File: ${filePath}`);

  // 3. Find original audit file
  const auditPath = findAuditFile(issue.description || '', cwd);
  if (!auditPath) {
    throw new Error('Could not find reference to original audit in issue description');
  }

  console.log(`📝 Audit: ${auditPath.replace(cwd + '/', '')}`);

  // 4. Read file content
  const fullPath = join(cwd, filePath);
  const originalContent = readFileSync(fullPath, 'utf-8');

  // 5. Read audit findings
  const auditContent = readFileSync(auditPath, 'utf-8');

  // 6. Build prompt for Gemini to apply fixes
  const prompt = `You are a code editor applying voice audit findings to improve clarity and accessibility.

TASK: Apply the recommended changes from the voice audit to the file.

FILE TO EDIT: ${filePath}

CURRENT CONTENT:
\`\`\`svelte
${originalContent}
\`\`\`

VOICE AUDIT FINDINGS:
${auditContent}

INSTRUCTIONS:
1. Apply ONLY the recommended changes listed in the voice audit
2. Make NO other modifications to the file
3. Preserve all formatting, indentation, and structure
4. Return the COMPLETE modified file content (not a diff)
5. Ensure all changes improve clarity while preserving meaning

OUTPUT FORMAT:
Return the complete modified file wrapped in \`\`\`svelte code blocks.`;

  console.log(`\n🤖 Calling Gemini to apply fixes...\n`);

  // 7. Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for consistent edits
          maxOutputTokens: 16000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  console.log(`\n📝 Response length: ${text.length} chars`);
  console.log(`📝 First 200 chars: ${text.substring(0, 200)}...`);
  console.log(`📝 Last 200 chars: ...${text.substring(text.length - 200)}`);

  // 8. Extract code from response
  let modifiedContent: string;

  // Try svelte code block first (closed properly)
  let codeMatch = text.match(/```svelte\s*\n([\s\S]*?)\n```/);
  if (codeMatch) {
    modifiedContent = codeMatch[1];
  } else {
    // Try unclosed code block (Gemini sometimes doesn't close it)
    codeMatch = text.match(/```svelte\s*\n([\s\S]*?)$/);
    if (codeMatch) {
      modifiedContent = codeMatch[1];
      console.log('\n⚠️  Note: Code block wasn\'t closed properly, but extracted anyway');
    } else {
      // Try generic code block
      codeMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
      if (codeMatch) {
        modifiedContent = codeMatch[1];
      } else {
        // Log response and fail
        console.log('\n⚠️  Could not extract code. Gemini response preview:');
        console.log(text.substring(0, 500) + '...');
        throw new Error('Could not extract code from Gemini response - no code blocks found');
      }
    }
  }

  // 9. Write modified file
  writeFileSync(fullPath, modifiedContent, 'utf-8');

  console.log(`✅ Applied fixes to ${filePath}`);
  console.log(`\n📊 Changes:`);
  console.log(`   Original: ${originalContent.length} chars`);
  console.log(`   Modified: ${modifiedContent.length} chars`);
  console.log(`   Diff: ${modifiedContent.length - originalContent.length > 0 ? '+' : ''}${modifiedContent.length - originalContent.length} chars`);

  // 10. Create summary
  const summaryPath = join(cwd, `.beads/voice-fixes/${issueId}-applied.md`);
  const summary = `# Voice Fixes Applied: ${issue.title}

**Issue:** ${issueId}
**File:** ${filePath}
**Applied:** ${new Date().toISOString()}

## Changes Applied

See original audit at: ${auditPath.replace(cwd + '/', '')}

## Result

✅ All recommended changes from voice audit have been applied.

**Original size:** ${originalContent.length} chars
**Modified size:** ${modifiedContent.length} chars
**Change:** ${modifiedContent.length - originalContent.length > 0 ? '+' : ''}${modifiedContent.length - originalContent.length} chars
`;

  const fs = await import('node:fs');
  const summaryDir = join(cwd, '.beads/voice-fixes');
  if (!fs.existsSync(summaryDir)) {
    fs.mkdirSync(summaryDir, { recursive: true });
  }
  fs.writeFileSync(summaryPath, summary, 'utf-8');

  console.log(`\n💾 Summary saved to: ${summaryPath.replace(cwd + '/', '')}`);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const issueId = process.argv[2];
  const cwd = process.cwd();

  if (!issueId) {
    console.error('Usage: gemini-apply-fixes <issue-id>');
    process.exit(1);
  }

  applyAuditFixes(issueId, cwd).catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}
