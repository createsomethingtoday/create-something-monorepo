import type { FrozenControlActivation } from './control.js';

const ENDPOINT = 'https://id.createsomething.space/v1/control/scheduler-tokens/admin-issue';
const RESOURCE = 'https://create-something-agent-runtime.createsomething.workers.dev/mcp';

/** Uses the owning Identity issuance contract. The caller must still verify the
 * returned JWT and bind its scope/activation before executing any work.
 */
export async function issueControlSchedulerToken(apiKey: string, activation: FrozenControlActivation,
  request: typeof fetch = fetch): Promise<string> {
  try {
    if (!apiKey.trim()) throw new Error();
    const response = await request(ENDPOINT, { method: 'POST', redirect: 'manual',
      signal: AbortSignal.timeout(10_000), headers: { 'content-type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ activation_id: activation.id, account_id: activation.accountId,
        tenant_id: activation.tenantId, workspace_account_id: activation.workspaceAccountId,
        resource: RESOURCE, ttl_seconds: 300 }) });
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel();
      throw new Error();
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.length;
        if (length > 16_384) throw new Error();
        chunks.push(chunk.value);
      }
    } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (body.token_type !== 'Bearer' || typeof body.access_token !== 'string' || !body.access_token.trim() ||
        body.audience !== RESOURCE || body.activation_id !== activation.id || body.account_id !== activation.accountId ||
        body.tenant_id !== activation.tenantId || body.workspace_account_id !== activation.workspaceAccountId ||
        !Number.isInteger(body.expires_in) || body.expires_in < 60 || body.expires_in > 900)
      throw new Error();
    return body.access_token;
  } catch { throw new Error('control_scheduler_token_issuance_unavailable'); }
}
