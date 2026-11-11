import { NPG_PROMPT_SHA256 } from './policy';
export class NpgError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
export type Message = { role: 'user' | 'assistant'; text: string; skipTraceReceipt?: string };
export type Source = { tool: string; data: unknown };
export type State = {
  messages: Message[];
  sources: Source[];
  responseId?: string;
  pendingId?: string;
  skipTracePending?: { actionId: string; id: string; run_id: string };
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
  async list(owner: string) {
    const rows = await this.db
      .prepare(
        "SELECT id,status,updated_at FROM npg_analyst_conversations WHERE owner_id=? AND scope='npg' ORDER BY updated_at DESC LIMIT 100"
      )
      .bind(owner)
      .all<{ id: string; status: string; updated_at: number }>();
    return rows.results;
  }
  async read(owner: string, id: string): Promise<Conversation> {
    let row = await this.db
      .prepare("SELECT * FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND scope='npg'")
      .bind(id, owner)
      .first<Conversation>();
    if (!row) throw new NpgError(404, 'Conversation not found.');
    if (row.status === 'running' && row.lease_until <= this.now()) {
      const outcome = row.paid_dispatched ? 'ambiguous' : 'interrupted';
      await this.db.batch([
        this.db
          .prepare(
            "UPDATE npg_analyst_conversations SET status=?,lease_token=NULL WHERE id=? AND owner_id=? AND status='running' AND lease_until<=?"
          )
          .bind(outcome, id, owner, this.now()),
        this.db
          .prepare(
            `INSERT OR IGNORE INTO npg_analyst_receipts SELECT run_id,id,owner_id,version,?,0,?,? FROM npg_analyst_conversations WHERE id=? AND owner_id=? AND status=?`
          )
          .bind(outcome, NPG_PROMPT_SHA256, this.now(), id, owner, outcome),
        this.db
          .prepare(
            "UPDATE npg_analyst_actions SET status='ambiguous' WHERE conversation_id=? AND owner_id=? AND status='dispatching'"
          )
          .bind(id, owner)
      ]);
      row = (await this.db
        .prepare('SELECT * FROM npg_analyst_conversations WHERE id=? AND owner_id=?')
        .bind(id, owner)
        .first<Conversation>())!;
    }
    return row;
  }
  async start(owner: string, id: string, version: number, token: string) {
    const run = crypto.randomUUID();
    const row = await this.db
      .prepare(
        `UPDATE npg_analyst_conversations SET status='running',version=version+1,
   run_id=?,lease_token=?,lease_until=?,paid_dispatched=0,updated_at=?
   WHERE id=? AND owner_id=? AND scope='npg' AND version=? AND status IN ('idle','review') RETURNING *`
      )
      .bind(run, token, this.now() + 145000, this.now(), id, owner, version)
      .first<Conversation>();
    if (!row)
      throw new NpgError(
        409,
        'This conversation changed or stopped. Refresh its history before continuing.'
      );
    return row;
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
  async acquirePaid(token: string, actionId = '') {
    const uncertain = await this.db
      .prepare(
        "SELECT id FROM npg_analyst_actions WHERE status='ambiguous' OR (status='dispatching' AND id<>?) LIMIT 1"
      )
      .bind(actionId)
      .first();
    if (uncertain)
      throw new NpgError(
        409,
        'A previous paid action needs operator reconciliation before more credits can be spent.'
      );
    const now = this.now();
    const row = await this.db
      .prepare(
        "INSERT INTO npg_analyst_paid_lease(scope,token,lease_until) VALUES('npg',?,?) ON CONFLICT(scope) DO UPDATE SET token=excluded.token,lease_until=excluded.lease_until WHERE lease_until<=? RETURNING token"
      )
      .bind(token, now + 150000, now)
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
  async view(owner: string, id: string) {
    const row = await this.read(owner, id),
      state: State = JSON.parse(row.state_json);
    const action = state.pendingId ? await this.action(owner, state.pendingId) : undefined;
    return {
      id: row.id,
      version: row.version,
      status: row.status,
      messages: state.messages,
      sources: state.sources,
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
