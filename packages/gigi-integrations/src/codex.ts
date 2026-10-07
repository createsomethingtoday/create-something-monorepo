import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { Effect } from 'effect';
import { isDeepStrictEqual } from 'node:util';

type Json = Record<string, any>;
type State = 'idle' | 'running' | 'approval' | 'interrupted' | 'failed';
type RecordRef = { entity: string; id: string; title?: string };
type DecisionReceipt = { approvalId: string; outcome: 'verified' | 'rejected' | 'failed' | 'unknown' };
type Session = { sessionId: string; threadId: string; workspaceId: string; title: string; record?: RecordRef; state: State; turnId?: string; pendingMessageId?: string; cancelPending?: boolean; decisionReceipt?: DecisionReceipt; error?: string; uncertainWrite?: { tool: string; arguments: Json }; createdAt: number };
type Approval = { id: string; title: string; detail: string; requestId: string | number; sessionId: string; kind: 'server' | 'tool'; tool?: string; arguments?: Json };
export type ChatRead = { sessionId: string; messages: Array<{ id: string; role: 'user' | 'assistant'; text: string }>; state: State; approvals: Array<{ id: string; title: string; detail: string }>; recordLinks: RecordRef[]; decisionReceipt?: DecisionReceipt; error?: string };
export interface AppServer { request(method: string, params: Json): Promise<any>; onMessage(handler: (message: Json) => void): () => void; reply(id: string | number, result: unknown): Promise<void> | void; close?(): Promise<void> | void }
export type CodexOptions = { dataDir: string; mcpBinary: string; skillPath: string; server: AppServer; mcp?: AppServer };

function savedEditMatches(actual: Json, intended: Json): boolean {
  if (actual?.id !== intended.id || typeof intended.title !== 'string' || actual?.title !== intended.title.trim()) return false;
  const fields = asObject(intended.fields);
  const fieldsMatch = intended.fieldsMode === 'replace'
    ? isDeepStrictEqual(actual?.fields, fields)
    : Object.entries(fields).every(([key, value]) => isDeepStrictEqual(actual?.fields?.[key], value));
  let source = intended.source;
  const priorSource = intended.expectedRecord?.source;
  if (source?.kind === 'manual' && priorSource && priorSource.kind !== 'manual') source = { ...source, origin: priorSource };
  return fieldsMatch && (source === undefined || isDeepStrictEqual(actual?.source, source));
}

const READ_TOOLS = new Set(['gigi_workspace_get', 'gigi_schema_describe', 'gigi_records_list', 'gigi_records_get', 'gigi_gigs_summary', 'gigi_history_list', 'gigi_context_search']);
const WRITE_TOOLS = new Set(['gigi_records_save']);
const MAX_SESSIONS = 100;
const MAX_TEXT = 16_384;

function required(value: unknown, limit = 512): string { if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('invalid_request'); return value; }
function validRecord(value: unknown): RecordRef | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object') throw new Error('invalid_request');
  const v = value as Json; return { entity: required(v.entity), id: required(v.id), ...(typeof v.title === 'string' ? { title: v.title.slice(0, 512) } : {}) };
}
function asObject(value: unknown): Json { return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}; }
function textContent(items: unknown): string { return Array.isArray(items) ? items.filter(x => x?.type === 'text').map(x => x.text).join('\n') : ''; }

