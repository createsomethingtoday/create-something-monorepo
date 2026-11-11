import { NPG_TOOL_NAMES, PAID_TOOLS } from './policy';
import { validateArguments, type Providers, type Tool } from './providers';
import { NpgError, NpgStore, type Action, type Conversation, type State } from './store';
export type Command =
  | { type: 'create' }
  | { type: 'message'; id: string; version: number; text: string }
  | { type: 'approve' | 'reject'; id: string; version: number; actionId: string };
export function parseCommand(value: unknown): Command {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new NpgError(400, 'Invalid request.');
  const v = value as Record<string, unknown>,
    keys =
      v.type === 'create'
        ? ['type']
        : v.type === 'message'
          ? ['type', 'id', 'version', 'text']
          : ['type', 'id', 'version', 'actionId'];
  if (Object.keys(v).some((k) => !keys.includes(k)))
    throw new NpgError(400, 'Unexpected request fields.');
  if (v.type === 'create') return { type: 'create' };
  if (
    !['message', 'approve', 'reject'].includes(String(v.type)) ||
    typeof v.id !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(v.id) ||
    !Number.isSafeInteger(v.version) ||
    Number(v.version) < 0
  )
    throw new NpgError(400, 'Invalid conversation request.');
  if (
    v.type === 'message' &&
    (typeof v.text !== 'string' || !v.text.trim() || v.text.length > 6000)
  )
    throw new NpgError(400, 'Use a message of 1–6,000 characters.');
  if (
    v.type !== 'message' &&
    (typeof v.actionId !== 'string' || !/^[a-f0-9-]{36}$/.test(v.actionId))
  )
    throw new NpgError(400, 'Invalid review.');
  return value as Command;
}
const providerFor = (tool: string) =>
  tool === 'enrich_candidate_skip_trace'
    ? 'apify'
    : tool === 'enrich_candidate_profile'
      ? 'pdl'
      : tool === 'request_professional_contact_enrichment'
        ? 'clay'
        : tool === 'enrich_provider_professional_contact'
          ? 'exa'
          : 'geocodio';
/** Deliberately conservative adapter: unknown live readiness shapes cannot authorize spending.
 * Verify against the deployed tool before cutover. No schema is invented in Healthcare MCP. */
export function enrichmentReview(data: unknown, provider: string) {
  const d = data as any,
    b = d?.budget,
    c = d?.cost;
  if (
    d?.ready !== true ||
    d?.provider !== provider ||
    b?.currency !== 'USD' ||
    b?.limit !== 100 ||
    b?.reconciled !== true ||
    !Number.isFinite(b?.spent) ||
    b.spent < 0 ||
    !Number.isFinite(c?.maximum_usd) ||
    c.maximum_usd <= 0 ||
    b.spent + c.maximum_usd > 100
  )
    throw new NpgError(
      409,
      'Enrichment is not ready: provider access, maximum cost, and reconciled shared $100 total allowance must be confirmed.' +
        (typeof d?.reason === 'string' ? ' Reported reason: ' + d.reason.slice(0, 500) : '')
    );
  return {
    provider,
    currency: 'USD',
    maximumCost: c.maximum_usd,
    totalAllowance: 100,
    recordedSpend: b.spent,
    remaining: 100 - b.spent,
    scope: 'One candidate only; no outreach. No automatic reset or top-up.'
  };
}
function fullClinicAddress(address: string) {
  const parts = address.trim().split(/\s*,\s*/);
  if (/^(?:US|USA|United States)$/i.test(parts.at(-1) ?? '')) parts.pop();
  return (
    parts.length >= 3 &&
    /^\d+[A-Za-z]?(?:-\d+)?\s+\S/.test(parts[0]) &&
    /[A-Za-z]{2}/.test(parts.at(-2) ?? '') &&
    /^(?:AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|AS|GU|MP|PR|VI)(?:\s+\d{5}(?:-\d{4})?)?$/i.test(
      parts.at(-1) ?? ''
    )
  );
}
function skipReceipt(
  value: unknown,
  npi: unknown
): value is { status: string; id: string; run_id: string; npi: string } {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    /^[a-f0-9]{64}$/.test(r.id) &&
    typeof r.run_id === 'string' &&
    /^[A-Za-z0-9]{1,64}$/.test(r.run_id) &&
    r.npi === npi
  );
}
// Refresh replaces this receipt's status rather than growing history on every poll.
function boundSkipRefresh(state: State, receiptId: string) {
  const latest = state.messages.pop()!;
  state.messages = state.messages.filter((m) => m.skipTraceReceipt !== receiptId);
  state.messages.push({ ...latest, skipTraceReceipt: receiptId });
  let compacted = state.messages.length > 60;
  while (state.messages.length > 60) state.messages.shift();
  // Recovery remains available even when normal chat has filled its context budget.
  // Retain the newest receipt and its status; historical action records remain in D1.
  while (JSON.stringify(state).length > 260000 && state.messages.length > 1) {
    state.messages.shift();
    compacted = true;
  }
  while (JSON.stringify(state).length > 260000 && state.sources.length > 1) {
    state.sources.shift();
    compacted = true;
  }
  if (compacted)
    state.messages[state.messages.length - 1].text +=
      ' Older conversation context was trimmed to keep receipt recovery available.';
}
export function checkPaidScope(name: string, args: Record<string, unknown>, state: State) {
  if (name === 'enrich_candidate_skip_trace' && state.skipTracePending)
    throw new NpgError(
      409,
      'Send Refresh Skip Trace to reconcile the existing run before another Skip Trace request.'
    );
  const userText = state.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.text)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const evidence = JSON.stringify(state.sources);
  const knownNpi = (npi: unknown) =>
    typeof npi === 'string' &&
    /^\d{10}$/.test(npi) &&
    (new RegExp(`\\b${npi}\\b`).test(userText) || evidence.includes(JSON.stringify(npi)));
  if (args.npi && !knownNpi(args.npi))
    throw new NpgError(
      409,
      'Supply the exact candidate NPI or source it in this conversation before enrichment.'
    );
  if (name === 'enrich_candidate_profile' && typeof args.include_personal_contact !== 'boolean')
    throw new NpgError(
      409,
      'Personal-contact scope must be explicitly set before requesting an enrichment review.'
    );
  if (name !== 'estimate_registry_travel') return;
  const npis = args.npis,
    clinics = args.clinics as Array<{ id: string; address: string }>;
  if (
    !Array.isArray(npis) ||
    !npis.length ||
    npis.length > 50 ||
    new Set(npis).size !== npis.length ||
    !npis.every(knownNpi) ||
    !Array.isArray(clinics) ||
    !clinics.length ||
    clinics.length > 3 ||
    new Set(clinics.map((c) => c.id)).size !== clinics.length ||
    !clinics.every(
      (c) =>
        typeof c.address === 'string' &&
        fullClinicAddress(c.address) &&
        userText.includes(c.address.toLowerCase().replace(/\s+/g, ' '))
    ) ||
    ![30, 45].includes(Number(args.max_minutes)) ||
    !['any', 'all'].includes(String(args.clinic_match))
  )
    throw new NpgError(
      409,
      'Travel needs 1–50 exact selected NPIs from you or this sourcing history, and 1–3 clinic street addresses supplied by you in street, city, two-letter state format (ZIP optional). Choose 30 or 45 minutes and any or all clinics.'
    );
}
async function review(
  providers: Providers,
  tools: Tool[],
  name: string,
  args: Record<string, unknown>
) {
  if (name === 'estimate_registry_travel')
    return {
      provider: 'Geocodio',
      scope: 'Selected NPIs only. Typical practice-to-clinic driving, not home commute.',
      limits:
        '1–50 NPIs; 1–3 full clinic street addresses; 30 or 45 minutes; any or all clinics. Bounded shared credit reservation is enforced by the source.',
      cost: 'Exact cost unavailable. This action may reserve or spend routing credits.'
    };
  if (name === 'enrich_candidate_skip_trace')
    return {
      provider: 'Apify one-api/skip-trace',
      scope:
        'One selected registry NPI; broker personal contact candidates and home city/state. Practice geography is not residence.',
      limits:
        'One pinned run, ten-cent cap, shared daily reservations. Repeated identical input reconciles the same run. Account ownership and empty-sentinel anonymous access are checked before dispatch; these checks cannot exclude explicit grants or Actor-creator sharing. Account restriction and sharing setup require operator review.',
      cost: 'Up to $0.10 reserved. Contacts, ownership and consent remain unverified; never recruiter-ready.'
    };
  const readiness = tools.find((t) => t.name === 'get_enrichment_readiness');
  if (!readiness)
    throw new NpgError(
      409,
      'Enrichment is not ready: the readiness check is unavailable. No paid lookup was made.'
    );
  // Only parameters the live schema explicitly supports; no made-up MCP tool/schema.
  const props = (readiness.inputSchema.properties ?? {}) as Record<string, unknown>;
  const input: Record<string, unknown> = {};
  if ('provider' in props) input.provider = providerFor(name);
  if ('tool' in props) input.tool = name;
  if ('npi' in props && args.npi) input.npi = args.npi;
  validateArguments(readiness, input);
  return {
    ...enrichmentReview(await providers.call(readiness.name, input), providerFor(name)),
    contactScope:
      name === 'enrich_candidate_profile'
        ? args.include_personal_contact
          ? 'Professional profile and personal contacts; vendor-reported and unverified.'
          : 'Professional profile only; personal contacts excluded.'
        : name === 'request_professional_contact_enrichment'
          ? 'Clay: public professional contacts only; no personal contacts.'
          : 'Exa: public professional research, at most one email and one phone; no personal-contact lookup.',
    requireContact: name === 'enrich_candidate_profile' ? args.require_contact === true : null
  };
}
export async function executeCommand(
  store: NpgStore,
  owner: string,
  command: Command,
  makeProviders: () => Providers
) {
  const token = await store.admit(owner);
  let providers: Providers | undefined,
    row: Conversation | undefined,
    state: State | undefined,
    toolCount = 0,
    dispatchedAction: string | undefined,
    paidLease = false;
  try {
    if (command.type === 'create') {
      const c = await store.create(owner);
      return await store.view(owner, c.id);
    }
    const before = await store.read(owner, command.id);
    if (before.version !== command.version)
      throw new NpgError(409, 'This conversation changed. Refresh its history.');
    state = JSON.parse(before.state_json) as State;
    const refreshing =
      command.type === 'message' && command.text.trim().toLowerCase() === 'refresh skip trace';
    // Already-offered reviews must remain consumable when their notice fills the chat.
    if (
      !refreshing &&
      ((command.type === 'message' && state.messages.length >= 60) ||
        before.state_json.length > 280000)
    )
      throw new NpgError(409, 'Conversation is full. Start a new conversation.');
    let action: Action | undefined;
    if (command.type === 'message') {
      if (before.status !== 'idle')
        throw new NpgError(
          409,
          'Review or refresh the current request before sending another message.'
        );
    } else {
      action = await store.action(owner, command.actionId);
      if (
        before.status !== 'review' ||
        state.pendingId !== action.id ||
        action.conversation_id !== before.id ||
        action.version !== before.version ||
        action.status !== 'pending'
      )
        throw new NpgError(409, 'This review changed or was already used.');
    }
    row = await store.start(owner, before.id, before.version, token);
    let input: unknown[];
    if (refreshing) {
      const pending = state.skipTracePending;
      if (!pending)
        throw new NpgError(
          409,
          'There is no known Skip Trace run to refresh. No paid action was sent.'
        );
      const approved = await store.action(owner, pending.actionId);
      const args = JSON.parse(approved.arguments_json);
      if (
        approved.conversation_id !== row.id ||
        approved.tool !== 'enrich_candidate_skip_trace' ||
        approved.status !== 'completed' ||
        args.confirm_paid_enrichment !== true
      )
        throw new NpgError(
          409,
          'The approved receipt is unavailable. Ask your operator to reconcile it.'
        );
      providers = makeProviders();
      let result: unknown;
      try {
        result = await providers.call(approved.tool, {
          ...args,
          reconcile_receipt: { id: pending.id, run_id: pending.run_id }
        });
      } catch {
        result = { status: 'pending', id: pending.id, run_id: pending.run_id, npi: args.npi };
      }
      toolCount++;
      if (
        !skipReceipt(result, args.npi) ||
        result.id !== pending.id ||
        result.run_id !== pending.run_id ||
        ![
          'pending',
          'review_required',
          'no_contact',
          'blocked_review',
          'provider_failed',
          'provider_aborted',
          'provider_timeout'
        ].includes(result.status)
      ) {
        await store.db
          .prepare(
            "UPDATE npg_analyst_actions SET status='ambiguous' WHERE id=? AND owner_id=? AND status='completed'"
          )
          .bind(approved.id, owner)
          .run();
        delete state.skipTracePending;
        state.messages.push({
          role: 'assistant',
          text: 'This receipt could not be safely reconciled. Ask your operator to review it before further paid work.'
        });
        boundSkipRefresh(state, pending.id);
        await store.finish(row, state, 'ambiguous', toolCount);
        return store.view(owner, row.id);
      }
      state.sources = state.sources.filter(
        (source) =>
          !(
            source.tool === approved.tool &&
            source.data &&
            typeof source.data === 'object' &&
            'id' in source.data &&
            source.data.id === pending.id
          )
      );
      state.sources.push({ tool: approved.tool, data: result });
      delete state.responseId;
      if (result.status === 'pending')
        state.messages.push({
          role: 'assistant',
          text: 'Skip Trace is still pending or access/billing could not be refreshed. Send “Refresh Skip Trace” to read the same run again. No new paid dispatch is authorized.'
        });
      else {
        delete state.skipTracePending;
        state.messages.push({
          role: 'assistant',
          text: 'The existing Skip Trace run was refreshed. Review its source result below; identity, contact ownership and consent remain unverified. No new paid dispatch was authorized.'
        });
      }
      boundSkipRefresh(state, pending.id);
      await store.finish(row, state, 'idle', toolCount);
      return store.view(owner, row.id);
    }
    if (action) {
      const status = await store.consume(
        row,
        action,
        command.type === 'approve' ? 'approve' : 'reject'
      );
      delete state.pendingId;
      if (status !== 'dispatching') {
        // Close the paused provider chain locally; rejected/expired work cannot be re-proposed implicitly.
        delete state.responseId;
        state.messages.push({
          role: 'assistant',
          text:
            status === 'expired'
              ? 'This review expired. No action was sent. Ask again if you still need it.'
              : 'Action rejected. No action was sent.'
        });
        await store.finish(row, state, 'idle', 0);
        return await store.view(owner, row.id);
      }
      providers = makeProviders();
      const tools = await providers.tools();
      const tool = tools.find((t) => t.name === action!.tool);
      if (!tool || !PAID_TOOLS.has(tool.name))
        throw new NpgError(409, 'The reviewed action is no longer available. Ask again.');
      const args = JSON.parse(action.arguments_json);
      validateArguments(tool, args);
      await store.acquirePaid(token, action.id);
      paidLease = true;
      checkPaidScope(tool.name, args, state);
      const currentReview = await review(providers, tools, tool.name, args);
      if (JSON.stringify(currentReview) !== action.review_json)
        throw new NpgError(
          409,
          'The provider cost or allowance changed. Ask again for a new review.'
        );
      await store.markPaid(row);
      dispatchedAction = action.id;
      const result = await providers.call(tool.name, args);
      toolCount++;
      if (
        tool.name === 'enrich_candidate_skip_trace' &&
        skipReceipt(result, args.npi) &&
        result.status === 'pending'
      ) {
        state.skipTracePending = { actionId: action.id, id: result.id, run_id: result.run_id };
        state.sources.push({ tool: tool.name, data: result });
        delete state.responseId;
        state.messages.push({
          role: 'assistant',
          text: 'Skip Trace has a known pending run. Send “Refresh Skip Trace” to read this same receipt without another paid dispatch or approval. Other paid tools remain subject to their normal approval.'
        });
        await store.finish(row, state, 'idle', toolCount, action.id);
        return store.view(owner, row.id);
      }
      if (
        result &&
        typeof result === 'object' &&
        'status' in result &&
        [
          'ambiguous',
          'unavailable',
          'delivery_unknown',
          'pending',
          'association_failure',
          'privacy_blocked_review',
          'billing_review'
        ].includes(String(result.status))
      ) {
        state.sources.push({ tool: tool.name, data: result });
        await store.checkpoint(row, state);
        throw new NpgError(
          409,
          'The paid source returned an unresolved outcome. Reconciliation is required before another attempt.'
        );
      }
      // A confirmed source response is persisted before asking the model to summarize it.
      state.sources.push({ tool: tool.name, data: result });
      await store.checkpoint(row, state);
      await store.db
        .prepare(
          "UPDATE npg_analyst_actions SET status='completed' WHERE id=? AND owner_id=? AND status='dispatching'"
        )
        .bind(action.id, owner)
        .run();
      state.responseId = action.response_id;
      input = [
        { type: 'function_call_output', call_id: action.call_id, output: JSON.stringify(result) }
      ];
      return await loop(tools, input);
    }
    state.messages.push({
      role: 'user',
      text: (command as Extract<Command, { type: 'message' }>).text.trim()
    });
    await store.checkpoint(row, state);
    providers = makeProviders();
    const tools = await providers.tools();
    // On rejection or expiry the provider chain was discarded: replay only trusted stored chat text.
    input = state.responseId
      ? [{ role: 'user', content: state.messages.at(-1)!.text }]
      : state.messages.map((m) => ({ role: m.role, content: m.text }));
    return await loop(tools, input);
    async function loop(
      tools: Tool[],
      input: unknown[]
    ): Promise<Awaited<ReturnType<NpgStore['view']>>> {
      const p = providers!,
        c = row!,
        s = state!;
      for (let step = 0; step < 7; step++) {
        await store.assertLease(c);
        if (JSON.stringify(s).length > 280000)
          throw new NpgError(
            409,
            'This conversation reached its evidence limit. Check returned sources and start a new conversation.'
          );
        const response = await p.respond(input, s.responseId, tools);
        s.responseId = response.id;
        if (!response.call) {
          if (!response.text.trim()) throw new Error('No answer');
          s.messages.push({ role: 'assistant', text: response.text });
          await store.finish(c, s, 'idle', toolCount);
          return store.view(owner, c.id);
        }
        if (toolCount >= 6)
          throw new NpgError(
            409,
            'This request reached its source lookup limit. Start a new conversation with a narrower request.'
          );
        const call = response.call,
          tool = tools.find((t) => t.name === call.name);
        if (!tool || !(NPG_TOOL_NAMES as readonly string[]).includes(call.name))
          throw new NpgError(400, 'The requested action is not available.');
        let args: unknown;
        try {
          args = JSON.parse(call.arguments);
        } catch {
          throw new NpgError(400, 'Invalid action inputs.');
        }
        validateArguments(tool, args);
        if (PAID_TOOLS.has(tool.name)) {
          checkPaidScope(tool.name, args, s);
          const details = await review(p, tools, tool.name, args);
          const a: Action = {
            id: crypto.randomUUID(),
            conversation_id: c.id,
            owner_id: owner,
            version: c.version,
            tool: tool.name,
            arguments_json: JSON.stringify(args),
            call_id: call.call_id,
            response_id: response.id,
            review_json: JSON.stringify(details),
            expires_at: store.now() + 10 * 60000,
            status: 'pending'
          };
          await store.addAction(c, a);
          s.pendingId = a.id;
          s.messages.push({
            role: 'assistant',
            text: 'Review this action before any paid lookup or routing credit reservation is sent.'
          });
          await store.finish(c, s, 'review', toolCount);
          return store.view(owner, c.id);
        }
        const result = await p.call(tool.name, args);
        toolCount++;
        s.sources.push({ tool: tool.name, data: result });
        await store.checkpoint(c, s);
        input = [
          { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) }
        ];
      }
      throw new Error('Lookup limit');
    }
  } catch (cause) {
    if (row && state) {
      const ambiguous = Boolean(row.paid_dispatched);
      if (dispatchedAction)
        await store.db
          .prepare(
            "UPDATE npg_analyst_actions SET status='ambiguous' WHERE id=? AND owner_id=? AND status='dispatching'"
          )
          .bind(dispatchedAction, owner)
          .run();
      // Any action consumed before a preflight failure is closed, never re-opened.
      await store.db
        .prepare(
          "UPDATE npg_analyst_actions SET status='expired' WHERE conversation_id=? AND owner_id=? AND status='dispatching'"
        )
        .bind(row.id, owner)
        .run();
      delete state.pendingId;
      state.messages.push({
        role: 'assistant',
        text: ambiguous
          ? 'This request stopped after a paid action may have been sent. Do not repeat it. Ask your operator to reconcile the source result. Existing returned evidence is below.'
          : cause instanceof NpgError
            ? cause.message
            : 'This request was interrupted. No automatic retry was made. Start a new conversation; check existing source results first.'
      });
      await store.finish(row, state, ambiguous ? 'ambiguous' : 'interrupted', toolCount);
      return await store.view(owner, row.id);
    }
    throw cause;
  } finally {
    try {
      await providers?.close();
    } catch {
      /* No sensitive provider errors in logs or responses. */
    }
    if (paidLease) await store.releasePaid(token);
    await store.release(owner, token);
  }
}
