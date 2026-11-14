import { z } from 'zod';
import { BundleError } from './bundle-contract';
import { digest } from './auth';
import { catalog, toolData, McpToolFailure, type Tool } from './mcp';
import { ProviderFailure } from './provider';

export const actions = {
  approve: 'app_review_approve_version',
  reject: 'app_review_reject_version',
  changes: 'app_review_request_changes',
  message: 'app_review_send_ticket_followup'
} as const;
const preMutationRefusals = new Set([
  'INVALID_INPUT',
  'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE',
  'VERSION_NOT_FOUND',
  'VERSION_SCOPE_ERROR',
  'ZENDESK_NOT_CONFIGURED',
  'NO_ZENDESK_TICKET',
  'INVALID_TICKET_ID',
  'REVIEW_STATUS_CONFIRMATION_REQUIRED',
  'REVIEW_STATUS_CONFLICT',
  'INVALID_REQUEST_CHANGES_STATUS'
]);
import { rejectionReasons } from './review-contract';
export const actionSchema = z
  .object({
    id: z.string().uuid(),
    action: z.enum(['approve', 'reject', 'changes', 'message']),
    versionId: z.string().regex(/^rec[a-zA-Z0-9]{14}$/),
    confirmed: z.literal(true),
    expectedStatus: z.string().nullable(),
    expectedTicketId: z.string().nullable(),
    text: z.string().trim().max(20000),
    reason: z.enum(rejectionReasons).optional()
  })
  .strict()
  .superRefine((v, c) => {
    if (v.action !== 'approve' && !v.text)
      c.addIssue({ code: 'custom', message: 'Feedback or message text is required.' });
    if (v.action === 'reject' && !v.reason)
      c.addIssue({ code: 'custom', message: 'Rejection reason is required.' });
  });
export function capabilities(
  tools: Tool[]
): Record<'queue' | 'bundles' | 'approve' | 'reject' | 'changes' | 'message', boolean> {
  const names = new Set(tools.map((t) => t.name));
  return {
    queue: names.has('app_review_list_queue'),
    bundles: true,
    ...(Object.fromEntries(Object.entries(actions).map(([k, v]) => [k, names.has(v)])) as Record<
      keyof typeof actions,
      boolean
    >)
  };
}
export function requireTool(tools: Tool[], name: string) {
  if (!tools.some((t) => t.name === name))
    throw new BundleError(
      'ACTION_NOT_ALLOWED',
      'Your MCP connection does not grant this action.',
      403
    );
}
export async function performAction(
  db: D1Database,
  owner: string,
  raw: unknown,
  rpc: (method: string, params?: unknown) => Promise<any>
) {
  const data = actionSchema.parse(raw),
    hash = await digest(JSON.stringify({ ...data, id: undefined }));
  const prior = await db
    .prepare('SELECT * FROM portal_actions WHERE id = ? AND owner_id = ?')
    .bind(data.id, owner)
    .first<any>();
  if (prior) {
    if (prior.arguments_hash !== hash)
      throw new BundleError(
        'ACTION_KEY_CONFLICT',
        'This confirmation has already been used for different content.',
        409
      );
    return { receipt: prior, duplicate: true };
  }
  const tools = await catalog(rpc);
  requireTool(tools, actions[data.action]);
  requireTool(tools, 'app_review_get_version');
  const { version } = toolData(
    await rpc('tools/call', {
      name: 'app_review_get_version',
      arguments: { version_id: data.versionId }
    })
  );
  if (
    (version.reviewStatus ?? null) !== data.expectedStatus ||
    (version.zendeskTicketId ?? null) !== data.expectedTicketId
  )
    throw new BundleError(
      'REVIEW_CHANGED',
      'This submission changed. Reload it and review the action again.',
      409
    );
  if (data.action === 'message' && !version.zendeskTicketId)
    throw new BundleError(
      'NO_TICKET',
      'This submission has no linked developer conversation.',
      409
    );
  const inserted = await db
    .prepare(
      "INSERT OR IGNORE INTO portal_actions (id,owner_id,action,target_id,arguments_hash,status,created_at) VALUES (?,?,?,?,?,'pending',?)"
    )
    .bind(data.id, owner, data.action, data.versionId, hash, new Date().toISOString())
    .run();
  if (!inserted.meta.changes)
    throw new BundleError(
      'ACTION_PENDING',
      'This confirmation is already being processed. Check activity.',
      409
    );
  const args =
    data.action === 'message'
      ? { version_id: data.versionId, message: data.text, visibility: 'public' }
      : {
          version_id: data.versionId,
          review_feedback: data.text,
          ...(data.action === 'reject' ? { rejection_reason: data.reason } : {})
        };
  try {
    const result = toolData(
      await rpc('tools/call', { name: actions[data.action], arguments: args })
    );
    await db
      .prepare(
        "UPDATE portal_actions SET status='completed', result_json=? WHERE id=? AND owner_id=?"
      )
      .bind(JSON.stringify(result), data.id, owner)
      .run();
    return { id: data.id, status: 'completed', result };
  } catch (error) {
    const status =
      (error instanceof ProviderFailure && !error.uncertain) ||
      (error instanceof McpToolFailure && preMutationRefusals.has(error.providerCode))
        ? 'rejected'
        : 'unknown';
    await db
      .prepare('UPDATE portal_actions SET status=?,result_json=? WHERE id=? AND owner_id=?')
      .bind(
        status,
        JSON.stringify({
          message:
            status === 'unknown'
              ? 'Outcome is unknown. Check Airtable or Zendesk before issuing another action.'
              : 'The provider rejected the action.'
        }),
        data.id,
        owner
      )
      .run();
    throw error;
  }
}

