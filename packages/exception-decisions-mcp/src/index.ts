// exception-decisions-mcp — decision-scoped MCP for the app-review exceptions loop.
// v1.4.0: viewer role — read-only identities refused on every writing tool (decide item,
//         decide version, recommend). Built for embeddable demo surfaces (wrop, Dify demo
//         agent) so operators can browse the live queue without any path to a write.
// v1.2.0: role-aware recommendation prefix + automation keys refused on decide tools.
// v1.1.0 source was lost from disk; reconstructed 2026-08-18 from the deployed bundle
// (docs/recovered-deploy-v1.1.0.js) — behavior is identical except the v1.2.0 changes.

interface Env {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  DECIDERS_JSON?: string;
  DECISIONS_VIEW_URL?: string;
}

interface Decider {
  name: string;
  email: string;
  role?: string;
  surface?: string;
}

interface Ctx {
  airtable: Airtable;
  decider: Decider;
  viewUrl: string;
}

type Fields = Record<string, unknown>;
interface AirtableRecord {
  id: string;
  fields: Fields;
}

const BASE_ID_DEFAULT = "appMoIgXMTTTNIc3p";
const VIEW_URL_DEFAULT = "https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/";
const VERSIONS_TABLE = "tblHxZ2hgSFLZxsZu";
const ITEMS_TABLE = "tblnbaaIbIulWl0b7";
const DECISIONS_VIEW = "viwM48eXQT4Mxc4Ak";
const VERSION = "1.4.0";

const V = {
  name: "fldKA9eJja5uajlok",
  creator: "fldVW2Xx0PoLIfw3D",
  exceptionStatus: "fldQo0XS9zJp5PifI",
  exceptionType: "fldYBytJAxkoax1db",
  exceptionRationale: "fldHm7bwSMkrcHYip",
  exceptionDecisionNotes: "fldYVNmh3VKM7mGbV",
  exceptionDecisionBy: "fldQwXHkFcpNgmDSM",
  holdNotes: "fldmcikFo6r5GyLuf",
  undecidedItems: "fldiVQqWSw5shDkZS",
  deniedItems: "fldzwlnjdAapVFkzp",
  itemsLink: "fld8hWsxsAssmFi6u",
};

const I = {
  item: "fldmJcVJCytD1VY1r",
  versionLink: "fldqVk39RERL1tVPP",
  status: "fld0D5PoJAWhYeHiI",
  type: "fldUqjcnkOUO7RRKS",
  rationale: "fldHNABt611HJ6JxI",
  decisionNotes: "fldZvSg7gpbBw89Hz",
  decisionBy: "fldcPJTTphd9MGnjT",
  requestedBy: "fldg17LtSEg66IkxJ",
};

const VERSION_STATUS = {
  requested: "🆕Requested",
  underReview: "👀Under Review",
  approved: "✅Approved",
  denied: "❌Denied",
};

const ITEM_STATUS = {
  requested: "🆕Requested",
  underReview: "👀Under Review",
  approved: "✅Approved",
  denied: "❌Denied",
};

class AirtableError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

class Airtable {
  constructor(
    private apiKey: string,
    private baseId: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`https://api.airtable.com/v0/${this.baseId}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...((init?.headers as Record<string, string>) ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    if (!response.ok) {
      throw new AirtableError(`Airtable ${response.status}: ${JSON.stringify(body.error ?? body)}`, response.status);
    }
    return body as T;
  }

  async list(table: string, params: Record<string, string | string[]>): Promise<AirtableRecord[]> {
    const search = new URLSearchParams();
    search.set("returnFieldsByFieldId", "true");
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
      if (offset) search.set("offset", offset);
      const page = await this.request<{ records: AirtableRecord[]; offset?: string }>(`${table}?${search.toString()}`);
      records.push(...page.records);
      offset = page.offset;
    } while (offset);
    return records;
  }

  async getByIds(table: string, ids: string[], fields: string[]): Promise<AirtableRecord[]> {
    const out: AirtableRecord[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const formula = `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
      out.push(...(await this.list(table, { filterByFormula: formula, fields })));
    }
    return out;
  }

  async getOne(table: string, recordId: string): Promise<AirtableRecord> {
    return await this.request<AirtableRecord>(`${table}/${recordId}?returnFieldsByFieldId=true`);
  }

  async update(table: string, recordId: string, fields: Fields): Promise<unknown> {
    return await this.request(table, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id: recordId, fields }], typecast: true }),
    });
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function selectName(value: unknown): string {
  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name: unknown }).name);
  }
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function linkIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function isUndecided(status: string): boolean {
  return status === "" || status === ITEM_STATUS.requested || status === ITEM_STATUS.underReview;
}