export function createCodexAdapter(options: CodexOptions) {
  if (!isAbsolute(options.dataDir) || !isAbsolute(options.mcpBinary) || !isAbsolute(options.skillPath)) throw new Error('unconfigured');
  const root = join(options.dataDir, 'codex-chat');
  const ledger = join(root, 'sessions.jsonl');
  const sessions = new Map<string, Session>();
  const approvals = new Map<string, Approval>();
  const loadedThreads = new Set<string>();
  const liveMessages = new Map<string, Map<string, { text: string; turnId?: string }>>();
  let loaded = false;
  let queue = Promise.resolve();

  async function load(): Promise<void> {
    if (loaded) return;
    await mkdir(root, { recursive: true, mode: 0o700 });
    try {
      const raw = await readFile(ledger, 'utf8');
      if (Buffer.byteLength(raw) > 1_000_000 || raw.split('\n').length > MAX_SESSIONS + 2) throw new Error('chat_ledger_invalid');
      for (const line of raw.split('\n')) {
        if (!line) continue;
        const value = JSON.parse(line) as Session;
        if (typeof value.sessionId !== 'string' || typeof value.threadId !== 'string' || typeof value.workspaceId !== 'string' || !['idle', 'running', 'approval', 'interrupted', 'failed'].includes(value.state)) throw new Error('chat_ledger_invalid');
        sessions.set(value.sessionId, value);
      }
    } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
    loaded = true;
    let recovered = false;
    for (const session of sessions.values()) if (session.state === 'running' || session.state === 'approval') { session.state = 'interrupted'; if (session.turnId) session.cancelPending = true; recovered = true; }
    if (recovered) await persist();
  }
  async function persist(): Promise<void> {
    queue = queue.then(async () => {
      await mkdir(root, { recursive: true, mode: 0o700 });
      const entries = [...sessions.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_SESSIONS);
      const temp = join(root, `.sessions-${randomUUID()}.tmp`);
      await writeFile(temp, entries.map(x => JSON.stringify(x)).join('\n') + '\n', { mode: 0o600 });
      await rename(temp, ledger);
    });
    await queue;
  }
  async function owner(input: Json): Promise<Session> {
    await load();
    const session = sessions.get(required(input.sessionId));
    if (!session || session.workspaceId !== required(input.workspaceId)) throw new Error('session_not_found');
    return session;
  }
  async function status() {
    try {
      const account = await options.server.request('account/read', { refreshToken: false });
      if (account?.account?.type !== 'chatgpt') return { provider: 'codex' as const, available: true, authenticated: false, reason: 'chatgpt_auth_required' };
      return { provider: 'codex' as const, available: true, authenticated: true };
    } catch { return { provider: 'codex' as const, available: false, authenticated: false, reason: 'codex_unavailable' }; }
  }
  async function requireAuth(): Promise<void> { const s = await status(); if (!s.authenticated) throw new Error(s.reason); }
  async function dynamicTools() {
    if (!options.mcp) return [];
    const result = await options.mcp.request('tools/list', {});
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return [{ type: 'namespace', name: 'gigi', description: 'GiGi private workspace tools', tools: tools.filter((x: Json) => READ_TOOLS.has(x.name) || WRITE_TOOLS.has(x.name)).map((x: Json) => ({ type: 'function', name: x.name, description: x.name === 'gigi_records_save' ? `${x.description} In GiGi chat, calling this tool prepares a held edit proposal for user approval. It does not execute the write until the user approves in the app. Call it to request approval instead of asking in prose.` : x.name === 'gigi_records_get' ? `${x.description} For gigs, raw fields.Fee and Amount are integer minor-currency-unit values, not display amounts. MUST use gigi_gigs_summary feeCents and its currency for gig fee reporting. For standalone finance amounts, use the record's currency and schema; never infer currency.` : x.name === 'gigi_gigs_summary' ? `${x.description} feeCents and other *Cents amounts are integer minor units. Use the returned currency; for USD, divide by 100 to report dollars. Do not infer currency.` : x.description, inputSchema: x.inputSchema })) }];
  }
  function profile(tools: unknown, session?: Pick<Session, 'workspaceId' | 'record'>) {
    return {
      cwd: root, runtimeWorkspaceRoots: [], modelProvider: 'openai', sandbox: 'read-only', approvalPolicy: 'on-request', approvalsReviewer: 'user', ephemeral: false,
      config: { model_provider: 'openai', forced_login_method: 'chatgpt', mcp_servers: {}, projects: {}, web_search: 'disabled', features: { shell_tool: false, unified_exec: false, browser_use: false, computer_use: false, standalone_web_search: false } },
      dynamicTools: tools,
      baseInstructions: `You are GiGi chat for the private workspace ${JSON.stringify(session?.workspaceId ?? '')}. ${session?.record ? `The selected record is entity ${JSON.stringify(session.record.entity)} with id ${JSON.stringify(session.record.id)}.` : ''} Use only the supplied GiGi dynamic tools. Never invoke shell, files, network, other MCP servers, plugins, or applications. To report any gig fee or gig-linked financial amount, MUST call gigi_gigs_summary and use its feeCents and currency. Raw fields.Fee, fields.Amount, and all *Cents amounts are integer minor-currency-unit values, not display amounts. For USD, 100 cents is $1.00. For standalone finance amounts, consult the schema and record currency. Never infer currency from a raw amount. To propose an edit of an existing record, call gigi_records_save with its id and the intended change. GiGi intercepts that call before execution and shows it to the user for approval. The call makes no write until the user approves. Even when the user says to wait for approval, submit the held tool call as the approval request instead of asking for approval in prose. Do not claim a write succeeded without tool readback.`,
      developerInstructions: 'Only GiGi dynamic tools are authorized. Do not use inherited plugins, skills, shell, files, browser, or other external tools. A gigi_records_save call is only an approval proposal until GiGi returns a tool result after user approval.',
    };
  }
  async function start(input: Json): Promise<{ sessionId: string }> {
    await load(); await requireAuth();
    if (sessions.size >= MAX_SESSIONS) throw new Error('session_limit');
    const workspaceId = required(input.workspaceId); const message = input.message === undefined ? undefined : required(input.message, MAX_TEXT); const record = validRecord(input.record);
    if (!options.mcp) throw new Error('gigi_tools_unavailable');
    const workspace = await options.mcp.request('tools/call', { name: 'gigi_workspace_get', arguments: { workspaceId } });
    if (workspace?.isError || !Array.isArray(workspace?.content) || !workspace.content.some((x: Json) => x.type === 'text' && (() => { try { return JSON.parse(x.text)?.id === workspaceId; } catch { return false; } })())) throw new Error('workspace_not_found');
    if (record) {
      const selected = await options.mcp.request('tools/call', { name: 'gigi_records_get', arguments: { workspaceId, entity: record.entity, id: record.id } });
      if (selected.isError) throw new Error('record_not_found');
      const value = selected.structuredContent ?? JSON.parse(selected.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
      if (value?.id !== record.id || typeof value?.title !== 'string') throw new Error('record_not_found');
      record.title = value.title.slice(0, 512);
    }
    const tools = await dynamicTools();
    if (tools.length === 0) throw new Error('gigi_tools_unavailable');
    const threadId = message ? required((await options.server.request('thread/start', profile(tools, { workspaceId, record })))?.thread?.id) : '';
    if (threadId) loadedThreads.add(threadId);
    const session: Session = { sessionId: randomUUID(), threadId, workspaceId, title: record?.title ?? (message?.slice(0, 80) || 'New conversation'), record, state: 'idle', createdAt: Date.now() };
    sessions.set(session.sessionId, session); await persist();
    if (message) await send({ workspaceId, sessionId: session.sessionId, message });
    return { sessionId: session.sessionId };
  }
  async function list(input: Json) {
    await load(); const workspaceId = required(input.workspaceId);
    return { sessions: [...sessions.values()].filter(x => x.workspaceId === workspaceId).sort((a, b) => b.createdAt - a.createdAt).map(x => ({ sessionId: x.sessionId, title: x.title, state: x.state, ...(x.record ? { record: x.record } : {}) })) };
  }
  async function send(input: Json): Promise<ChatRead> {
    const session = await owner(input); const message = required(input.message, MAX_TEXT);
    if (session.title === 'New conversation') { session.title = message.slice(0, 80); await persist(); }
    if (session.error === 'turn_outcome_unknown') throw new Error('reconciliation_required');
    if (session.cancelPending) throw new Error('turn_in_progress');
    if (session.state === 'running' || session.state === 'approval') throw new Error('turn_in_progress');
    await requireAuth();
    // Preflight is safe to repeat; fence only immediately before turn/start can have been delivered.
    let submitted = false;
    try {
      if (!session.threadId) { session.threadId = required((await options.server.request('thread/start', profile(await dynamicTools(), session)))?.thread?.id); loadedThreads.add(session.threadId); await persist(); }
      else if (!loadedThreads.has(session.threadId)) { await options.server.request('thread/resume', { threadId: session.threadId, ...profile(await dynamicTools(), session) }); loadedThreads.add(session.threadId); }
      const plugins = await options.server.request('plugin/installed', { cwds: [root] });
      if (!Array.isArray(plugins?.marketplaces)) throw new Error('plugin_inventory_unavailable');
      const disabledPluginIds = plugins.marketplaces.flatMap((market: Json) => Array.isArray(market.plugins) ? market.plugins.filter((x: Json) => x.installed).map((x: Json) => required(x.id)) : []);
      session.state = 'running'; session.error = 'turn_outcome_unknown'; session.turnId = undefined; session.pendingMessageId = randomUUID(); await persist(); submitted = true;
      const response = await options.server.request('turn/start', { threadId: session.threadId, clientUserMessageId: session.pendingMessageId, disabledPluginIds, input: [{ type: 'text', text: message, text_elements: [] }, { type: 'skill', name: 'gigi', path: options.skillPath }], environments: [], runtimeWorkspaceRoots: [], approvalPolicy: 'on-request', approvalsReviewer: 'user' });
      session.turnId = required(response?.turn?.id); session.pendingMessageId = undefined; session.state = 'running'; session.error = undefined; await persist();
    } catch (error) { session.state = submitted ? 'failed' : 'idle'; session.error = submitted ? 'turn_outcome_unknown' : undefined; if (!submitted) session.pendingMessageId = undefined; await persist(); throw error; }
    return { sessionId: session.sessionId, messages: [], state: 'running', approvals: [], recordLinks: session.record ? [session.record] : [], ...(session.decisionReceipt ? { decisionReceipt: session.decisionReceipt } : {}) };
  }
  async function reconcileSavedEdits(workspaceId: string): Promise<void> {
    for (const pending of sessions.values()) {
      if (pending.workspaceId !== workspaceId || pending.uncertainWrite?.tool !== 'gigi_records_save') continue;
      const intended = pending.uncertainWrite.arguments;
      try {
        const result = await options.mcp!.request('tools/call', { name: 'gigi_records_get', arguments: { workspaceId, entity: intended.entity, id: intended.id, detail: 'full' } });
        const actual = result.structuredContent ?? JSON.parse(result.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
        if (!result.isError && savedEditMatches(actual, intended)) {
          if (pending.decisionReceipt?.outcome === 'unknown') pending.decisionReceipt.outcome = 'verified';
          pending.uncertainWrite = undefined; pending.error = undefined; await persist();
        }
      } catch { /* Keep the write fence until a complete matching read succeeds. */ }
    }
  }
  async function read(input: Json): Promise<ChatRead> {
    const session = await owner(input);
    await reconcileSavedEdits(session.workspaceId);
    if (!session.threadId) return { sessionId: session.sessionId, messages: [], state: session.state, approvals: [], recordLinks: session.record ? [session.record] : [], ...(session.decisionReceipt ? { decisionReceipt: session.decisionReceipt } : {}) };
    if (!loadedThreads.has(session.threadId)) { await options.server.request('thread/resume', { threadId: session.threadId, ...profile(await dynamicTools(), session) }); loadedThreads.add(session.threadId); }
    // Codex 0.159.2 advertises turns/list but returns "list_turns is not supported yet".
    let response: any;
    try { response = await options.server.request('thread/read', { threadId: session.threadId, includeTurns: true }); }
    catch (error) {
      if (session.state !== 'running' && session.state !== 'approval') throw error;
      const pending: ChatRead = { sessionId: session.sessionId, messages: [...(liveMessages.get(session.sessionId) ?? [])].filter(([, entry]) => entry.turnId === session.turnId).slice(-50).map(([id, entry]) => ({ id, role: 'assistant' as const, text: entry.text })), state: session.state, approvals: [...approvals.values()].filter(x => x.sessionId === session.sessionId).map(({ id, title, detail }) => ({ id, title, detail })), recordLinks: session.record ? [session.record] : [], ...(session.decisionReceipt ? { decisionReceipt: session.decisionReceipt } : {}), ...(session.error ? { error: session.error } : {}) };
      while (pending.messages.length && Buffer.byteLength(JSON.stringify(pending)) > 500_000) pending.messages.shift();
      return pending;
    }
    const messages: ChatRead['messages'] = [];
    for (const turn of Array.isArray(response?.thread?.turns) ? response.thread.turns.slice(-20) : []) {
      if (session.pendingMessageId && Array.isArray(turn?.items) && turn.items.some((x: Json) => x.type === 'userMessage' && x.clientId === session.pendingMessageId)) {
        session.turnId = turn.id; session.pendingMessageId = undefined;
        if (session.error === 'turn_outcome_unknown') session.error = undefined;
      }
      for (const item of Array.isArray(turn?.items) ? turn.items : []) {
        if (item.type === 'userMessage') messages.push({ id: String(item.id), role: 'user', text: textContent(item.content).slice(0, MAX_TEXT) });
        if (item.type === 'agentMessage') messages.push({ id: String(item.id), role: 'assistant', text: String(item.text ?? '').slice(0, MAX_TEXT) });
      }
      if (turn.id === session.turnId && turn.status === 'inProgress') session.state = 'running';
      if (turn.id === session.turnId && turn.status !== 'inProgress' && (!session.pendingMessageId || turn.items?.some((x: Json) => x.type === 'userMessage' && x.clientId === session.pendingMessageId))) { session.state = turn.status === 'completed' ? 'idle' : turn.status === 'interrupted' ? 'interrupted' : 'failed'; session.pendingMessageId = undefined; session.cancelPending = false; if (!session.uncertainWrite) session.error = turn.error?.message; }
    }
    const stream = liveMessages.get(session.sessionId);
    for (const [id, entry] of stream ?? []) {
      const existing = messages.find(x => x.id === id);
      if (existing) {
        if (entry.text.length > existing.text.length) existing.text = entry.text.slice(0, MAX_TEXT);
        else stream?.delete(id); // Authoritative text now contains the whole streamed item.
      } else if (entry.turnId === session.turnId) messages.push({ id, role: 'assistant', text: entry.text.slice(0, MAX_TEXT) });
      else stream?.delete(id); // Older items outside the authoritative window cannot reappear.
    }
    const pending = [...approvals.values()].filter(x => x.sessionId === session.sessionId);
    if (pending.length) session.state = 'approval';
    await persist();
    const output: ChatRead = { sessionId: session.sessionId, messages: messages.slice(-50), state: session.state, approvals: pending.map(({ id, title, detail }) => ({ id, title, detail })), recordLinks: session.record ? [session.record] : [], ...(session.decisionReceipt ? { decisionReceipt: session.decisionReceipt } : {}), ...(session.error ? { error: session.error } : {}) };
    while (output.messages.length && Buffer.byteLength(JSON.stringify(output)) > 500_000) output.messages.shift();
    return output;
  }
  async function poll(input: Json) { return read(input); }
  async function cancel(input: Json) {
    const session = await owner(input);
    if (session.turnId && (session.state === 'running' || session.state === 'approval')) { session.cancelPending = true; await persist(); await options.server.request('turn/interrupt', { threadId: session.threadId, turnId: session.turnId }); }
    for (const [id, approval] of approvals) if (approval.sessionId === session.sessionId) { try { await options.server.reply(approval.requestId, { contentItems: [{ type: 'inputText', text: 'Turn cancelled.' }], success: false }); } catch { session.error = 'approval_delivery_unknown'; } approvals.delete(id); }
    session.state = 'interrupted'; await persist(); return read(input);
  }
  async function approve(input: Json) {
    const session = await owner(input); const approval = approvals.get(required(input.approvalId));
    if (!approval || approval.sessionId !== session.sessionId) throw new Error('approval_not_found');
    const decision = input.decision;
    if (decision !== 'approve' && decision !== 'reject') throw new Error('invalid_request');
    if (approval.kind === 'tool') {
      if (decision === 'reject') {
        session.decisionReceipt = { approvalId: approval.id, outcome: 'rejected' }; await persist();
        await options.server.reply(approval.requestId, { contentItems: [{ type: 'inputText', text: 'User denied this GiGi write.' }], success: false });
      }
      else {
        if ([...sessions.values()].some(x => x.workspaceId === session.workspaceId && x.uncertainWrite)) throw new Error('reconciliation_required');
        session.decisionReceipt = { approvalId: approval.id, outcome: 'unknown' };
        session.uncertainWrite = { tool: approval.tool!, arguments: approval.arguments! }; session.error = 'write_outcome_unknown'; await persist();
        let result: any;
        try {
          result = await options.mcp!.request('tools/call', { name: approval.tool, arguments: approval.arguments });
        } catch {
          try { await options.server.reply(approval.requestId, { contentItems: [{ type: 'inputText', text: 'Write outcome unknown. Reconcile in GiGi before any more writes.' }], success: false }); } catch { /* delivery is also unknown; never retry */ }
          approvals.delete(approval.id); session.state = 'running'; await persist(); return read(input);
        }
        if (result.isError) {
          session.decisionReceipt = { approvalId: approval.id, outcome: 'failed' };
          session.uncertainWrite = undefined; session.error = undefined; await persist();
          try { await options.server.reply(approval.requestId, { contentItems: (result.content ?? []).filter((x: Json) => x.type === 'text').map((x: Json) => ({ type: 'inputText', text: x.text })), success: false }); } catch { session.error = 'approval_delivery_unknown'; await persist(); }
        } else {
          let verified = false;
          try {
            if (approval.tool === 'gigi_records_save') {
            const saved = result.structuredContent ?? JSON.parse(result.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
            const id = saved?.id;
            if (typeof id === 'string') {
              const check = await options.mcp!.request('tools/call', { name: 'gigi_records_get', arguments: { workspaceId: session.workspaceId, entity: approval.arguments?.entity, id, detail: 'full' } });
              const actual = check.structuredContent ?? JSON.parse(check.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
              const intended = approval.arguments ?? {};
              verified = !check.isError && actual?.id === id && savedEditMatches(actual, intended);
            }
            }
          } catch { /* unknown readback retains workspace fence */ }
          session.decisionReceipt = { approvalId: approval.id, outcome: verified ? 'verified' : 'unknown' }; await persist();
          try {
            await options.server.reply(approval.requestId, { contentItems: (result.content ?? []).filter((x: Json) => x.type === 'text').map((x: Json) => ({ type: 'inputText', text: x.text })), success: verified });
            if (verified) { session.uncertainWrite = undefined; session.error = undefined; await persist(); }
          } catch { session.error = 'approval_delivery_unknown'; await persist(); }
        }
      }
    }
    approvals.delete(approval.id); session.state = 'running'; await persist(); return read(input);
  }

  options.server.onMessage(async message => {
    if (typeof message?.id !== 'number' && typeof message?.id !== 'string') {
      const threadId = message?.params?.threadId;
      const session = [...sessions.values()].find(x => x.threadId === threadId);
      if (session && message.method === 'item/agentMessage/delta') {
        const id = String(message.params?.itemId ?? '');
        const part = String(message.params?.delta ?? '');
        const stream = liveMessages.get(session.sessionId) ?? new Map<string, { text: string; turnId?: string }>();
        stream.set(id, { text: (stream.get(id)?.text ?? '').concat(part).slice(0, MAX_TEXT), turnId: message.params?.turnId ?? session.turnId });
        while (stream.size > 50) stream.delete(stream.keys().next().value!);
        liveMessages.set(session.sessionId, stream);
      }
      // The notification can precede rollout materialization. Keep polling until
      // thread/read supplies the terminal turn and its messages together.
      return;
    }
    const threadId = message?.params?.threadId;
    const session = [...sessions.values()].find(x => x.threadId === threadId);
    if (!session) { await options.server.reply(message.id, { decision: 'decline' }); return; }
    if (message.method === 'item/tool/call') {
      const tool = message.params?.tool; const args = asObject(message.params?.arguments);
      if ((!READ_TOOLS.has(tool) && !WRITE_TOOLS.has(tool)) || (args.workspaceId && args.workspaceId !== session.workspaceId)) { await options.server.reply(message.id, { contentItems: [{ type: 'inputText', text: 'GiGi scope denied.' }], success: false }); return; }
      if (tool !== 'gigi_schema_describe') args.workspaceId = session.workspaceId;
      if (READ_TOOLS.has(tool)) {
        try { const result = await options.mcp!.request('tools/call', { name: tool, arguments: args });
          if (!result.isError && tool === 'gigi_records_get' && args.detail === 'full') {
            const actual = result.structuredContent ?? JSON.parse(result.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
            for (const pending of sessions.values()) if (pending.workspaceId === session.workspaceId && pending.uncertainWrite?.tool === 'gigi_records_save' && pending.uncertainWrite.arguments.id === args.id && pending.uncertainWrite.arguments.entity === args.entity) {
              const intended = pending.uncertainWrite.arguments;
              if (actual?.id === args.id && savedEditMatches(actual, intended)) {
                if (pending.decisionReceipt?.outcome === 'unknown') pending.decisionReceipt.outcome = 'verified';
                pending.uncertainWrite = undefined; pending.error = undefined; await persist();
              }
            }
          }
          const contentItems = (result.content ?? []).filter((x: Json) => x.type === 'text').map((x: Json) => ({ type: 'inputText', text: x.text }));
          if (!result.isError && tool === 'gigi_records_get' && args.entity === 'gigs') {
            const value = result.structuredContent ?? JSON.parse(result.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
            const cents = value?.fields?.Fee;
            if (typeof cents === 'number' && Number.isFinite(cents)) contentItems.unshift({ type: 'inputText', text: `Money unit: raw fields.Fee=${cents} is an integer minor-currency-unit value, not a display amount. MUST call gigi_gigs_summary for feeCents and currency before reporting a gig fee.` });
          }
          await options.server.reply(message.id, { contentItems, success: !result.isError }); }
        catch { try { await options.server.reply(message.id, { contentItems: [{ type: 'inputText', text: 'GiGi read failed.' }], success: false }); } catch { /* read reply delivery unknown */ } }
        return;
      }
      if ([...sessions.values()].some(x => x.workspaceId === session.workspaceId && x.uncertainWrite)) { await options.server.reply(message.id, { contentItems: [{ type: 'inputText', text: 'Previous write outcome is unknown; fresh record read and reconciliation required.' }], success: false }); return; }
      const id = randomUUID();
      if (tool === 'gigi_records_save') {
        if (!args.id) { await options.server.reply(message.id, { contentItems: [{ type: 'inputText', text: 'GiGi chat requires an existing record id for edits.' }], success: false }); return; }
        args.idempotencyKey = `gigi-chat:${id}`;
        if (args.id) {
          try {
            const current = await options.mcp!.request('tools/call', { name: 'gigi_records_get', arguments: { workspaceId: session.workspaceId, entity: args.entity, id: args.id, detail: 'full' } });
            if (current.isError) throw new Error('snapshot_failed');
            const record = current.structuredContent ?? JSON.parse(current.content?.find((x: Json) => x.type === 'text')?.text ?? '{}');
            if (record?.id !== args.id || typeof record.title !== 'string' || !record.fields || !record.source) throw new Error('snapshot_invalid');
            args.expectedRecord = { title: record.title, fields: record.fields, source: record.source };
          } catch { await options.server.reply(message.id, { contentItems: [{ type: 'inputText', text: 'Current record snapshot unavailable; edit denied.' }], success: false }); return; }
        }
      }
      if (tool === 'gigi_relations_link') args.idempotencyKey = `gigi-chat:${id}`;
      const detail = JSON.stringify(args);
      if (Buffer.byteLength(detail) > 32_768) { await options.server.reply(message.id, { contentItems: [{ type: 'inputText', text: 'GiGi edit is too large for review; narrow the proposed change.' }], success: false }); return; }
      approvals.set(id, { id, title: `Approve ${tool}`, detail, requestId: message.id, sessionId: session.sessionId, kind: 'tool', tool, arguments: args }); session.state = 'approval'; await persist(); return;
    }
    // No built-in Codex tool, permission expansion, or external elicitation is approvable here.
    await options.server.reply(message.id, { decision: 'decline' });
  });
  return { status, list, start, read, send, poll, cancel, approve };
}

export class JsonLineProcess implements AppServer {
  private child: ChildProcessWithoutNullStreams;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private listeners = new Set<(message: Json) => void>();
  private nextId = 1;
  private buffer = '';
  private exited = false;
  private closing = false;
  private stderr = '';
  constructor(command: string, args: string[], env: NodeJS.ProcessEnv, onFailure?: (error: Error) => void) {
    this.child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stderr.setEncoding('utf8');
    this.child.stdout.setEncoding('utf8');
    this.child.stderr.on('data', chunk => { this.stderr = (this.stderr + String(chunk)).slice(-2_000); });
    this.child.stdout.on('data', chunk => {
      this.buffer += String(chunk);
      if (this.buffer.length > 1_000_000) { this.child.kill('SIGTERM'); return; }
      for (;;) { const end = this.buffer.indexOf('\n'); if (end < 0) break; const line = this.buffer.slice(0, end); this.buffer = this.buffer.slice(end + 1); if (!line) continue;
        try { const message = JSON.parse(line); if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) { const p = this.pending.get(message.id); if (p) { this.pending.delete(message.id); message.error ? p.reject(new Error(message.error.message ?? 'provider_error')) : p.resolve(message.result); } } else this.listeners.forEach(fn => {
          void Promise.resolve().then(() => fn(message)).catch(async () => {
            if (message.id === undefined) return;
            const result = message.method === 'item/tool/call' ? { contentItems: [{ type: 'inputText', text: 'GiGi tool unavailable; no write was retried.' }], success: false } : { decision: 'decline' };
            try { await this.reply(message.id, result); } catch { /* transport failure is left unresolved */ }
          });
        }); }
        catch { /* malformed provider output is ignored; pending request times out */ }
      }
    });
    const fail = (error: Error) => { const first = !this.exited; this.exited = true; for (const p of this.pending.values()) p.reject(error); this.pending.clear(); if (first && !this.closing) onFailure?.(error); };
    this.child.on('error', fail);
    this.child.stdin.on('error', fail);
    this.child.on('exit', () => fail(new Error(`provider_exited: ${this.stderr}`)));
  }
  request(method: string, params: Json): Promise<any> {
    const id = this.nextId++;
    return Effect.runPromise(Effect.tryPromise({ try: () => new Promise((resolve, reject) => {
      if (this.exited) { reject(new Error('provider_exited')); return; }
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error('provider_timeout')); }, 15_000);
      this.pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
      this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', error => { if (error) { const pending = this.pending.get(id); this.pending.delete(id); pending?.reject(error); } });
    }), catch: cause => cause }));
  }
  onMessage(handler: (message: Json) => void) { this.listeners.add(handler); return () => this.listeners.delete(handler); }
  reply(id: string | number, result: unknown): Promise<void> { return new Promise((resolve, reject) => this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n', error => error ? reject(error) : resolve())); }
  notify(method: string, params?: Json) { this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) }) + '\n'); }
  async close() {
    this.closing = true;
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => { this.child.kill('SIGKILL'); resolve(); }, 2_000);
      this.child.once('exit', () => { clearTimeout(timeout); resolve(); });
      this.child.kill('SIGTERM');
    });
  }
}
