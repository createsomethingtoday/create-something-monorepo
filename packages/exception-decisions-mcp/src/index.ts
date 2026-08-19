/**
 * exception-decisions-mcp — the Judgment tier of the app-review exceptions loop
 * as its own MCP surface.
 *
 * Scope (deliberately narrow): see the pending exception queue, read an item's
 * full dual-register rationale, and record decisions (approve / deny /
 * under-review) with the decision-maker's identity stamped on the record.
 * Everything else — Slack transparency posts, datetime stamps, the denial
 * feedback release to the developer, approval-gate enforcement — is handled by
 * the Airtable automations this worker writes into. It never touches review
 * status, feedback, or any reviewer-side field.
 *
 * Identity: per-person keys in the DECIDERS_JSON secret. A key arrives either
 * as `Authorization: Bearer <key>` or as a path segment (`/mcp/<key>`) for
 * clients that cannot set headers. The mapped email/name drive the
 * ⚖️Decision By collaborator stamp (best effort) and an attribution line
 * appended to the decision notes (always).
 *
 * Runbook: packages/webflow-app-review-mcp/docs/exception-transparency-loop.md
 */

interface Decider {
  email: string;
  name: string;
  role?: string;
}

interface Env {
  AIRTABLE_API_KEY?: string;
  DECIDERS_JSON?: string;
  AIRTABLE_BASE_ID?: string;
  DECISIONS_VIEW_URL?: string;
}

const BASE_ID_DEFAULT = 'appMoIgXMTTTNIc3p';
const VIEW_URL_DEFAULT = 'https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/';

const VERSIONS_TABLE = 'tblHxZ2hgSFLZxsZu';
const ITEMS_TABLE = 'tblnbaaIbIulWl0b7';
const DECISIONS_VIEW = 'viwM48eXQT4Mxc4Ak';

// 🖌️Asset Versions fields
const V = {
  name: 'fldKA9eJja5uajlok',
  creator: 'fldVW2Xx0PoLIfw3D',
  exceptionStatus: 'fldQo0XS9zJp5PifI',
  exceptionType: 'fldYBytJAxkoax1db',
  exceptionRationale: 'fldHm7bwSMkrcHYip',
  exceptionDecisionNotes: 'fldYVNmh3VKM7mGbV',
  exceptionDecisionBy: 'fldQwXHkFcpNgmDSM',
  holdNotes: 'fldmcikFo6r5GyLuf',
  undecidedItems: 'fldiVQqWSw5shDkZS',
  deniedItems: 'fldzwlnjdAapVFkzp',
  itemsLink: 'fld8hWsxsAssmFi6u',
} as const;

// ⚖️Exceptions (per-item) fields
const I = {
  item: 'fldmJcVJCytD1VY1r',
  versionLink: 'fldqVk39RERL1tVPP',
  status: 'fld0D5PoJAWhYeHiI',
  type: 'fldUqjcnkOUO7RRKS',
  rationale: 'fldHNABt611HJ6JxI',
  decisionNotes: 'fldZvSg7gpbBw89Hz',
  decisionBy: 'fldcPJTTphd9MGnjT',
  requestedBy: 'fldg17LtSEg66IkxJ',
} as const;

const VERSION_STATUS = {
  requested: '🆕Requested',
  underReview: '👀Under Review',
  approved: '✅Approved',
  denied: '❌Denied',
} as const;

const ITEM_STATUS = {
  requested: '🆕Requested',
  underReview: '👀Under Review',
  approved: '✅Approved',
  denied: '❌Denied',
} as const;

type AirtableFields = Record<string, unknown>;
interface AirtableRecord {
  id: string;
  fields: AirtableFields;
}

class AirtableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