function isAutomation(decider: Decider): boolean {
  return decider.role === "automation";
}

// v1.4.0: viewer identities exist for demo/embed surfaces. They may read everything
// (list, get, whoami, draft composition) and write nothing — refused server-side on
// every tool that touches Airtable, before any read that could mask the refusal.
function isViewer(decider: Decider): boolean {
  return decider.role === "viewer";
}

const VIEWER_REFUSAL = [
  "No write made: this key is a read-only viewer identity (demo surface). It can browse the queue and",
  "read items, but decisions and recommendations are made by people with their own keys.",
].join(" ");

function attribution(decider: Decider, verb = "Decision"): string {
  return `\n\n— ${verb} recorded by ${decider.name} (${decider.email}) via exception-decisions-mcp, ${new Date().toISOString()}`;
}

async function writeDecision(
  airtable: Airtable,
  table: string,
  recordId: string,
  fields: Fields,
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

const DECISION_VALUES = ["approved", "denied", "under_review"] as const;
const RECOMMENDATION_VALUES = ["approve", "deny"] as const;

// v1.3.0 decision-rights split: automations may record item-level DENY decisions (the guideline
// stands — nothing is waived, and a person can still grant the exception afterward by setting
// ✅Approved). Granting an exception (approve) and every version-level action — including the
// denial that releases feedback to the developer — remain person-only.
const AUTOMATION_APPROVE_REFUSAL = [
  "No write made: this key is an automation identity. Automations may record item-level DENY decisions",
  "(the guideline stands) but can never grant an exception — approvals are made by a person with their own key.",
].join(" ");

const AUTOMATION_VERSION_REFUSAL = [
  "No write made: this key is an automation identity. Version-level decisions — including the denial that",
  "releases review feedback to the developer — are made by a person with their own key.",
].join(" ");

const DEVELOPER_TOOLKIT_NOTE = [
  "**Working through the findings:** the app submission form offers two downloadable developer skills that pair",
  "with any skill-capable coding agent (or read as plain checklists): **webflow-app-preflight** — a pre-submission",
  "gate over the patterns that most often cause rejections, ending in SUBMIT or DO NOT SUBMIT — and",
  "**webflow-app-review-remediation** — built for exactly this situation: it turns issued findings into a",
  "prioritized fix plan with evidence per acceptance criterion and prepares a resubmission packet, ending in READY",
  "or NOT READY TO RESUBMIT. Before resubmitting, run App Review Preflight on the corrected bundle and include the",
  "wfpre_ receipt with the submission.",
].join(" ");

function plainEnglishOf(rationale: string): string {
  const match = rationale.match(/In plain English[^:]*:\s*([\s\S]*?)(?:\s*Why it matters:|$)/);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}

function whyItMattersOf(rationale: string): string {
  const match = rationale.match(/Why it matters:\s*([\s\S]*?)$/);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}

function fixOf(rationale: string): string {
  const match = rationale.match(/Fix:\s*([\s\S]*?)(?:\n\n|$)/);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}

const TOOLS = [
  {
    name: "list_pending_exceptions",
    description:
      "The decision queue: every app version whose ⚖️exception request is awaiting a decision, with its per-item ⚖️Exceptions rows. Each item is decided individually — an exemption for one item never implies the rest are fine. Start here.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_exception_item",
    description:
      "Full detail for one ⚖️Exceptions item: the technical finding, the plain-English translation, current status, and any decision notes.",
    inputSchema: {
      type: "object",
      properties: { item_id: { type: "string", description: "The ⚖️Exceptions record id (rec…)" } },
      required: ["item_id"],
      additionalProperties: false,
    },
  },
  {
    name: "decide_exception_item",
    description:
      'Record a decision on ONE exception item: "approved" (the exception is granted — the finding is allowed for this app), "denied" (the guideline stands — the developer must fix it), or "under_review" (partner-lead recommendation stage; add your read in the notes). Posts to #app-review-exceptions automatically. Approving an item is NOT version approval — the version still needs a full testing round. Automation-role keys may record "denied" only; approvals are made by people.',
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "The ⚖️Exceptions record id (rec…)" },
        decision: { type: "string", enum: [...DECISION_VALUES] },
        notes: { type: "string", description: "Decision rationale, visible to reviewers and posted to Slack." },
      },
      required: ["item_id", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "decide_version_exception",
    description:
      "Record the version-level (aggregate) exception decision. Approving AND denying both require every per-item row to be decided first — a denial releases feedback and cannot land mid-decision. DENYING RELEASES THE REVIEW FEEDBACK TO THE DEVELOPER automatically (the version moves to ❌Rejected and the standard pipeline emails the partner) — pass confirm_release: true to acknowledge that. Automation-role keys are refused: decisions are made by people.",
    inputSchema: {
      type: "object",
      properties: {
        version_id: { type: "string", description: "The 🖌️Asset Versions record id (rec…)" },
        decision: { type: "string", enum: [...DECISION_VALUES] },
        notes: { type: "string" },
        confirm_release: {
          type: "boolean",
          description: 'Required true when decision is "denied": acknowledges the automatic feedback email to the developer.',
        },
      },
      required: ["version_id", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "recommend_exception_item",
    description:
      "Record a recommendation on ONE undecided item without deciding it. Sets the item to 👀Under Review and appends a labeled recommendation line for the final decision-maker — 'Partner-lead recommendation: …' for person keys, 'Automated recommendation (advisory): …' for automation keys. The item stays in the queue until the final allow/deny lands.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "The ⚖️Exceptions record id (rec…)" },
        recommendation: { type: "string", enum: [...RECOMMENDATION_VALUES] },
        notes: { type: "string", description: "The recommender's read: business context, risk view, confidence, precedents." },
      },
      required: ["item_id", "recommendation"],
      additionalProperties: false,
    },
  },
  {
    name: "draft_developer_update",
    description:
      "Compose a developer-facing status update for one app version from the review records: exempted items (no action), required fixes (plain English + fix guidance), items still pending decision, next steps, and the developer skills toolkit. Returns a DRAFT for the partner-lead to review and send through their own channel — this tool never contacts the developer. Only include content the developer is authorized to receive (their own app's findings).",
    inputSchema: {
      type: "object",
      properties: {
        version_id: { type: "string", description: "The 🖌️Asset Versions record id (rec…)" },
      },
      required: ["version_id"],
      additionalProperties: false,
    },
  },
  {
    name: "whoami",
    description: "The identity this key decides as, and how decisions are attributed.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

async function toolListPending(ctx: Ctx): Promise<string> {
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
    return "The decision queue is empty — no exception requests are awaiting a decision.";
  }
  const allItemIds = versions.flatMap((record) => linkIds(record.fields[V.itemsLink]));
  const items = allItemIds.length ? await ctx.airtable.getByIds(ITEMS_TABLE, allItemIds, [I.item, I.status, I.type, I.versionLink]) : [];
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
      const status = selectName(row.fields[I.status]) || "(no status — undecided)";
      const marker = isUndecided(selectName(row.fields[I.status])) ? "☐" : "☑";
      return `  ${marker} ${row.id} · [${selectName(row.fields[I.type])}] ${text(row.fields[I.item])} — ${status}`;
    });
    const holdNotes = text(record.fields[V.holdNotes]).trim();
    return [
      `## ${text(record.fields[V.name])} (${record.id})`,
      `Status: ${selectName(record.fields[V.exceptionStatus])} · Undecided items: ${num(record.fields[V.undecidedItems])} · Denied items: ${num(record.fields[V.deniedItems])}`,
      holdNotes ? `Context: ${holdNotes}` : null,
      `Record: ${ctx.viewUrl}${record.id}`,
      "",
      ...(lines.length ? lines : ["  (no per-item rows — decide at the version level)"]),
    ]
      .filter((line) => line !== null)
      .join("\n");
  });
  return [
    `# Exception decision queue — ${versions.length} version(s) awaiting decisions`,
    "",
    "Use get_exception_item for full detail (technical + plain English), then decide_exception_item per row.",
    "When every row on a version is decided, record the aggregate with decide_version_exception.",
    "",
    ...sections,
  ].join("\n");
}

