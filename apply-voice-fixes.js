import { applyAuditFixes } from './packages/harness-mcp/dist/bin/gemini-apply-fixes.js';

const issueId = process.argv[2];
if (!issueId) {
  console.error('Usage: node apply-voice-fixes.js <issue-id>');
  process.exit(1);
}

applyAuditFixes(issueId, process.cwd()).catch((error) => {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
