import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateArcDocument, type ArcCommand } from '@create-something/arc/model';
import { arcCommandSchema } from '$lib/server/arc-command-schema';
import { parseArcExportRoute } from '$lib/server/arc-export';
import { applyPersistedArcCommand, getOrCreateAppReviewArc, listArcReceipts } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';

const protocolVersion = '2025-06-18';
const privateHeaders = { 'cache-control': 'no-store, private', 'mcp-protocol-version': protocolVersion };
type RpcRequest = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };

function rpc(id: unknown, result: unknown, status = 200) {
  return json({ jsonrpc: '2.0', id: id ?? null, result }, { status, headers: privateHeaders });
}

function rpcError(id: unknown, code: number, message: string, status = 400, data?: unknown) {
  return json({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } }, { status, headers: privateHeaders });
}

function toolResult(structuredContent: Record<string, unknown>, isError = false) {
  return {
    structuredContent,
    content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
    ...(isError ? { isError: true } : {})
  };
}

const tools = [
  { name: 'arc_get', title: 'Get Arc', description: 'Read the current governed Arc document, routes, and lifecycle state.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'object', properties: { document: { type: 'object' } }, required: ['document'] }, annotations: { readOnlyHint: true, idempotentHint: true } },
  { name: 'arc_preflight', title: 'Preflight Arc', description: 'Validate the composition, route references, and required governance metadata without changing state.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'object', properties: { valid: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['valid', 'issues'] }, annotations: { readOnlyHint: true, idempotentHint: true } },
  { name: 'arc_propose_scene_patch', title: 'Propose scene patch', description: 'Stage an agent-authored scene change for explicit human acceptance. This never approves or publishes.', inputSchema: { type: 'object', required: ['sceneId', 'kind', 'summary', 'patch', 'model', 'prompt'], properties: { sceneId: { type: 'string' }, kind: { enum: ['copy', 'layout', 'motion', 'map-focus', 'image', 'speaker-notes'] }, summary: { type: 'string' }, patch: { type: 'object' }, model: { type: 'string' }, prompt: { type: 'string' }, idempotencyKey: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false, idempotentHint: true } },
  { name: 'arc_apply_scene_command', title: 'Apply bounded scene command', description: 'Apply a validated scene or review-comment command. Lifecycle approval and publication use separate human-confirmed tools.', inputSchema: { type: 'object', required: ['command'], properties: { command: { type: 'object' }, idempotencyKey: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false, idempotentHint: true } },
  { name: 'arc_request_review', title: 'Request Arc review', description: 'Move a saved draft into human review and write a receipt.', inputSchema: { type: 'object', properties: { idempotencyKey: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false, idempotentHint: true } },
  { name: 'arc_review_decision', title: 'Record human review decision', description: 'Approve or return the Arc only after an operator supplies explicit human confirmation.', inputSchema: { type: 'object', required: ['decision', 'reason', 'humanConfirmation'], properties: { decision: { enum: ['approve', 'reject'] }, reason: { type: 'string' }, humanConfirmation: { const: 'I am the human reviewer' }, idempotencyKey: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } },
  { name: 'arc_publish', title: 'Publish approved Arc', description: 'Publish the approved immutable Arc version after explicit human confirmation.', inputSchema: { type: 'object', required: ['humanConfirmation'], properties: { humanConfirmation: { const: 'I approve publication' }, idempotencyKey: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } },
  { name: 'arc_recover', title: 'Recover Arc draft', description: 'Create a new editable draft from a retained published, superseded, or archived Arc.', inputSchema: { type: 'object', properties: { idempotencyKey: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false, idempotentHint: true } },
  { name: 'arc_export', title: 'Get Arc export URLs', description: 'Return protected Web, PDF, and JSON export URLs for an Arc, Playbook, or Runbook route.', inputSchema: { type: 'object', properties: { routeId: { enum: ['app-review-governance-arc', 'app-review-governance-playbook', 'app-review-governance-runbook'] } }, additionalProperties: false }, annotations: { readOnlyHint: true, idempotentHint: true } }
];

const sceneCommands = new Set(['add_scene', 'duplicate_scene', 'remove_scene', 'reorder_scene', 'patch_scene', 'set_scene_lock', 'set_scene_hidden', 'attach_media', 'decide_scene_proposal', 'add_comment', 'resolve_comment']);

export const POST: RequestHandler = async ({ locals, platform, request, url }) => {
  if (!locals.admin) return rpcError(null, -32001, 'Admin login required.', 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return rpcError(null, -32002, 'Cross-origin MCP requests are not allowed.', 403);
  const accept = request.headers.get('accept') ?? '';
  if (accept && !accept.includes('application/json') && !accept.includes('*/*')) return rpcError(null, -32003, 'Accept application/json.', 406);
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return rpcError(null, -32600, 'Use application/json.', 415);
  const message = await request.json().catch(() => null) as RpcRequest | null;
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return rpcError(message?.id, -32600, 'Invalid JSON-RPC request.');

  if (message.method === 'initialize') {
    return rpc(message.id, { protocolVersion, capabilities: { resources: {}, tools: { listChanged: false } }, serverInfo: { name: 'J&J Arc', version: '1.0.0' }, instructions: 'Use Arc resources for context. Agents propose; a human accepts, approves, and publishes.' });
  }
  if (message.method === 'notifications/initialized' || message.method === 'notifications/cancelled') return new Response(null, { status: 202, headers: privateHeaders });
  if (message.method === 'ping') return rpc(message.id, {});
  if (message.method === 'tools/list') return rpc(message.id, { tools });
  if (message.method === 'resources/list') {
    return rpc(message.id, { resources: [
      { uri: 'arc://app-review-governance/document', name: 'Current App Review Governance Arc', mimeType: 'application/json' },
      { uri: 'arc://app-review-governance/routes', name: 'Arc, Playbook, and Runbook routes', mimeType: 'application/json' },
      { uri: 'arc://app-review-governance/receipts', name: 'Recent Arc receipts', mimeType: 'application/json' },
      { uri: 'arc://app-review-governance/preflight', name: 'Current Arc preflight', mimeType: 'application/json' }
    ] });
  }

  const db = getDb(platform);
  const document = await getOrCreateAppReviewArc(db);
  if (message.method === 'resources/read') {
    const uri = (message.params as { uri?: unknown } | undefined)?.uri;
    let value: unknown;
    if (uri === 'arc://app-review-governance/document') value = document;
    else if (uri === 'arc://app-review-governance/routes') value = document.composition.routes;
    else if (uri === 'arc://app-review-governance/receipts') value = await listArcReceipts(db, document.id);
    else if (uri === 'arc://app-review-governance/preflight') { const issues = validateArcDocument(document); value = { valid: !issues.length, issues }; }
    else return rpcError(message.id, -32004, 'Arc resource not found.', 404);
    return rpc(message.id, { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(value, null, 2) }] });
  }

  if (message.method !== 'tools/call') return rpcError(message.id, -32601, 'Method not found.', 404);
  const params = message.params as { name?: unknown; arguments?: unknown } | undefined;
  const name = typeof params?.name === 'string' ? params.name : '';
  const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments as Record<string, unknown> : {};
  const mutate = async (command: ArcCommand) => applyPersistedArcCommand(db, { arcId: document.id, actor: locals.admin!.email, command, idempotencyKey: typeof args.idempotencyKey === 'string' ? args.idempotencyKey : crypto.randomUUID() });

  try {
    if (name === 'arc_get') return rpc(message.id, toolResult({ document }));
    if (name === 'arc_preflight') { const issues = validateArcDocument(document); return rpc(message.id, toolResult({ valid: !issues.length, issues })); }
    if (name === 'arc_export') {
      const routeId = parseArcExportRoute(typeof args.routeId === 'string' ? args.routeId : null);
      const base = `${url.origin}/api/arcs/${document.id}/export`;
      return rpc(message.id, toolResult({ arcId: document.id, revision: document.revision, routeId, urls: { web: `${base}/web?route=${routeId}`, pdf: `${base}/pdf?route=${routeId}`, json: `${base}/json?route=${routeId}` } }));
    }
    let command: ArcCommand;
    if (name === 'arc_propose_scene_patch') command = { type: 'propose_scene_patch', sceneId: String(args.sceneId ?? ''), kind: args.kind as 'copy', summary: String(args.summary ?? ''), patch: args.patch as never, model: String(args.model ?? ''), prompt: String(args.prompt ?? '') };
    else if (name === 'arc_apply_scene_command') {
      const parsed = arcCommandSchema.safeParse(args.command);
      if (!parsed.success || !sceneCommands.has(parsed.data.type)) return rpc(message.id, toolResult({ error: 'Use a valid bounded scene or comment command.', issues: parsed.success ? [] : parsed.error.issues }, true));
      command = parsed.data;
    } else if (name === 'arc_request_review') command = { type: 'request_review' };
    else if (name === 'arc_review_decision') {
      if (args.humanConfirmation !== 'I am the human reviewer') return rpc(message.id, toolResult({ error: 'Explicit human reviewer confirmation is required.' }, true));
      command = args.decision === 'reject' ? { type: 'reject', reason: String(args.reason ?? '') } : { type: 'approve', reason: String(args.reason ?? '') };
    } else if (name === 'arc_publish') {
      if (args.humanConfirmation !== 'I approve publication') return rpc(message.id, toolResult({ error: 'Explicit human publication confirmation is required.' }, true));
      command = { type: 'publish' };
    } else if (name === 'arc_recover') command = { type: 'recover' };
    else return rpcError(message.id, -32602, `Unknown Arc tool: ${name}.`);
    const parsed = arcCommandSchema.safeParse(command);
    if (!parsed.success) return rpc(message.id, toolResult({ error: 'Invalid Arc command.', issues: parsed.error.issues }, true));
    const result = await mutate(parsed.data);
    return rpc(message.id, toolResult(result as unknown as Record<string, unknown>));
  } catch (cause) {
    return rpc(message.id, toolResult({ error: cause instanceof Error ? cause.message : 'Arc tool call failed.' }, true));
  }
};

export const GET: RequestHandler = () => new Response('Arc MCP uses authenticated Streamable HTTP POST.', { status: 405, headers: { ...privateHeaders, allow: 'POST' } });