async function toolGetItem(ctx: Ctx, args: { item_id: string }): Promise<string> {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const versionIds = linkIds(record.fields[I.versionLink]);
  const status = selectName(record.fields[I.status]) || "(no status — undecided)";
  const decisionNotes = text(record.fields[I.decisionNotes]).trim();
  return [
    `# ${text(record.fields[I.item])}`,
    `Item: ${record.id} · Type: ${selectName(record.fields[I.type])} · Status: ${status}`,
    versionIds.length ? `Version record: ${ctx.viewUrl}${versionIds[0]}` : null,
    "",
    text(record.fields[I.rationale]),
    decisionNotes ? `\n## Decision notes so far\n${decisionNotes}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

async function toolDecideItem(
  ctx: Ctx,
  args: { item_id: string; decision: (typeof DECISION_VALUES)[number]; notes?: string },
): Promise<string> {
  if (isViewer(ctx.decider)) {
    return VIEWER_REFUSAL;
  }
  if (isAutomation(ctx.decider) && args.decision !== "denied") {
    return AUTOMATION_APPROVE_REFUSAL;
  }
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const current = selectName(record.fields[I.status]);
  if (!isUndecided(current)) {
    return `No write made: "${text(record.fields[I.item])}" already has a decision (${current}). Decisions are corrected in Airtable, not overwritten here.`;
  }
  const statusValue =
    args.decision === "approved" ? ITEM_STATUS.approved : args.decision === "denied" ? ITEM_STATUS.denied : ITEM_STATUS.underReview;
  const existingNotes = text(record.fields[I.decisionNotes]);
  const notes = `${existingNotes ? `${existingNotes}\n\n` : ""}${args.notes ?? ""}${attribution(ctx.decider)}`;
  const { stamped } = await writeDecision(
    ctx.airtable,
    ITEMS_TABLE,
    args.item_id,
    { [I.status]: statusValue, [I.decisionNotes]: notes },
    I.decisionBy,
    ctx.decider,
  );
  let remaining = "";
  const versionId = linkIds(record.fields[I.versionLink])[0];
  if (versionId) {
    const version = await ctx.airtable.getOne(VERSIONS_TABLE, versionId);
    remaining = `\nRemaining undecided items on ${text(version.fields[V.name])}: ${num(version.fields[V.undecidedItems])}. When all rows are decided, record the aggregate with decide_version_exception.`;
  }
  return [
    `Recorded ${statusValue} on "${text(record.fields[I.item])}" as ${ctx.decider.name}.`,
    stamped ? "" : "(⚖️Decision By collaborator stamp could not resolve this email in Airtable — attribution is preserved in the decision notes.)",
    "The transparency post to #app-review-exceptions and the datetime stamp are automatic.",
    remaining,
  ]
    .filter(Boolean)
    .join("\n");
}

async function toolDecideVersion(
  ctx: Ctx,
  args: { version_id: string; decision: (typeof DECISION_VALUES)[number]; notes?: string; confirm_release?: boolean },
): Promise<string> {
  if (isViewer(ctx.decider)) {
    return VIEWER_REFUSAL;
  }
  if (isAutomation(ctx.decider)) {
    return AUTOMATION_VERSION_REFUSAL;
  }
  const record = await ctx.airtable.getOne(VERSIONS_TABLE, args.version_id);
  const current = selectName(record.fields[V.exceptionStatus]);
  if (current !== VERSION_STATUS.requested && current !== VERSION_STATUS.underReview) {
    return `No write made: ${text(record.fields[V.name])} has version-level exception status "${current || "(empty)"}" — nothing awaiting a decision.`;
  }
  const undecided = num(record.fields[V.undecidedItems]);
  if (args.decision === "approved" && undecided > 0) {
    return `No write made: ${undecided} per-item row(s) are still undecided on ${text(record.fields[V.name])}. Decide every item first (list_pending_exceptions shows them) — the aggregate follows the items.`;
  }
  if (args.decision === "denied" && undecided > 0) {
    return `No write made: ${undecided} per-item row(s) are still undecided on ${text(record.fields[V.name])}. A version-level denial releases the review feedback to the developer, so it cannot land mid-decision — decide every item first, then deny the aggregate.`;
  }
  if (args.decision === "denied" && args.confirm_release !== true) {
    return [
      "No write made. Denying the version-level exception RELEASES THE FEEDBACK TO THE DEVELOPER:",
      "the version moves to ❌Rejected and the standard pipeline emails the review feedback to the partner automatically.",
      "Call again with confirm_release: true to proceed.",
    ].join("\n");
  }
  const statusValue =
    args.decision === "approved"
      ? VERSION_STATUS.approved
      : args.decision === "denied"
        ? VERSION_STATUS.denied
        : VERSION_STATUS.underReview;
  const existingNotes = text(record.fields[V.exceptionDecisionNotes]);
  const notes = `${existingNotes ? `${existingNotes}\n\n` : ""}${args.notes ?? ""}${attribution(ctx.decider)}`;
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
    stamped ? "" : "(⚖️Exception Decision By collaborator stamp could not resolve — attribution preserved in decision notes.)",
    args.decision === "denied"
      ? "The denial follow-through now runs automatically: the version moves to ❌Rejected and the review feedback is emailed to the partner."
      : args.decision === "approved"
        ? "This approves the exception only — the assigned reviewer is DMed to resume with a full testing round before any version approval."
        : "Marked under review; add per-item recommendations with decide_exception_item.",
    "Transparency posts and datetime stamps are automatic.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function toolRecommendItem(
  ctx: Ctx,
  args: { item_id: string; recommendation: (typeof RECOMMENDATION_VALUES)[number]; notes?: string },
): Promise<string> {
  if (isViewer(ctx.decider)) {
    return VIEWER_REFUSAL;
  }
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const current = selectName(record.fields[I.status]);
  if (!isUndecided(current)) {
    return `No write made: "${text(record.fields[I.item])}" already has a decision (${current}) — a recommendation no longer applies.`;
  }
  const label = isAutomation(ctx.decider) ? "Automated recommendation (advisory)" : "Partner-lead recommendation";
  const existingNotes = text(record.fields[I.decisionNotes]);
  const line = `${label}: ${args.recommendation.toUpperCase()}${args.notes ? ` — ${args.notes}` : ""}`;
  const notes = `${existingNotes ? `${existingNotes}\n\n` : ""}${line}${attribution(ctx.decider, "Recommendation")}`;
  await ctx.airtable.update(ITEMS_TABLE, args.item_id, {
    [I.status]: ITEM_STATUS.underReview,
    [I.decisionNotes]: notes,
  });
  return [
    `Recorded recommendation (${args.recommendation.toUpperCase()}) on "${text(record.fields[I.item])}" as ${ctx.decider.name}.`,
    "The item is now 👀Under Review — it stays in the queue until the final allow/deny is recorded with decide_exception_item.",
  ].join("\n");
}

async function toolDraftDeveloperUpdate(ctx: Ctx, args: { version_id: string }): Promise<string> {
  const version = await ctx.airtable.getOne(VERSIONS_TABLE, args.version_id);
  const itemIds = linkIds(version.fields[V.itemsLink]);
  const items = itemIds.length ? await ctx.airtable.getByIds(ITEMS_TABLE, itemIds, [I.item, I.status, I.rationale]) : [];
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
      approved.push(`- **${name}** — exempted for this app.${plain ? ` (${plain})` : ""}`);
    } else if (status === ITEM_STATUS.denied) {
      denied.push(`- **${name}**${plain ? ` — ${plain}` : ""}${why ? ` ${why}` : ""}${fix ? `\n  Fix: ${fix}` : ""}`);
    } else {
      pending.push(`- **${name}**`);
    }
  }
  const appName = text(version.fields[V.name]);
  const total = items.length;
  const sections = [
    `# ${appName} — review status update`,
    "",
    `_DRAFT prepared for ${ctx.decider.name} — review, edit, and send through your own channel. This tool has not contacted the developer._`,
    "",
    `**Where things stand:** ${total} flagged item(s) — ${approved.length} exempted, ${denied.length} requiring fixes, ${pending.length} still pending a decision.`,
  ];
  if (approved.length) {
    sections.push("", "## Exempted for this app (no action needed)", ...approved);
  }
  if (denied.length) {
    sections.push("", "## Requires fixes before resubmission", ...denied);
  }
  if (pending.length) {
    sections.push("", "## Still pending decision on our side", ...pending, "", "We'll follow up as these land — no action needed from you yet.");
  }
  sections.push(
    "",
    "## Next steps",
    "Address the required fixes, rebuild the exact production bundle, and resubmit through the app submission form. Exempted items need no changes. The resubmission goes through the standard review, including a full testing round.",
    "",
    DEVELOPER_TOOLKIT_NOTE,
  );
  return sections.join("\n");
}

