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
export {};
//# sourceMappingURL=oauth-setup.d.ts.map