export async function reconciliationContext(
  db: D1Database,
  owner: string,
  id: string,
  rpc: (method: string, params?: unknown) => Promise<any>
) {
  z.string().uuid().parse(id);
  const receipt = await db
    .prepare('SELECT * FROM portal_actions WHERE id=? AND owner_id=?')
    .bind(id, owner)
    .first<any>();
  if (!receipt) throw new BundleError('NOT_FOUND', 'Receipt not found.', 404);
  const tools = await catalog(rpc);
  requireTool(tools, 'app_review_get_version');
  const current = toolData(
    await rpc('tools/call', {
      name: 'app_review_get_version',
      arguments: { version_id: receipt.target_id }
    })
  );
  let thread: unknown = null;
  if (receipt.action === 'message' && current.version.zendeskTicketId) {
    requireTool(tools, 'app_review_get_ticket_thread');
    thread = toolData(
      await rpc('tools/call', {
        name: 'app_review_get_ticket_thread',
        arguments: { version_id: receipt.target_id, limit: 50 }
      })
    );
  }
  return { receipt, current, thread };
}
export async function reconcileAction(
  db: D1Database,
  owner: string,
  id: string,
  input: unknown,
  rpc: (method: string, params?: unknown) => Promise<any>
) {
  const data = z
    .object({
      confirmed: z.literal(true),
      outcome: z.enum(['observed_completed', 'observed_not_applied']),
      note: z.string().trim().min(20).max(4000)
    })
    .strict()
    .parse(input);
  const context = await reconciliationContext(db, owner, id, rpc);
  if (!['pending', 'unknown'].includes(context.receipt.status))
    throw new BundleError('NOT_PENDING', 'This receipt does not need reconciliation.', 409);
  // Do not release an in-flight call while it could still complete.
  if (Date.now() - Date.parse(context.receipt.created_at) < 120000)
    throw new BundleError(
      'STILL_PENDING',
      'Wait two minutes for the original request to settle before reconciliation.',
      409
    );
  const result = {
    originalResult: context.receipt.result_json ? JSON.parse(context.receipt.result_json) : null,
    reconciliation: {
      ...data,
      reviewer: owner,
      at: new Date().toISOString(),
      observedVersion: context.current.version,
      observedThread: context.thread
    }
  };
  await db
    .prepare(
      "UPDATE portal_actions SET status='reconciled',result_json=? WHERE id=? AND owner_id=? AND status IN ('pending','unknown')"
    )
    .bind(JSON.stringify(result), id, owner)
    .run();
  return { id, status: 'reconciled', officialReviewChanged: false, developerMessageSent: false };
}