class Airtable {
  constructor(
    private apiKey: string,
    private baseId: string,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(`https://api.airtable.com/v0/${this.baseId}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new AirtableError(`Airtable ${response.status}: ${JSON.stringify(body.error ?? body)}`, response.status);
    }
    return body;
  }

  async list(table: string, params: Record<string, string | string[]>): Promise<AirtableRecord[]> {
    const search = new URLSearchParams();
    search.set('returnFieldsByFieldId', 'true');
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const entry of value) search.append(`${key}[]`, entry);
      } else {
        search.set(key, value);
      }
    }
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      if (offset) search.set('offset', offset);
      const page = (await this.request(`${table}?${search.toString()}`)) as {
        records: AirtableRecord[];
        offset?: string;
      };
      records.push(...page.records);
      offset = page.offset;
    } while (offset);
    return records;
  }

  async getByIds(table: string, ids: string[], fields: string[]): Promise<AirtableRecord[]> {
    const out: AirtableRecord[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const formula = `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
      out.push(...(await this.list(table, { filterByFormula: formula, fields })));
    }
    return out;
  }

  async getOne(table: string, recordId: string): Promise<AirtableRecord> {
    return (await this.request(`${table}/${recordId}?returnFieldsByFieldId=true`)) as AirtableRecord;
  }

  async update(table: string, recordId: string, fields: AirtableFields): Promise<AirtableRecord> {
    return (await this.request(table, {
      method: 'PATCH',
      body: JSON.stringify({ records: [{ id: recordId, fields }], typecast: true }),
    })) as unknown as AirtableRecord;
  }
}

// ---------------------------------------------------------------------------

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function selectName(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).name);
  }
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function linkIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function isUndecided(status: string): boolean {
  return status === '' || status === ITEM_STATUS.requested || status === ITEM_STATUS.underReview;
}

function attribution(decider: Decider): string {
  return `\n\n— Decision recorded by ${decider.name} (${decider.email}) via exception-decisions-mcp, ${new Date().toISOString()}`;
}

/**
 * Write decision fields + status in ONE update so the Airtable automations
 * (which fire on the status change and read record state) see the notes and
 * collaborator stamp. Collaborator writes need the person to be resolvable in
 * the workspace; when that fails, retry without the collaborator field — the
 * attribution line in the notes preserves who decided.
 */
