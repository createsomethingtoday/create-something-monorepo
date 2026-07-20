#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { programMap } from '../lib/data.js';
import { guideInputSchema, getNextInteraction, reviewEvidence } from '../lib/guide.js';
import type { EvidenceDraft, PlayerProfileInput } from '../lib/model.js';
import { LabService } from '../lib/server/lab-service.js';
import { JsonFileLabStore, labStore, type LabStore } from '../lib/server/store.js';
import type { GuardAccessScope } from '../lib/server/scope.js';

const textResult = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }], structuredContent: value as Record<string, unknown> });
const playerProfileInputSchema = z.object({
  age: z.number().int().min(5).max(99).nullable().optional(),
  gender: z.enum(['male', 'female', 'nonbinary', 'self-described']).nullable().optional(),
  primaryPosition: z.enum(['guard', 'wing', 'post']).nullable().optional(),
  preferredName: z.string().trim().max(100).optional(),
  dominantHand: z.enum(['left', 'right', 'both']).nullable().optional(),
  height: z.string().trim().max(40).optional(),
  goals: z.string().trim().max(800).optional(),
  experienceLevel: z.string().trim().max(120).optional(),
  jurisdiction: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(800).optional()
});

export type GuardMcpScope = GuardAccessScope;

export function createGuardLabMcpServer(store: LabStore = labStore, scope: GuardMcpScope) {
  const service = new LabService(store);
  const readWorkspace = async () => scope.role === 'player' ? service.getPlayerWorkspace(scope.playerId) : service.getWorkspace();
  const targetPlayerId = async (requested?: string) => {
    if (scope.role === 'player') {
      if (requested && requested !== scope.playerId) throw new Error('The requested operation is outside the assigned player scope.');
      return scope.playerId;
    }
    return requested ?? (await service.getWorkspace()).workspace.selectedPlayerId;
  };
  const mutationResult = async (result: Promise<unknown>) => { await result; return scope.role === 'player' ? service.getPlayerWorkspace(scope.playerId) : result; };
  const server = new McpServer({ name: 'guard-performance-lab', version: '0.5.0' });
  server.registerResource('guard-program-session-01', 'guard://program/session-01', { title: 'Guard Performance Lab Session 01', description: 'The complete first-session introduction, level transition, scheme/read, evidence, safety, and role-ownership map.', mimeType: 'application/json' }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(programMap, null, 2) }] }));
  server.registerResource('guard-workspace', 'guard://workspace/current', { title: 'Current Guard Lab Workspace', description: scope.role === 'player' ? 'The assigned player’s private records only.' : 'Private local players, receipts, evidence, and engagement managed by the app.', mimeType: 'application/json' }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify((await readWorkspace()).workspace, null, 2) }] }));

  server.registerTool('guard_get_workspace', { title: 'Read guard workspace', description: scope.role === 'player' ? 'Read only the assigned player’s profile, receipts, evidence, and engagement.' : 'Read current local players, receipts, evidence, and engagement.', annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async () => textResult(await readWorkspace()));
  server.registerTool('guard_next_interaction', { title: 'Guide next interaction', description: 'Return the next program-owned interaction from explicit stage, coach context, and evidence artifacts.', inputSchema: guideInputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (input) => textResult({ ok: true, guidance: getNextInteraction(input) }));
  server.registerTool('guard_review_evidence', { title: 'Review evidence artifacts', description: 'Separate sourced observations, inferences, and provenance gaps without ranking the player.', inputSchema: z.object({ playerId: z.string().optional() }), annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async ({ playerId }) => { const workspace = (await readWorkspace()).workspace; const effectivePlayer = scope.role === 'player' ? scope.playerId : playerId; const artifacts = workspace.artifacts.filter((a) => !effectivePlayer || a.playerId === effectivePlayer); return textResult({ ok: true, review: reviewEvidence(artifacts), artifacts }); });
  server.registerTool('guard_prepare_artifact_search', { title: 'Prepare sourced artifact search', description: 'Create provenance requirements and search prompts for Codex to locate collegiate/professional evidence using its own web tools.', inputSchema: z.object({ topic: z.string().min(2), level: z.enum(['college','nba']), jurisdiction: z.string().optional() }), annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async ({ topic, level, jurisdiction }) => textResult({ ok: true, queries: [`official ${level} statistics ${topic}`, `${level} video highlights ${topic}${jurisdiction ? ` ${jurisdiction}` : ''}`], requirements: ['Prefer official league, team, school, or broadcaster sources.', 'Record URL, source label, date captured, level, and jurisdiction when relevant.', 'Save direct observation separately from inference.', 'Link video; do not copy or republish it.'] }));
  if (scope.role === 'operator') server.registerTool('guard_create_player', { title: 'Create player profile', description: 'Create a private player profile with only known, necessary basketball context. Do not invent identity or sensitive minor data.', inputSchema: z.object({ name: z.string().trim().min(1).max(100), profile: playerProfileInputSchema.optional() }), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async ({ name, profile }) => textResult(await service.createPlayer(name, profile as PlayerProfileInput | undefined)));
  server.registerTool('guard_update_player_profile', { title: 'Update player-owned profile', description: scope.role === 'player' ? 'Update optional fields on the assigned player profile only.' : 'Update optional fields on one private player profile.', inputSchema: z.object({ playerId: z.string().optional(), profile: playerProfileInputSchema }), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async ({ playerId, profile }) => textResult(await mutationResult(service.updatePlayerProfile(await targetPlayerId(playerId), profile as PlayerProfileInput))));
  server.registerTool('guard_register_evidence', { title: 'Register evidence artifact', description: 'Register a sourced stat/rules/video link or a clearly labeled observation for the assigned player.', inputSchema: z.object({ playerId: z.string().optional(), kind: z.enum(['stat-line','video-highlight','rules-source','coach-observation']), title: z.string().min(1), sourceLabel: z.string().min(1), sourceUrl: z.string().url().optional(), level: z.enum(['youth','high-school','college','nba','general']), jurisdiction: z.string().optional(), observation: z.string().min(1) }), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async ({ playerId, ...input }) => textResult(await mutationResult(service.registerEvidence(await targetPlayerId(playerId), input as EvidenceDraft))));
  server.registerTool('guard_save_receipt', { title: 'Save session receipt', description: 'Save one observable strength, player words, next focus, and evidence levels for the assigned player.', inputSchema: z.object({ playerId: z.string().optional(), date: z.string().min(1), strength: z.string().min(1), nextFocus: z.string().min(1), playerWords: z.string().min(1) }), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async ({ playerId, ...input }) => textResult(await mutationResult(service.saveReceipt(await targetPlayerId(playerId), input))));
  server.registerTool('guard_record_engagement', { title: 'Record program engagement', description: 'Record an observable program interaction, pause, or completion for the assigned player.', inputSchema: z.object({ playerId: z.string().optional(), stage: z.enum(['prepare','connect','baseline','advantage','help','misdirection','live','receipt']), status: z.enum(['planned','active','paused','completed']), source: z.enum(['system','coach','player']), note: z.string().trim().min(1).max(800) }), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async ({ playerId, ...input }) => textResult(await mutationResult(service.recordEngagement(await targetPlayerId(playerId), { ...input, source: scope.role === 'player' ? 'player' : input.source }))));
  if (scope.role === 'operator') server.registerTool('guard_reset_workspace', { title: 'Reset local workspace', description: 'Destructively reset all local Guard Lab data. Requires confirm=RESET.', inputSchema: z.object({ confirm: z.literal('RESET') }), annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false } }, async () => textResult(await service.reset()));
  return server;
}

export function parseTrustedLauncherScope(env: Record<string, string | undefined>): GuardMcpScope {
  if (env.GUARD_LAB_MCP_LAUNCHER !== 'trusted') {
    throw new Error('Guard Lab stdio scope must come from a trusted launcher.');
  }
  const raw = env.GUARD_LAB_MCP_SCOPE?.trim();
  if (raw === 'operator') return { role: 'operator' };
  if (raw?.startsWith('player:') && raw.slice('player:'.length).trim()) {
    return { role: 'player', playerId: raw.slice('player:'.length).trim() };
  }
  throw new Error('Trusted launcher must set GUARD_LAB_MCP_SCOPE to operator or player:<assigned-player-id>.');
}

async function main() { const scope = parseTrustedLauncherScope(process.env); const server = createGuardLabMcpServer(new JsonFileLabStore(), scope); await server.connect(new StdioServerTransport()); console.error(`guard-performance-lab MCP running on stdio (${scope.role})`); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });
