import { NPG_PROMPT_SHA256 } from './policy';
import { recoveryView, type EnrichmentRecovery } from './recovery';
export class NpgError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
export type ReceiptReference = { conversationId: string; actionId: string };
export class NpgReceiptHoldError extends NpgError {
  constructor(
    message: string,
    public reference?: ReceiptReference
  ) {
    super(409, message);
  }
}
export type Message = { role: 'user' | 'assistant'; text: string; answerId?: string; skipTraceReceipt?: string };
export type Source = {
  answerId?: string;
  tool: string;
  data: unknown;
  actionId?: string;
  existingReceipt?: boolean;
  receiptConversationId?: string;
  market?: { id: string; at: number; locale: string };
};
export type PendingSkipReceipt = { actionId: string; id: string; run_id: string; npi?: string };
export type State = {
  messages: Message[];
  sources: Source[];
  receiptReferences?: ReceiptReference[];
  responseId?: string;
  pendingId?: string;
  skipTracePending?: PendingSkipReceipt;
  skipTraceQueue?: PendingSkipReceipt[];
  enrichmentRecovery?: EnrichmentRecovery[];
};
export type Conversation = {
  id: string;
  owner_id: string;
  version: number;
  status: 'idle' | 'running' | 'review' | 'interrupted' | 'ambiguous';
  state_json: string;
  run_id: string;
  lease_token: string;
  lease_until: number;
  paid_dispatched: number;
  updated_at: number;
};
export type Action = {
  id: string;
  conversation_id: string;
  owner_id: string;
  version: number;
  tool: string;
  arguments_json: string;
  call_id: string;
  response_id: string;
  review_json: string;
  expires_at: number;
  status: string;
};
export class NpgStore {
  constructor(
    readonly db: D1Database,
    readonly now: () => number = Date.now
  ) {}
  async admit(owner: string) {
    const now = this.now(),
      token = crypto.randomUUID();
    const row = await this.db
      .prepare(
        `INSERT INTO npg_analyst_admission(owner_id,window_at,requests,lease_token,lease_until)
   VALUES(?,?,1,?,?) ON CONFLICT(owner_id) DO UPDATE SET
   requests=CASE WHEN window_at<=? THEN 1 ELSE requests+1 END,
   window_at=CASE WHEN window_at<=? THEN ? ELSE window_at END, lease_token=?,lease_until=?
   WHERE lease_until<=? AND (window_at<=? OR requests<10) RETURNING owner_id`
      )
      .bind(
        owner,
        now,
        token,
        now + 150000,
        now - 60000,
        now - 60000,
        now,
        token,
        now + 150000,
        now,
        now - 60000
      )
      .first();
    if (!row)
      throw new NpgError(
        429,
        'Please wait: another request is running or the request limit was reached.'
      );
    return token;
  }
  async release(owner: string, token: string) {
    await this.db
      .prepare('UPDATE npg_analyst_admission SET lease_until=0 WHERE owner_id=? AND lease_token=?')
      .bind(owner, token)
      .run();
  }
  async create(owner: string) {
    const count = await this.db
      .prepare(
        "SELECT count(*) AS n FROM npg_analyst_conversations WHERE owner_id=? AND scope='npg'"
      )
      .bind(owner)
      .first<{ n: number }>();
    if ((count?.n ?? 0) >= 100)
      throw new NpgError(429, 'Conversation limit reached. Ask your operator for help.');
    const id = crypto.randomUUID(),
      now = this.now();
    await this.db
      .prepare(
        'INSERT INTO npg_analyst_conversations(id,owner_id,created_at,updated_at) VALUES(?,?,?,?)'
      )
      .bind(id, owner, now, now)
      .run();
    return this.read(owner, id);
  }
  async progress(owner: string, id: string) {
    const row = await this.db.prepare(`SELECT version, status,
      (SELECT count(*) FROM json_each(state_json, '$.sources')
       WHERE json_extract(value, '$.tool') = 'search_registry_sourcing') AS registrySources
      FROM npg_analyst_conversations WHERE owner_id=? AND id=? AND scope='npg'`)
      .bind(owner, id).first<{ version: number; status: string; registrySources: number }>();
    if (!row) throw new NpgError(404, 'Conversation not found.');
    return row;
  }
  async list(owner: string) {
    const rows = await this.db
      .prepare(
        `SELECT id,status,updated_at,
          (SELECT json_extract(message.value,'$.text') FROM json_each(state_json,'$.messages') AS message
           WHERE json_extract(message.value,'$.role')='user' ORDER BY CAST(message.key AS INTEGER) LIMIT 1) AS first_question
         FROM npg_analyst_conversations WHERE owner_id=? AND scope='npg' ORDER BY updated_at DESC LIMIT 100`
      )
      .bind(owner)
      .all<{ id: string; status: string; updated_at: number; first_question: string | null }>();
    return rows.results.map(({ first_question, ...row }) => {
      const question = (first_question ?? '').replace(/\s+/g, ' ').trim();
      return {
        ...row,
        title: question
          ? question.slice(0, 96) + (question.length > 96 ? '…' : '')
          : 'New conversation'
      };
    });
  }
  async read(owner: string, id: string): Promise<Conversation> {
    let row = await this.db
      .prepare("SELECT * FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND scope='npg'")
      .bind(id, owner)
      .first<Conversation>();
    if (!row) throw new NpgError(404, 'Conversation not found.');
    if (row.status === 'running' && row.lease_until <= this.now()) {
      const outcome = row.paid_dispatched ? 'ambiguous' : 'interrupted';
      const now = this.now();
      // Pin all bookkeeping to this expired command. A concurrent reader may have
      // already normalized it and started a newer command before this batch runs.
      await this.db.batch([
        this.db
          .prepare(
            "UPDATE npg_analyst_conversations SET status=?,lease_token=NULL WHERE id=? AND owner_id=? AND run_id=? AND version=? AND paid_dispatched=? AND status='running' AND lease_until<=?"
          )
          .bind(outcome, id, owner, row.run_id, row.version, row.paid_dispatched, now),
        this.db
          .prepare(
            `INSERT OR IGNORE INTO npg_analyst_receipts SELECT run_id,id,owner_id,version,?,0,?,? FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND run_id=? AND version=? AND status=? AND lease_until<=?`
          )
          .bind(outcome, NPG_PROMPT_SHA256, now, id, owner, row.run_id, row.version, outcome, now),
        this.db
          .prepare(
            `UPDATE npg_analyst_actions SET status='ambiguous' WHERE conversation_id=? AND owner_id=? AND status='dispatching'
             AND EXISTS (SELECT 1 FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND run_id=? AND version=? AND status=? AND lease_until<=?)`
          )
          .bind(id, owner, id, owner, row.run_id, row.version, outcome, now)
      ]);
      row = (await this.db
        .prepare('SELECT * FROM npg_analyst_conversations WHERE id=? AND owner_id=?')
        .bind(id, owner)
        .first<Conversation>())!;
    }
    return row;
  }
  async start(
    owner: string,
    id: string,
    version: number,
    token: string,
    recoverAmbiguous = false,
    expectedState?: string
  ) {
    const run = crypto.randomUUID();
    const row = await this.db
      .prepare(
        `UPDATE npg_analyst_conversations SET status='running',version=version+1,
   run_id=?,lease_token=?,lease_until=?,paid_dispatched=0,updated_at=?
   WHERE id=? AND owner_id=? AND scope='npg' AND version=? AND lease_until<=? AND (status IN ('idle','review') OR (?=1 AND status='ambiguous'))
   AND state_json=COALESCE(?,state_json) RETURNING *`
      )
      .bind(
        run,
        token,
        this.now() + 145000,
        this.now(),
        id,
        owner,
        version,
        this.now(),
        recoverAmbiguous ? 1 : 0,
        expectedState ?? null
      )
      .first<Conversation>();
    if (!row)
      throw new NpgError(
        409,
        'This conversation changed or stopped. Refresh its history before continuing.'
      );
    return row;
  }
  async extendCompleteProfileLease(row: Conversation) {
    await this.assertLease(row);
    const until = this.now() + 450000;
    await this.db.batch([
      this.db
        .prepare(
          "UPDATE npg_analyst_conversations SET lease_until=? WHERE id=? AND owner_id=? AND lease_token=? AND status='running' AND lease_until>?"
        )
        .bind(until, row.id, row.owner_id, row.lease_token, this.now()),
      this.db
        .prepare(
          'UPDATE npg_analyst_admission SET lease_until=? WHERE owner_id=? AND lease_token=? AND lease_until>?'
        )
        .bind(until, row.owner_id, row.lease_token, this.now())
    ]);
    row.lease_until = until;
  }
  async assertLease(row: Conversation) {
    const found = await this.db
      .prepare(
        "SELECT id FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND status='running' AND lease_token=? AND lease_until>?"
      )
      .bind(row.id, row.owner_id, row.lease_token, this.now())
      .first();
    if (!found) throw new NpgError(409, 'This request has stopped. Refresh the history.');
  }
  async action(owner: string, id: string) {
    const row = await this.db
      .prepare('SELECT * FROM npg_analyst_actions WHERE id=? AND owner_id=?')
      .bind(id, owner)
      .first<Action>();
    if (!row) throw new NpgError(404, 'Review not found.');
    return row;
  }
  async addAction(row: Conversation, action: Action) {
    await this.assertLease(row);
    await this.db
      .prepare(
        `INSERT INTO npg_analyst_actions(id,conversation_id,owner_id,version,tool,arguments_json,call_id,response_id,review_json,expires_at)
   VALUES(?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        action.id,
        row.id,
        row.owner_id,
        row.version,
        action.tool,
        action.arguments_json,
        action.call_id,
        action.response_id,
        action.review_json,
        action.expires_at
      )
      .run();
  }
  async consume(row: Conversation, action: Action, decision: 'approve' | 'reject') {
    await this.assertLease(row);
    const status =
      action.expires_at <= this.now()
        ? 'expired'
        : decision === 'reject'
          ? 'rejected'
          : 'dispatching';
    const taken = await this.db
      .prepare(
        `UPDATE npg_analyst_actions SET status=? WHERE id=? AND owner_id=? AND conversation_id=? AND version=? AND status='pending' RETURNING id`
      )
      .bind(status, action.id, row.owner_id, row.id, row.version - 1)
      .first();
    if (!taken) throw new NpgError(409, 'This review was already used or changed.');
    return status;
  }
  // Resolve original approved source/action pairs; never clone them into recovery state.
  async savedReceipt(owner: string, npi: string, reference?: ReceiptReference) {
    const row = await this.db
      .prepare(
        `SELECT c.id AS conversation_id, s.value AS source_json
      FROM npg_analyst_conversations c, json_each(c.state_json,'$.sources') s
      JOIN npg_analyst_actions a ON a.id=json_extract(s.value,'$.actionId')
      WHERE c.owner_id=? AND c.scope='npg' AND a.owner_id=c.owner_id AND a.conversation_id=c.id
      AND a.tool='enrich_candidate_complete_profile' AND a.status IN ('completed','ambiguous')
      AND json_extract(s.value,'$.tool')=a.tool
      AND json_extract(a.arguments_json,'$.npi')=json_extract(s.value,'$.data.npi')
      AND json_extract(a.arguments_json,'$.operation_id')=a.id
      AND json_extract(a.arguments_json,'$.confirm_paid_enrichment')=1
      AND json_extract(s.value,'$.data.npi')=?
      AND (? IS NULL OR (c.id=? AND a.id=?))
      AND (? IS NOT NULL OR EXISTS(SELECT 1 FROM json_each(s.value,'$.data.providers') p
        WHERE p.key IN ('pdl','exa','apify') AND
        (json_extract(p.value,'$.status') IN ('pending','blocked_review','privacy_blocked_review','association_failure','billing_review','ambiguous')
          OR (p.key='apify' AND json_extract(p.value,'$.charge_reconciled')=0))))
      ORDER BY c.updated_at DESC LIMIT 1`
      )
      .bind(
        owner,
        npi,
        reference?.actionId ?? null,
        reference?.conversationId ?? null,
        reference?.actionId ?? null,
        reference?.actionId ?? null
      )
      .first<{ conversation_id: string; source_json: string }>();
    if (!row) return;
    const source = JSON.parse(row.source_json) as Source;
    return {
      reference: { conversationId: row.conversation_id, actionId: source.actionId! },
      source
    };
  }
  receiptHoldMessage(source?: Source) {
    if (!source)
      return 'This candidate has an existing receipt hold. Ask your operator to reconcile the original receipt. No new paid lookup was sent.';
    const providers = (source.data as any)?.providers ?? {};
    const statuses = ['pdl', 'exa', 'apify']
      .map(
        (name) =>
          `${name === 'apify' ? 'Skip Trace' : name.toUpperCase()}: ${providers[name]?.status ?? providers[name]?.match_status ?? 'unknown'}`
      )
      .join('; ');
    const blocked = ['pdl', 'exa', 'apify'].some((name) =>
      ['blocked_review', 'privacy_blocked_review', 'association_failure', 'ambiguous'].includes(
        providers[name]?.status
      )
    );
    return (
      `Saved approved evidence is shown below. ${statuses}. ` +
      (blocked
        ? 'Identity or privacy review remains held; ask your operator to review the provider reasons. '
        : providers.apify?.status === 'billing_review'
          ? 'Billing review requires your operator to reconcile the original receipt. '
          : 'Continue receipt recovery in the original conversation. ') +
      (providers.apify?.charge_reconciled === true
        ? 'Skip Trace billing is reconciled; this does not clear identity or privacy review. '
        : 'Skip Trace billing is not yet confirmed reconciled. ') +
      'No new paid lookup was sent.'
    );
  }
  async receiptHold(actionId: string, message: string) {
    const action = await this.db
      .prepare('SELECT * FROM npg_analyst_actions WHERE id=?')
      .bind(actionId)
      .first<Action>();
    const saved = action
      ? await this.savedReceipt(action.owner_id, JSON.parse(action.arguments_json).npi)
      : undefined;
    return new NpgReceiptHoldError(
      saved ? this.receiptHoldMessage(saved.source) : message,
      saved?.reference
    );
  }
  async acquirePaid(token: string, actionId = '', leaseMs = 150000) {
    const uncertain = actionId
      ? await this.db
          .prepare(
            `SELECT prior.id FROM npg_analyst_actions prior JOIN npg_analyst_actions current ON current.id=?
      WHERE (prior.status='ambiguous' OR (prior.status='dispatching' AND prior.id<>current.id))
      AND prior.tool<>'request_professional_contact_enrichment'
      AND NOT EXISTS (SELECT 1 FROM npg_analyst_conversations historical, json_each(historical.state_json,'$.sources') source
        WHERE json_extract(source.value,'$.actionId')=prior.id
        AND json_extract(source.value,'$.data.providers.clay.status') IN ('pending','delivery_unknown','unavailable')
        AND json_extract(source.value,'$.data.providers.pdl.status') IN ('matched','complete','no_match','review_required')
        AND (json_extract(source.value,'$.data.providers.exa.status') IN ('matched','complete','no_match','review_required') OR json_extract(source.value,'$.data.providers.exa.match_status') IN ('verified_match','plausible_match','no_match'))
        AND json_extract(source.value,'$.data.providers.apify.status') IN ('no_contact','review_required','provider_failed','provider_aborted','provider_timeout')
        AND json_extract(source.value,'$.data.providers.apify.charge_reconciled')=1)
      AND (prior.id=current.id OR (json_extract(prior.arguments_json,'$.npi') IS NOT NULL AND json_extract(prior.arguments_json,'$.npi')=json_extract(current.arguments_json,'$.npi'))) LIMIT 1`
          )
          .bind(actionId)
          .first()
      : undefined;
    if (uncertain)
      throw await this.receiptHold(
        actionId,
        'This candidate has an uncertain operation. Reconcile its existing receipts before another request for the same candidate.'
      );
    // Pending exact candidate receipts are shared holds across owners/conversations.
    // Recovery never grants another paid creation, including after scheduler exhaustion.
    if (actionId) {
      const pending = await this.db
        .prepare(
          `SELECT c.id FROM npg_analyst_conversations c
        JOIN npg_analyst_actions current ON current.id=?
        WHERE c.scope='npg' AND EXISTS (
          SELECT 1 FROM json_each(c.state_json,'$.sources') s
          WHERE json_extract(s.value,'$.tool')='enrich_candidate_complete_profile'
          AND json_extract(s.value,'$.data.npi')=json_extract(current.arguments_json,'$.npi')
          AND (json_extract(s.value,'$.data.providers.apify.status')='pending'
            OR json_extract(s.value,'$.data.providers.apify.charge_reconciled')=0
            OR EXISTS (SELECT 1 FROM json_each(s.value,'$.data.providers') p WHERE p.key IN ('pdl','exa','apify') AND json_extract(p.value,'$.status') IN ('blocked_review','privacy_blocked_review','association_failure','billing_review','ambiguous')))) LIMIT 1`
        )
        .bind(actionId)
        .first();
      if (pending)
        throw await this.receiptHold(
          actionId,
          'This candidate has existing provider receipts awaiting reconciliation. No new paid lookup was sent.'
        );
    }
    const now = this.now();
    const row = await this.db
      .prepare(
        "INSERT INTO npg_analyst_paid_lease(scope,token,lease_until) VALUES('npg',?,?) ON CONFLICT(scope) DO UPDATE SET token=excluded.token,lease_until=excluded.lease_until WHERE lease_until<=? RETURNING token"
      )
      .bind(token, now + leaseMs, now)
      .first();
    if (!row)
      throw new NpgError(
        409,
        'Another paid action is being reconciled. Request a new review after it finishes.'
      );
  }
  async releasePaid(token: string) {
    await this.db
      .prepare("UPDATE npg_analyst_paid_lease SET lease_until=0 WHERE scope='npg' AND token=?")
      .bind(token)
      .run();
  }
  async markPaid(row: Conversation) {
    const result = await this.db
      .prepare(
        "UPDATE npg_analyst_conversations SET paid_dispatched=1 WHERE id=? AND owner_id=? AND lease_token=? AND status='running' AND lease_until>?"
      )
      .bind(row.id, row.owner_id, row.lease_token, this.now())
      .run();
    if (!result.meta.changes) throw new NpgError(409, 'This request stopped before dispatch.');
    row.paid_dispatched = 1;
  }
  async checkpoint(row: Conversation, state: State) {
    await this.assertLease(row);
    await this.db
      .prepare(
        "UPDATE npg_analyst_conversations SET state_json=? WHERE id=? AND owner_id=? AND lease_token=? AND status='running'"
      )
      .bind(JSON.stringify(state), row.id, row.owner_id, row.lease_token)
      .run();
  }
  async finish(
    row: Conversation,
    state: State,
    status: Conversation['status'],
    toolCount: number,
    completedActionId?: string
  ) {
    const json = JSON.stringify(state);
    if (json.length > 450000)
      throw new NpgError(409, 'Conversation is full. Start a new conversation.');
    await this.assertLease(row);
    await this.db.batch([
      ...(completedActionId
        ? [
            this.db
              .prepare(
                "UPDATE npg_analyst_actions SET status='completed' WHERE id=? AND owner_id=? AND conversation_id=? AND status='dispatching'"
              )
              .bind(completedActionId, row.owner_id, row.id)
          ]
        : []),
      this.db
        .prepare(
          "UPDATE npg_analyst_conversations SET state_json=?,status=?,updated_at=?,lease_until=0 WHERE id=? AND owner_id=? AND lease_token=? AND status='running'"
        )
        .bind(json, status, this.now(), row.id, row.owner_id, row.lease_token),
      this.db
        .prepare(
          `INSERT OR IGNORE INTO npg_analyst_receipts SELECT run_id,id,owner_id,version,?, ?,?,? FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND lease_token=? AND status=?`
        )
        .bind(
          status,
          toolCount,
          NPG_PROMPT_SHA256,
          this.now(),
          row.id,
          row.owner_id,
          row.lease_token,
          status
        )
    ]);
  }
  async sourcesForRead(owner: string, id: string, state: State): Promise<Source[]> {
    const referenced: Source[] = [];
    for (const reference of (state.receiptReferences ?? []).slice(-1)) {
      const approved = await this.db
        .prepare(
          'SELECT arguments_json FROM npg_analyst_actions WHERE id=? AND owner_id=? AND conversation_id=?'
        )
        .bind(reference.actionId, owner, reference.conversationId)
        .first<{ arguments_json: string }>();
      if (!approved) continue;
      const saved = await this.savedReceipt(
        owner,
        JSON.parse(approved.arguments_json).npi,
        reference
      );
      if (saved)
        referenced.push({
          ...saved.source,
          existingReceipt: reference.conversationId !== id,
          receiptConversationId: reference.conversationId
        });
    }
    return [
      ...state.sources.filter(
        (source) => !referenced.some((selected) => selected.actionId === source.actionId)
      ),
      ...referenced
    ];
  }
  async view(owner: string, id: string) {
    let row = await this.read(owner, id),
      state: State = JSON.parse(row.state_json);
    // Narrow repair of the pre-dispatch receipt-hold interruption shipped previously.
    // A compare-and-swap prevents a history read from overwriting active chat/recovery.
    const last = state.messages.at(-1);
    if (
      row.status === 'interrupted' &&
      row.paid_dispatched === 0 &&
      last?.role === 'assistant' &&
      [
        'This candidate has existing provider receipts awaiting reconciliation. No new paid lookup was sent.',
        'This candidate has an uncertain operation. Reconcile its existing receipts before another request for the same candidate.'
      ].includes(last.text)
    ) {
      const held = await this.db
        .prepare(
          `SELECT * FROM npg_analyst_actions WHERE owner_id=? AND conversation_id=? AND tool='enrich_candidate_complete_profile' AND status='expired' AND json_extract(arguments_json,'$.confirm_paid_enrichment')=1 AND json_extract(arguments_json,'$.operation_id')=id AND version=? LIMIT 1`
        )
        .bind(owner, id, row.version - 1)
        .first<Action>();
      if (held) {
        const saved = await this.savedReceipt(owner, JSON.parse(held.arguments_json).npi);
        if (saved) state.receiptReferences = [saved.reference];
        delete state.pendingId;
        delete state.responseId;
        last.text = this.receiptHoldMessage(saved?.source);
        await this.db
          .prepare(
            `UPDATE npg_analyst_conversations SET state_json=?,status='idle',version=version+1 WHERE id=? AND owner_id=? AND version=? AND status='interrupted' AND paid_dispatched=0 AND state_json=?`
          )
          .bind(JSON.stringify(state), id, owner, row.version, row.state_json)
          .run();
        row = await this.read(owner, id);
        state = JSON.parse(row.state_json);
      }
    }
    const action = state.pendingId ? await this.action(owner, state.pendingId) : undefined;
    const answerPositions = new Map(state.messages.flatMap((message, index) =>
      message.role === 'assistant' && message.answerId ? [[message.answerId, index] as const] : []
    ));
    const sources = await this.sourcesForRead(owner, id, state);
    return {
      id: row.id,
      version: row.version,
      status: row.status,
      messages: state.messages,
      sources: sources.map((source): Source & { assistantMessageIndex?: number } => {
        const index = source.answerId && !source.existingReceipt ? answerPositions.get(source.answerId) : undefined;
        return index === undefined ? source : { ...source, assistantMessageIndex: index };
      }),
      enrichmentRecovery: recoveryView(state, this.now()),
      pending:
        action && action.status === 'pending'
          ? {
              id: action.id,
              tool: action.tool,
              arguments: JSON.parse(action.arguments_json),
              review: JSON.parse(action.review_json),
              expiresAt: action.expires_at
            }
          : null
    };
  }
}
