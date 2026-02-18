/**
 * Interaction Atlas — OAuth Setup Flow
 * Cross-cutting: Orchestration
 *
 * One-time OAuth authorization flow:
 *   1. Start local HTTP server for callback
 *   2. Open browser to vendor's OAuth consent screen
 *   3. User authorizes → redirect to callback
 *   4. Exchange code for tokens, persist them
 *
 * Usage: pnpm auth
 *
 * This is procedural orchestration — deterministic, application-controlled,
 * not model-controlled. It belongs in orchestration/, not tools/.
 */

import { createServer } from 'node:http';

console.log('OAuth setup flow');
console.log('================');
console.log('');
console.log('TODO: Implement OAuth setup for your service.');
console.log('');
console.log('Template:');
console.log('  1. Read CLIENT_ID and CLIENT_SECRET from environment');
console.log('  2. Generate authorization URL with scopes');
console.log('  3. Start local server on port 3000 for callback');
console.log('  4. Open browser to authorization URL');
console.log('  5. Handle callback, exchange code for tokens');
console.log('  6. Persist tokens via FileTokenStore');
console.log('');
console.log('See packages/quickbooks-notion-mcp/src/auth-setup.ts for a complete example.');