async function writeDecision(
  airtable: Airtable,
  table: string,
  recordId: string,
  fields: AirtableFields,
  collaboratorFieldId: string,
  decider: Decider,
): Promise<{ stamped: boolean }> {
  try {
    await airtable.update(table, recordId, { ...fields, [collaboratorFieldId]: { email: decider.email } });
    return { stamped: true };
  } catch (error) {
    if (error instanceof AirtableError && error.status === 422) {
      await airtable.update(table, recordId, fields);
      return { stamped: false };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Tools

interface ToolContext {
  airtable: Airtable;
  decider: Decider;
  viewUrl: string;
}

const DECISION_VALUES = ['approved', 'denied', 'under_review'] as const;
type Decision = (typeof DECISION_VALUES)[number];

const RECOMMENDATION_VALUES = ['approve', 'deny'] as const;
type Recommendation = (typeof RECOMMENDATION_VALUES)[number];

/**
 * Developer toolkit pointer — included in every developer-facing draft so the
 * partner can work through findings with the same tooling the review runs.
 */
const DEVELOPER_TOOLKIT_NOTE = [
  '**Working through the findings:** the app submission form offers two downloadable developer skills that pair',
  'with any skill-capable coding agent (or read as plain checklists): **webflow-app-preflight** — a pre-submission',
  'gate over the patterns that most often cause rejections, ending in SUBMIT or DO NOT SUBMIT — and',
  '**webflow-app-review-remediation** — built for exactly this situation: it turns issued findings into a',
  'prioritized fix plan with evidence per acceptance criterion and prepares a resubmission packet, ending in READY',
  'or NOT READY TO RESUBMIT. Before resubmitting, run App Review Preflight on the corrected bundle and include the',
  'wfpre_ receipt with the submission.',
].join(' ');

function plainEnglishOf(rationale: string): string {
  const match = rationale.match(/In plain English[^:]*:\s*([\s\S]*?)(?:\s*Why it matters:|$)/);
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

function whyItMattersOf(rationale: string): string {
  const match = rationale.match(/Why it matters:\s*([\s\S]*?)$/);
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

function fixOf(rationale: string): string {
  const match = rationale.match(/Fix:\s*([\s\S]*?)(?:\n\n|$)/);
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

const TOOLS = [
  {
    name: 'list_pending_exceptions',
    description:
      'The decision queue: every app version whose ⚖️exception request is awaiting a decision, with its per-item ⚖️Exceptions rows. Each item is decided individually — an exemption for one item never implies the rest are fine. Start here.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_exception_item',
    description:
      'Full detail for one ⚖️Exceptions item: the technical finding, the plain-English translation, current status, and any decision notes.',
    inputSchema: {
      type: 'object',
      properties: { item_id: { type: 'string', description: 'The ⚖️Exceptions record id (rec…)' } },
      required: ['item_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'decide_exception_item',
    description:
      'Record a decision on ONE exception item: "approved" (the exception is granted — the finding is allowed for this app), "denied" (the guideline stands — the developer must fix it), or "under_review" (partner-lead recommendation stage; add your read in the notes). Posts to #app-review-exceptions automatically. Approving an item is NOT version approval — the version still needs a full testing round.',
    inputSchema: {
      type: 'object',
      properties: {
        item_id: { type: 'string', description: 'The ⚖️Exceptions record id (rec…)' },
        decision: { type: 'string', enum: [...DECISION_VALUES] },
        notes: { type: 'string', description: 'Decision rationale, visible to reviewers and posted to Slack.' },
      },
      required: ['item_id', 'decision'],
      additionalProperties: false,
    },
  },
  {
    name: 'decide_version_exception',
    description:
      'Record the version-level (aggregate) exception decision. Approving requires every per-item row to be decided first. DENYING RELEASES THE REVIEW FEEDBACK TO THE DEVELOPER automatically (the version moves to ❌Rejected and the standard pipeline emails the partner) — pass confirm_release: true to acknowledge that.',
    inputSchema: {
      type: 'object',
      properties: {
        version_id: { type: 'string', description: 'The 🖌️Asset Versions record id (rec…)' },
        decision: { type: 'string', enum: [...DECISION_VALUES] },
        notes: { type: 'string' },
        confirm_release: {
          type: 'boolean',
          description: 'Required true when decision is "denied": acknowledges the automatic feedback email to the developer.',
        },
      },
      required: ['version_id', 'decision'],
      additionalProperties: false,
    },
  },
  {
    name: 'recommend_exception_item',
    description:
      "The partner-lead stage: record a recommendation on ONE undecided item without deciding it. Sets the item to 👀Under Review and appends 'Partner-lead recommendation: APPROVE/DENY — <notes>' for the final decision-maker. The item stays in the queue until the final allow/deny lands.",
    inputSchema: {
      type: 'object',
      properties: {
        item_id: { type: 'string', description: 'The ⚖️Exceptions record id (rec…)' },
        recommendation: { type: 'string', enum: [...RECOMMENDATION_VALUES] },
        notes: { type: 'string', description: 'The partner-lead read: business context, relationship stakes, risk view.' },
      },
      required: ['item_id', 'recommendation'],
      additionalProperties: false,
    },
  },
  {
    name: 'draft_developer_update',
    description:
      "Compose a developer-facing status update for one app version from the review records: exempted items (no action), required fixes (plain English + fix guidance), items still pending decision, next steps, and the developer skills toolkit. Returns a DRAFT for the partner-lead to review and send through their own channel — this tool never contacts the developer. Only include content the developer is authorized to receive (their own app's findings).",
    inputSchema: {
      type: 'object',
      properties: {
        version_id: { type: 'string', description: 'The 🖌️Asset Versions record id (rec…)' },
      },
      required: ['version_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'whoami',
    description: 'The identity this key decides as, and how decisions are attributed.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;

async function toolListPending(ctx: ToolContext): Promise<string> {
  const versions = (
    await ctx.airtable.list(VERSIONS_TABLE, {
      view: DECISIONS_VIEW,
      fields: [V.name, V.creator, V.exceptionStatus, V.exceptionRationale, V.holdNotes, V.undecidedItems, V.deniedItems, V.itemsLink],
    })
  ).filter((record) => {
    const status = selectName(record.fields[V.exceptionStatus]);
    return status === VERSION_STATUS.requested || status === VERSION_STATUS.underReview;
  });

  if (versions.length === 0) {
    return 'The decision queue is empty — no exception requests are awaiting a decision.';
  }

  const allItemIds = versions.flatMap((record) => linkIds(record.fields[V.itemsLink]));
  const items = allItemIds.length
    ? await ctx.airtable.getByIds(ITEMS_TABLE, allItemIds, [I.item, I.status, I.type, I.versionLink])
    : [];
  const itemsByVersion = new Map<string, AirtableRecord[]>();
  for (const item of items) {
    for (const versionId of linkIds(item.fields[I.versionLink])) {
      const bucket = itemsByVersion.get(versionId) ?? [];
      bucket.push(item);
      itemsByVersion.set(versionId, bucket);
    }
  }

  const sections = versions.map((record) => {
    const rows = itemsByVersion.get(record.id) ?? [];
    const lines = rows.map((row) => {
      const status = selectName(row.fields[I.status]) || '(no status — undecided)';
      const marker = isUndecided(selectName(row.fields[I.status])) ? '☐' : '☑';
      return `  ${marker} ${row.id} · [${selectName(row.fields[I.type])}] ${text(row.fields[I.item])} — ${status}`;
    });
    const holdNotes = text(record.fields[V.holdNotes]).trim();
    return [
      `## ${text(record.fields[V.name])} (${record.id})`,
      `Status: ${selectName(record.fields[V.exceptionStatus])} · Undecided items: ${num(record.fields[V.undecidedItems])} · Denied items: ${num(record.fields[V.deniedItems])}`,
      holdNotes ? `Context: ${holdNotes}` : null,
      `Record: ${ctx.viewUrl}${record.id}`,
      '',
      ...(lines.length ? lines : ['  (no per-item rows — decide at the version level)']),
    ]
      .filter((line): line is string => line !== null)
      .join('\n');
  });

  return [
    `# Exception decision queue — ${versions.length} version(s) awaiting decisions`,
    '',
    'Use get_exception_item for full detail (technical + plain English), then decide_exception_item per row.',
    'When every row on a version is decided, record the aggregate with decide_version_exception.',
    '',
    ...sections,
  ].join('\n');
}

async function toolGetItem(ctx: ToolContext, args: { item_id: string }): Promise<string> {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const versionIds = linkIds(record.fields[I.versionLink]);
  const status = selectName(record.fields[I.status]) || '(no status — undecided)';
  const decisionNotes = text(record.fields[I.decisionNotes]).trim();
  return [
    `# ${text(record.fields[I.item])}`,
    `Item: ${record.id} · Type: ${selectName(record.fields[I.type])} · Status: ${status}`,
    versionIds.length ? `Version record: ${ctx.viewUrl}${versionIds[0]}` : null,
    '',
    text(record.fields[I.rationale]),
    decisionNotes ? `\n## Decision notes so far\n${decisionNotes}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

async function toolDecideItem(
  ctx: ToolContext,
  args: { item_id: string; decision: Decision; notes?: string },
): Promise<string> {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const current = selectName(record.fields[I.status]);
  if (!isUndecided(current)) {
    return `No write made: "${text(record.fields[I.item])}" already has a decision (${current}). Decisions are corrected in Airtable, not overwritten here.`;
  }

  const statusValue =
    args.decision === 'approved'
      ? ITEM_STATUS.approved
      : args.decision === 'denied'
        ? ITEM_STATUS.denied
        : ITEM_STATUS.underReview;

  const existingNotes = text(record.fields[I.decisionNotes]);
  const notes = `${existingNotes ? `${existingNotes}\n\n` : ''}${args.notes ?? ''}${attribution(ctx.decider)}`;

  const { stamped } = await writeDecision(
    ctx.airtable,
    ITEMS_TABLE,
    args.item_id,
    { [I.status]: statusValue, [I.decisionNotes]: notes },
    I.decisionBy,
    ctx.decider,
  );

  // Remaining undecided on the version, for the decider's orientation.
  let remaining = '';
  const versionId = linkIds(record.fields[I.versionLink])[0];
  if (versionId) {
    const version = await ctx.airtable.getOne(VERSIONS_TABLE, versionId);
    remaining = `\nRemaining undecided items on ${text(version.fields[V.name])}: ${num(version.fields[V.undecidedItems])}. When all rows are decided, record the aggregate with decide_version_exception.`;
  }

  return [
    `Recorded ${statusValue} on "${text(record.fields[I.item])}" as ${ctx.decider.name}.`,
    stamped ? '' : '(⚖️Decision By collaborator stamp could not resolve this email in Airtable — attribution is preserved in the decision notes.)',
    'The transparency post to #app-review-exceptions and the datetime stamp are automatic.',
    remaining,
  ]
    .filter(Boolean)
    .join('\n');
}

async function toolDecideVersion(
  ctx: ToolContext,
  args: { version_id: string; decision: Decision; notes?: string; confirm_release?: boolean },
): Promise<string> {
  const record = await ctx.airtable.getOne(VERSIONS_TABLE, args.version_id);
  const current = selectName(record.fields[V.exceptionStatus]);
  if (current !== VERSION_STATUS.requested && current !== VERSION_STATUS.underReview) {
    return `No write made: ${text(record.fields[V.name])} has version-level exception status "${current || '(empty)'}" — nothing awaiting a decision.`;
  }

  const undecided = num(record.fields[V.undecidedItems]);
  if (args.decision === 'approved' && undecided > 0) {
    return `No write made: ${undecided} per-item row(s) are still undecided on ${text(record.fields[V.name])}. Decide every item first (list_pending_exceptions shows them) — the aggregate follows the items.`;
  }
  if (args.decision === 'denied' && args.confirm_release !== true) {
    return [
      'No write made. Denying the version-level exception RELEASES THE FEEDBACK TO THE DEVELOPER:',
      'the version moves to ❌Rejected and the standard pipeline emails the review feedback to the partner automatically.',
      'Call again with confirm_release: true to proceed.',
    ].join('\n');
  }

  const statusValue =
    args.decision === 'approved'
      ? VERSION_STATUS.approved
      : args.decision === 'denied'
        ? VERSION_STATUS.denied
        : VERSION_STATUS.underReview;

  const existingNotes = text(record.fields[V.exceptionDecisionNotes]);
  const notes = `${existingNotes ? `${existingNotes}\n\n` : ''}${args.notes ?? ''}${attribution(ctx.decider)}`;

  const { stamped } = await writeDecision(
    ctx.airtable,
    VERSIONS_TABLE,
    args.version_id,
    { [V.exceptionStatus]: statusValue, [V.exceptionDecisionNotes]: notes },
    V.exceptionDecisionBy,
    ctx.decider,
  );

  return [
    `Recorded ${statusValue} on ${text(record.fields[V.name])} as ${ctx.decider.name}.`,
    stamped ? '' : '(⚖️Exception Decision By collaborator stamp could not resolve — attribution preserved in decision notes.)',
    args.decision === 'denied'
      ? 'The denial follow-through now runs automatically: the version moves to ❌Rejected and the review feedback is emailed to the partner.'
      : args.decision === 'approved'
        ? 'This approves the exception only — the assigned reviewer is DMed to resume with a full testing round before any version approval.'
        : 'Marked under review; add per-item recommendations with decide_exception_item.',
    'Transparency posts and datetime stamps are automatic.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function toolRecommendItem(
  ctx: ToolContext,
  args: { item_id: string; recommendation: Recommendation; notes?: string },
): Promise<string> {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const current = selectName(record.fields[I.status]);
  if (!isUndecided(current)) {
    return `No write made: "${text(record.fields[I.item])}" already has a decision (${current}) — a recommendation no longer applies.`;
  }

  const existingNotes = text(record.fields[I.decisionNotes]);
  const line = `Partner-lead recommendation: ${args.recommendation.toUpperCase()}${args.notes ? ` — ${args.notes}` : ''}`;
  const notes = `${existingNotes ? `${existingNotes}\n\n` : ''}${line}${attribution(ctx.decider)}`;

  await ctx.airtable.update(ITEMS_TABLE, args.item_id, {
    [I.status]: ITEM_STATUS.underReview,
    [I.decisionNotes]: notes,
  });

  return [
    `Recorded recommendation (${args.recommendation.toUpperCase()}) on "${text(record.fields[I.item])}" as ${ctx.decider.name}.`,
    'The item is now 👀Under Review — it stays in the queue until the final allow/deny is recorded with decide_exception_item.',
  ].join('\n');
}

async function toolDraftDeveloperUpdate(ctx: ToolContext, args: { version_id: string }): Promise<string> {
  const version = await ctx.airtable.getOne(VERSIONS_TABLE, args.version_id);
  const itemIds = linkIds(version.fields[V.itemsLink]);
  const items = itemIds.length
    ? await ctx.airtable.getByIds(ITEMS_TABLE, itemIds, [I.item, I.status, I.rationale])
    : [];

  const approved: string[] = [];
  const denied: string[] = [];
  const pending: string[] = [];
  for (const item of items) {
    const status = selectName(item.fields[I.status]);
    const name = text(item.fields[I.item]);
    const rationale = text(item.fields[I.rationale]);
    const plain = plainEnglishOf(rationale);
    const why = whyItMattersOf(rationale);
    const fix = fixOf(rationale);
    if (status === ITEM_STATUS.approved) {
      approved.push(`- **${name}** — exempted for this app.${plain ? ` (${plain})` : ''}`);
    } else if (status === ITEM_STATUS.denied) {
      denied.push(
        `- **${name}**${plain ? ` — ${plain}` : ''}${why ? ` ${why}` : ''}${fix ? `\n  Fix: ${fix}` : ''}`,
      );
    } else {
      pending.push(`- **${name}**`);
    }
  }

  const appName = text(version.fields[V.name]);
  const total = items.length;
  const sections = [
    `# ${appName} — review status update`,
    '',
    `_DRAFT prepared for ${ctx.decider.name} — review, edit, and send through your own channel. This tool has not contacted the developer._`,
    '',
    `**Where things stand:** ${total} flagged item(s) — ${approved.length} exempted, ${denied.length} requiring fixes, ${pending.length} still pending a decision.`,
  ];
  if (approved.length) {
    sections.push('', '## Exempted for this app (no action needed)', ...approved);
  }
  if (denied.length) {
    sections.push('', '## Requires fixes before resubmission', ...denied);
  }
  if (pending.length) {
    sections.push('', '## Still pending decision on our side', ...pending, '', "We'll follow up as these land — no action needed from you yet.");
  }
  sections.push(
    '',
    '## Next steps',
    'Address the required fixes, rebuild the exact production bundle, and resubmit through the app submission form. Exempted items need no changes. The resubmission goes through the standard review, including a full testing round.',
    '',
    DEVELOPER_TOOLKIT_NOTE,
  );

  return sections.join('\n');
}

function toolWhoami(ctx: ToolContext): string {
  return [
    `You are deciding as ${ctx.decider.name} <${ctx.decider.email}>${ctx.decider.role ? ` (${ctx.decider.role})` : ''}.`,
    'Every decision stamps ⚖️Decision By (best effort) and appends a signed attribution line to the decision notes.',
    'Decision chain: partner-lead review → final allow/deny. Item decisions post to #app-review-exceptions as they land.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// MCP over Streamable HTTP (JSON responses; stateless)

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version',
};

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: number | string | null, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), { status: 200, headers: JSON_HEADERS });
}

function rpcError(id: number | string | null, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

function toolText(content: string, isError = false): unknown {
  return { content: [{ type: 'text', text: content }], isError };
}

function resolveDecider(request: Request, pathKey: string | null, env: Env): Decider | null {
  if (!env.DECIDERS_JSON) return null;
  let deciders: Record<string, Decider>;
  try {
    deciders = JSON.parse(env.DECIDERS_JSON) as Record<string, Decider>;
  } catch {
    return null;
  }
  const header = request.headers.get('Authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const key = bearer ?? pathKey;
  if (!key) return null;
  return deciders[key] ?? null;
}

async function handleMcp(request: Request, env: Env, decider: Decider): Promise<Response> {
  if (request.method === 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: JSON_HEADERS });
  }
  if (request.method === 'DELETE') {
    return new Response(null, { status: 200, headers: JSON_HEADERS });
  }

  let message: JsonRpcRequest;
  try {
    message = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }

  // Notifications get an empty 202.
  if (message.id === undefined || message.id === null) {
    return new Response(null, { status: 202, headers: JSON_HEADERS });
  }

  const id = message.id;

  if (message.method === 'initialize') {
    const requested = (message.params as { protocolVersion?: string } | undefined)?.protocolVersion;
    const supported = ['2025-06-18', '2025-03-26', '2024-11-05'];
    return rpcResult(id, {
      protocolVersion: supported.includes(requested ?? '') ? requested : '2025-03-26',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'exception-decisions-mcp', version: '1.1.0' },
      instructions:
        'App-review exception decisions only. Start with list_pending_exceptions; read items with get_exception_item. Partner-lead stage: recommend_exception_item + draft_developer_update (developer comms drafts). Final stage: decide_exception_item / decide_version_exception. Approving an exception never approves the version — reviews still run their testing round. Denying a version-level exception emails the review feedback to the developer automatically.',
    });
  }

  if (message.method === 'ping') {
    return rpcResult(id, {});
  }

  if (message.method === 'tools/list') {
    return rpcResult(id, { tools: TOOLS });
  }

  if (message.method === 'tools/call') {
    const params = (message.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const name = params.name ?? '';
    const args = params.arguments ?? {};
    if (!env.AIRTABLE_API_KEY) {
      return rpcResult(id, toolText('Server misconfigured: AIRTABLE_API_KEY is not provisioned.', true));
    }
    const ctx: ToolContext = {
      airtable: new Airtable(env.AIRTABLE_API_KEY, env.AIRTABLE_BASE_ID ?? BASE_ID_DEFAULT),
      decider,
      viewUrl: env.DECISIONS_VIEW_URL ?? VIEW_URL_DEFAULT,
    };
    try {
      switch (name) {
        case 'list_pending_exceptions':
          return rpcResult(id, toolText(await toolListPending(ctx)));
        case 'get_exception_item':
          if (typeof args.item_id !== 'string' || !args.item_id.startsWith('rec')) {
            return rpcResult(id, toolText('item_id must be an Airtable record id (rec…).', true));
          }
          return rpcResult(id, toolText(await toolGetItem(ctx, { item_id: args.item_id })));
        case 'decide_exception_item': {
          if (typeof args.item_id !== 'string' || !args.item_id.startsWith('rec')) {
            return rpcResult(id, toolText('item_id must be an Airtable record id (rec…).', true));
          }
          const decision = args.decision as Decision;
          if (!DECISION_VALUES.includes(decision)) {
            return rpcResult(id, toolText(`decision must be one of: ${DECISION_VALUES.join(', ')}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolDecideItem(ctx, {
                item_id: args.item_id,
                decision,
                notes: typeof args.notes === 'string' ? args.notes : undefined,
              }),
            ),
          );
        }
        case 'decide_version_exception': {
          if (typeof args.version_id !== 'string' || !args.version_id.startsWith('rec')) {
            return rpcResult(id, toolText('version_id must be an Airtable record id (rec…).', true));
          }
          const decision = args.decision as Decision;
          if (!DECISION_VALUES.includes(decision)) {
            return rpcResult(id, toolText(`decision must be one of: ${DECISION_VALUES.join(', ')}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolDecideVersion(ctx, {
                version_id: args.version_id,
                decision,
                notes: typeof args.notes === 'string' ? args.notes : undefined,
                confirm_release: args.confirm_release === true,
              }),
            ),
          );
        }
        case 'recommend_exception_item': {
          if (typeof args.item_id !== 'string' || !args.item_id.startsWith('rec')) {
            return rpcResult(id, toolText('item_id must be an Airtable record id (rec…).', true));
          }
          const recommendation = args.recommendation as Recommendation;
          if (!RECOMMENDATION_VALUES.includes(recommendation)) {
            return rpcResult(id, toolText(`recommendation must be one of: ${RECOMMENDATION_VALUES.join(', ')}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolRecommendItem(ctx, {
                item_id: args.item_id,
                recommendation,
                notes: typeof args.notes === 'string' ? args.notes : undefined,
              }),
            ),
          );
        }
        case 'draft_developer_update':
          if (typeof args.version_id !== 'string' || !args.version_id.startsWith('rec')) {
            return rpcResult(id, toolText('version_id must be an Airtable record id (rec…).', true));
          }
          return rpcResult(id, toolText(await toolDraftDeveloperUpdate(ctx, { version_id: args.version_id })));
        case 'whoami':
          return rpcResult(id, toolText(toolWhoami(ctx)));
        default:
          return rpcError(id, -32602, `Unknown tool: ${name}`);
      }
    } catch (error) {
      return rpcResult(id, toolText(`Tool failed: ${error instanceof Error ? error.message : String(error)}`, true));
    }
  }

  return rpcError(id, -32601, `Method not found: ${message.method}`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'exception-decisions-mcp',
            version: '1.1.0',
            description:
              'Decision-scoped MCP for the app-review exceptions loop: list the pending queue, read dual-register items, record approve/deny with identity stamping. Reviewer-side fields are out of scope.',
            auth: 'Per-person key — Authorization: Bearer <key>, or path form /mcp/<key> for clients without header support.',
            endpoints: { mcp: '/mcp (bearer) or /mcp/<key>' },
            configured: {
              airtable: Boolean(env.AIRTABLE_API_KEY),
              deciders: Boolean(env.DECIDERS_JSON),
            },
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    const mcpMatch = url.pathname.match(/^\/mcp(?:\/([A-Za-z0-9_-]+))?\/?$/);
    if (mcpMatch) {
      const decider = resolveDecider(request, mcpMatch[1] ?? null, env);
      if (!decider) {
        return new Response(
          JSON.stringify({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unknown or missing decision key.' } }),
          { status: 401, headers: { ...JSON_HEADERS, 'WWW-Authenticate': 'Bearer realm="exception-decisions-mcp"' } },
        );
      }
      return handleMcp(request, env, decider);
    }

    return new Response('Not found', { status: 404, headers: JSON_HEADERS });
  },
};