function toolWhoami(ctx: Ctx): string {
  return [
    `You are deciding as ${ctx.decider.name} <${ctx.decider.email}>${ctx.decider.role ? ` (${ctx.decider.role})` : ""}.`,
    isViewer(ctx.decider)
      ? "This is a read-only VIEWER identity (demo surface): it can browse the queue, read items, and compose drafts, but every writing tool refuses it. Decisions and recommendations are made by people with their own keys."
      : isAutomation(ctx.decider)
        ? "This is an AUTOMATION identity: it may record advisory recommendations and item-level DENY decisions (the guideline stands — nothing is waived). It can never grant an exception (approve) and is refused on all version-level tools, including the denial that releases feedback to the developer."
        : "Every decision stamps ⚖️Decision By (best effort) and appends a signed attribution line to the decision notes.",
    "Decision rights: item DENY may be automated; exceptions (approve) and every version-level action are made by people. A person can grant an exception on a denied item at any time by correcting it in Airtable. Item decisions post to #app-review-exceptions as they land.",
  ].join("\n");
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version",
};

function rpcResult(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status: 200, headers: JSON_HEADERS });
}

function rpcError(id: unknown, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

function toolText(content: string, isError = false) {
  return { content: [{ type: "text", text: content }], isError };
}

function resolveDecider(request: Request, pathKey: string | null, env: Env): Decider | null {
  if (!env.DECIDERS_JSON) return null;
  let deciders: Record<string, Decider>;
  try {
    deciders = JSON.parse(env.DECIDERS_JSON);
  } catch {
    return null;
  }
  const header = request.headers.get("Authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const key = bearer ?? pathKey;
  if (!key) return null;
  return deciders[key] ?? null;
}

async function handleMcp(request: Request, env: Env, decider: Decider): Promise<Response> {
  if (request.method === "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: JSON_HEADERS });
  }
  if (request.method === "DELETE") {
    return new Response(null, { status: 200, headers: JSON_HEADERS });
  }
  let message: { id?: unknown; method?: string; params?: { protocolVersion?: string; name?: string; arguments?: Record<string, unknown> } };
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (message.id === undefined || message.id === null) {
    return new Response(null, { status: 202, headers: JSON_HEADERS });
  }
  const id = message.id;
  if (message.method === "initialize") {
    const requested = message.params?.protocolVersion;
    const supported = ["2025-06-18", "2025-03-26", "2024-11-05"];
    return rpcResult(id, {
      protocolVersion: supported.includes(requested ?? "") ? requested : "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "exception-decisions-mcp", version: VERSION },
      instructions:
        "App-review exception decisions only. Start with list_pending_exceptions; read items with get_exception_item. Recommendation stage: recommend_exception_item (advisory — labeled by role) + draft_developer_update (developer comms drafts). Decision stage: decide_exception_item / decide_version_exception. Decision rights: automation keys may record item-level DENY only (the guideline stands); granting an exception (approve) and all version-level actions are person-only. Approving an exception never approves the version — reviews still run their testing round. Denying a version-level exception emails the review feedback to the developer automatically.",
    });
  }
  if (message.method === "ping") {
    return rpcResult(id, {});
  }
  if (message.method === "tools/list") {
    return rpcResult(id, { tools: TOOLS });
  }
  if (message.method === "tools/call") {
    const params = message.params ?? {};
    const name = params.name ?? "";
    const args = params.arguments ?? {};
    if (!env.AIRTABLE_API_KEY) {
      return rpcResult(id, toolText("Server misconfigured: AIRTABLE_API_KEY is not provisioned.", true));
    }
    const ctx: Ctx = {
      airtable: new Airtable(env.AIRTABLE_API_KEY, env.AIRTABLE_BASE_ID ?? BASE_ID_DEFAULT),
      decider,
      viewUrl: env.DECISIONS_VIEW_URL ?? VIEW_URL_DEFAULT,
    };
    try {
      switch (name) {
        case "list_pending_exceptions":
          return rpcResult(id, toolText(await toolListPending(ctx)));
        case "get_exception_item":
          if (typeof args.item_id !== "string" || !args.item_id.startsWith("rec")) {
            return rpcResult(id, toolText("item_id must be an Airtable record id (rec…).", true));
          }
          return rpcResult(id, toolText(await toolGetItem(ctx, { item_id: args.item_id })));
        case "decide_exception_item": {
          if (typeof args.item_id !== "string" || !args.item_id.startsWith("rec")) {
            return rpcResult(id, toolText("item_id must be an Airtable record id (rec…).", true));
          }
          const decision = args.decision as (typeof DECISION_VALUES)[number];
          if (!DECISION_VALUES.includes(decision)) {
            return rpcResult(id, toolText(`decision must be one of: ${DECISION_VALUES.join(", ")}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolDecideItem(ctx, {
                item_id: args.item_id,
                decision,
                notes: typeof args.notes === "string" ? args.notes : undefined,
              }),
            ),
          );
        }
        case "decide_version_exception": {
          if (typeof args.version_id !== "string" || !args.version_id.startsWith("rec")) {
            return rpcResult(id, toolText("version_id must be an Airtable record id (rec…).", true));
          }
          const decision = args.decision as (typeof DECISION_VALUES)[number];
          if (!DECISION_VALUES.includes(decision)) {
            return rpcResult(id, toolText(`decision must be one of: ${DECISION_VALUES.join(", ")}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolDecideVersion(ctx, {
                version_id: args.version_id,
                decision,
                notes: typeof args.notes === "string" ? args.notes : undefined,
                confirm_release: args.confirm_release === true,
              }),
            ),
          );
        }
        case "recommend_exception_item": {
          if (typeof args.item_id !== "string" || !args.item_id.startsWith("rec")) {
            return rpcResult(id, toolText("item_id must be an Airtable record id (rec…).", true));
          }
          const recommendation = args.recommendation as (typeof RECOMMENDATION_VALUES)[number];
          if (!RECOMMENDATION_VALUES.includes(recommendation)) {
            return rpcResult(id, toolText(`recommendation must be one of: ${RECOMMENDATION_VALUES.join(", ")}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolRecommendItem(ctx, {
                item_id: args.item_id,
                recommendation,
                notes: typeof args.notes === "string" ? args.notes : undefined,
              }),
            ),
          );
        }
        case "draft_developer_update":
          if (typeof args.version_id !== "string" || !args.version_id.startsWith("rec")) {
            return rpcResult(id, toolText("version_id must be an Airtable record id (rec…).", true));
          }
          return rpcResult(id, toolText(await toolDraftDeveloperUpdate(ctx, { version_id: args.version_id })));
        case "whoami":
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
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify(
          {
            name: "exception-decisions-mcp",
            version: VERSION,
            description:
              "Decision-scoped MCP for the app-review exceptions loop: list the pending queue, read dual-register items, record approve/deny with identity stamping. Reviewer-side fields are out of scope.",
            auth: "Per-person key — Authorization: Bearer <key>, or path form /mcp/<key> for clients without header support.",
            endpoints: { mcp: "/mcp (bearer) or /mcp/<key>" },
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
          JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Unknown or missing decision key." } }),
          { status: 401, headers: { ...JSON_HEADERS, "WWW-Authenticate": 'Bearer realm="exception-decisions-mcp"' } },
        );
      }
      return handleMcp(request, env, decider);
    }
    return new Response("Not found", { status: 404, headers: JSON_HEADERS });
  },
};
