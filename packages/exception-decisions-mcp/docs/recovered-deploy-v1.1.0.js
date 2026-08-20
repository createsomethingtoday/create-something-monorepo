// Recovered from Cloudflare on 2026-08-18 via worker_get("exception-decisions-mcp").
// Deployed bundle (esbuild) of the lost src/index.ts — v1.1.0. Reference copy, not a build input.
// See recovered-deploy-v1.1.0.md in this directory for context.
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var BASE_ID_DEFAULT = "appMoIgXMTTTNIc3p";
var VIEW_URL_DEFAULT = "https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/";
var VERSIONS_TABLE = "tblHxZ2hgSFLZxsZu";
var ITEMS_TABLE = "tblnbaaIbIulWl0b7";
var DECISIONS_VIEW = "viwM48eXQT4Mxc4Ak";
var V = {
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
  itemsLink: "fld8hWsxsAssmFi6u"
};
var I = {
  item: "fldmJcVJCytD1VY1r",
  versionLink: "fldqVk39RERL1tVPP",
  status: "fld0D5PoJAWhYeHiI",
  type: "fldUqjcnkOUO7RRKS",
  rationale: "fldHNABt611HJ6JxI",
  decisionNotes: "fldZvSg7gpbBw89Hz",
  decisionBy: "fldcPJTTphd9MGnjT",
  requestedBy: "fldg17LtSEg66IkxJ"
};
var VERSION_STATUS = {
  requested: "\u{1F195}Requested",
  underReview: "\u{1F440}Under Review",
  approved: "✅Approved",
  denied: "❌Denied"
};
var ITEM_STATUS = {
  requested: "\u{1F195}Requested",
  underReview: "\u{1F440}Under Review",
  approved: "✅Approved",
  denied: "❌Denied"
};
var AirtableError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
  status;
  static {
    __name(this, "AirtableError");
  }
};
var Airtable = class {
  constructor(apiKey, baseId) {
    this.apiKey = apiKey;
    this.baseId = baseId;
  }
  apiKey;
  baseId;
  static {
    __name(this, "Airtable");
  }
  async request(path, init) {
    const response = await fetch(`https://api.airtable.com/v0/${this.baseId}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers ?? {}
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AirtableError(`Airtable ${response.status}: ${JSON.stringify(body.error ?? body)}`, response.status);
    }
    return body;
  }
  async list(table, params) {
    const search = new URLSearchParams();
    search.set("returnFieldsByFieldId", "true");
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const entry of value) search.append(`${key}[]`, entry);
      } else {
        search.set(key, value);
      }
    }
    const records = [];
    let offset;
    do {
      if (offset) search.set("offset", offset);
      const page = await this.request(`${table}?${search.toString()}`);
      records.push(...page.records);
      offset = page.offset;
    } while (offset);
    return records;
  }
  async getByIds(table, ids, fields) {
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const formula = `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
      out.push(...await this.list(table, { filterByFormula: formula, fields }));
    }
    return out;
  }
  async getOne(table, recordId) {
    return await this.request(`${table}/${recordId}?returnFieldsByFieldId=true`);
  }
  async update(table, recordId, fields) {
    return await this.request(table, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id: recordId, fields }], typecast: true })
    });
  }
};
function text(value) {
  return typeof value === "string" ? value : "";
}
__name(text, "text");
function selectName(value) {
  if (value && typeof value === "object" && "name" in value) {
    return String(value.name);
  }
  return typeof value === "string" ? value : "";
}
__name(selectName, "selectName");
function num(value) {
  return typeof value === "number" ? value : 0;
}
__name(num, "num");
function linkIds(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}
__name(linkIds, "linkIds");
function isUndecided(status) {
  return status === "" || status === ITEM_STATUS.requested || status === ITEM_STATUS.underReview;
}
__name(isUndecided, "isUndecided");
function attribution(decider) {
  return `

— Decision recorded by ${decider.name} (${decider.email}) via exception-decisions-mcp, ${(/* @__PURE__ */ new Date()).toISOString()}`;
}
__name(attribution, "attribution");
async function writeDecision(airtable, table, recordId, fields, collaboratorFieldId, decider) {
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
__name(writeDecision, "writeDecision");
var DECISION_VALUES = ["approved", "denied", "under_review"];
var RECOMMENDATION_VALUES = ["approve", "deny"];
var DEVELOPER_TOOLKIT_NOTE = [
  "**Working through the findings:** the app submission form offers two downloadable developer skills that pair",
  "with any skill-capable coding agent (or read as plain checklists): **webflow-app-preflight** — a pre-submission",
  "gate over the patterns that most often cause rejections, ending in SUBMIT or DO NOT SUBMIT — and",
  "**webflow-app-review-remediation** — built for exactly this situation: it turns issued findings into a",
  "prioritized fix plan with evidence per acceptance criterion and prepares a resubmission packet, ending in READY",
  "or NOT READY TO RESUBMIT. Before resubmitting, run App Review Preflight on the corrected bundle and include the",
  "wfpre_ receipt with the submission."
].join(" ");
function plainEnglishOf(rationale) {
  const match = rationale.match(/In plain English[^:]*:\s*([\s\S]*?)(?:\s*Why it matters:|$)/);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}
__name(plainEnglishOf, "plainEnglishOf");
function whyItMattersOf(rationale) {
  const match = rationale.match(/Why it matters:\s*([\s\S]*?)$/);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}
__name(whyItMattersOf, "whyItMattersOf");
function fixOf(rationale) {
  const match = rationale.match(/Fix:\s*([\s\S]*?)(?:\n\n|$)/);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}
__name(fixOf, "fixOf");
var TOOLS = [
  {
    name: "list_pending_exceptions",
    description: "The decision queue: every app version whose ⚖️exception request is awaiting a decision, with its per-item ⚖️Exceptions rows. Each item is decided individually — an exemption for one item never implies the rest are fine. Start here.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "get_exception_item",
    description: "Full detail for one ⚖️Exceptions item: the technical finding, the plain-English translation, current status, and any decision notes.",
    inputSchema: {
      type: "object",
      properties: { item_id: { type: "string", description: "The ⚖️Exceptions record id (rec…)" } },
      required: ["item_id"],
      additionalProperties: false
    }
  },
  {
    name: "decide_exception_item",
    description: 'Record a decision on ONE exception item: "approved" (the exception is granted — the finding is allowed for this app), "denied" (the guideline stands — the developer must fix it), or "under_review" (partner-lead recommendation stage; add your read in the notes). Posts to #app-review-exceptions automatically. Approving an item is NOT version approval — the version still needs a full testing round.',
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "The ⚖️Exceptions record id (rec…)" },
        decision: { type: "string", enum: [...DECISION_VALUES] },
        notes: { type: "string", description: "Decision rationale, visible to reviewers and posted to Slack." }
      },
      required: ["item_id", "decision"],
      additionalProperties: false
    }
  },
  {
    name: "decide_version_exception",
    description: "Record the version-level (aggregate) exception decision. Approving requires every per-item row to be decided first. DENYING RELEASES THE REVIEW FEEDBACK TO THE DEVELOPER automatically (the version moves to ❌Rejected and the standard pipeline emails the partner) — pass confirm_release: true to acknowledge that.",
    inputSchema: {
      type: "object",
      properties: {
        version_id: { type: "string", description: "The \u{1F58C}️Asset Versions record id (rec…)" },
        decision: { type: "string", enum: [...DECISION_VALUES] },
        notes: { type: "string" },
        confirm_release: {
          type: "boolean",
          description: 'Required true when decision is "denied": acknowledges the automatic feedback email to the developer.'
        }
      },
      required: ["version_id", "decision"],
      additionalProperties: false
    }
  },
  {
    name: "recommend_exception_item",
    description: "The partner-lead stage: record a recommendation on ONE undecided item without deciding it. Sets the item to \u{1F440}Under Review and appends 'Partner-lead recommendation: APPROVE/DENY — <notes>' for the final decision-maker. The item stays in the queue until the final allow/deny lands.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "The ⚖️Exceptions record id (rec…)" },
        recommendation: { type: "string", enum: [...RECOMMENDATION_VALUES] },
        notes: { type: "string", description: "The partner-lead read: business context, relationship stakes, risk view." }
      },
      required: ["item_id", "recommendation"],
      additionalProperties: false
    }
  },
  {
    name: "draft_developer_update",
    description: "Compose a developer-facing status update for one app version from the review records: exempted items (no action), required fixes (plain English + fix guidance), items still pending decision, next steps, and the developer skills toolkit. Returns a DRAFT for the partner-lead to review and send through their own channel — this tool never contacts the developer. Only include content the developer is authorized to receive (their own app's findings).",
    inputSchema: {
      type: "object",
      properties: {
        version_id: { type: "string", description: "The \u{1F58C}️Asset Versions record id (rec…)" }
      },
      required: ["version_id"],
      additionalProperties: false
    }
  },
  {
    name: "whoami",
    description: "The identity this key decides as, and how decisions are attributed.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
];
async function toolListPending(ctx) {
  const versions = (await ctx.airtable.list(VERSIONS_TABLE, {
    view: DECISIONS_VIEW,
    fields: [V.name, V.creator, V.exceptionStatus, V.exceptionRationale, V.holdNotes, V.undecidedItems, V.deniedItems, V.itemsLink]
  })).filter((record) => {
    const status = selectName(record.fields[V.exceptionStatus]);
    return status === VERSION_STATUS.requested || status === VERSION_STATUS.underReview;
  });
  if (versions.length === 0) {
    return "The decision queue is empty — no exception requests are awaiting a decision.";
  }
  const allItemIds = versions.flatMap((record) => linkIds(record.fields[V.itemsLink]));
  const items = allItemIds.length ? await ctx.airtable.getByIds(ITEMS_TABLE, allItemIds, [I.item, I.status, I.type, I.versionLink]) : [];
  const itemsByVersion = /* @__PURE__ */ new Map();
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
      return `  ${marker} ${row.id} \xB7 [${selectName(row.fields[I.type])}] ${text(row.fields[I.item])} — ${status}`;
    });
    const holdNotes = text(record.fields[V.holdNotes]).trim();
    return [
      `## ${text(record.fields[V.name])} (${record.id})`,
      `Status: ${selectName(record.fields[V.exceptionStatus])} \xB7 Undecided items: ${num(record.fields[V.undecidedItems])} \xB7 Denied items: ${num(record.fields[V.deniedItems])}`,
      holdNotes ? `Context: ${holdNotes}` : null,
      `Record: ${ctx.viewUrl}${record.id}`,
      "",
      ...lines.length ? lines : ["  (no per-item rows — decide at the version level)"]
    ].filter((line) => line !== null).join("\n");
  });
  return [
    `# Exception decision queue — ${versions.length} version(s) awaiting decisions`,
    "",
    "Use get_exception_item for full detail (technical + plain English), then decide_exception_item per row.",
    "When every row on a version is decided, record the aggregate with decide_version_exception.",
    "",
    ...sections
  ].join("\n");
}
__name(toolListPending, "toolListPending");
async function toolGetItem(ctx, args) {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const versionIds = linkIds(record.fields[I.versionLink]);
  const status = selectName(record.fields[I.status]) || "(no status — undecided)";
  const decisionNotes = text(record.fields[I.decisionNotes]).trim();
  return [
    `# ${text(record.fields[I.item])}`,
    `Item: ${record.id} \xB7 Type: ${selectName(record.fields[I.type])} \xB7 Status: ${status}`,
    versionIds.length ? `Version record: ${ctx.viewUrl}${versionIds[0]}` : null,
    "",
    text(record.fields[I.rationale]),
    decisionNotes ? `
## Decision notes so far
${decisionNotes}` : null
  ].filter((line) => line !== null).join("\n");
}
__name(toolGetItem, "toolGetItem");
async function toolDecideItem(ctx, args) {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const current = selectName(record.fields[I.status]);
  if (!isUndecided(current)) {
    return `No write made: "${text(record.fields[I.item])}" already has a decision (${current}). Decisions are corrected in Airtable, not overwritten here.`;
  }
  const statusValue = args.decision === "approved" ? ITEM_STATUS.approved : args.decision === "denied" ? ITEM_STATUS.denied : ITEM_STATUS.underReview;
  const existingNotes = text(record.fields[I.decisionNotes]);
  const notes = `${existingNotes ? `${existingNotes}

` : ""}${args.notes ?? ""}${attribution(ctx.decider)}`;
  const { stamped } = await writeDecision(
    ctx.airtable,
    ITEMS_TABLE,
    args.item_id,
    { [I.status]: statusValue, [I.decisionNotes]: notes },
    I.decisionBy,
    ctx.decider
  );
  let remaining = "";
  const versionId = linkIds(record.fields[I.versionLink])[0];
  if (versionId) {
    const version = await ctx.airtable.getOne(VERSIONS_TABLE, versionId);
    remaining = `
Remaining undecided items on ${text(version.fields[V.name])}: ${num(version.fields[V.undecidedItems])}. When all rows are decided, record the aggregate with decide_version_exception.`;
  }
  return [
    `Recorded ${statusValue} on "${text(record.fields[I.item])}" as ${ctx.decider.name}.`,
    stamped ? "" : "(⚖️Decision By collaborator stamp could not resolve this email in Airtable — attribution is preserved in the decision notes.)",
    "The transparency post to #app-review-exceptions and the datetime stamp are automatic.",
    remaining
  ].filter(Boolean).join("\n");
}
__name(toolDecideItem, "toolDecideItem");
async function toolDecideVersion(ctx, args) {
  const record = await ctx.airtable.getOne(VERSIONS_TABLE, args.version_id);
  const current = selectName(record.fields[V.exceptionStatus]);
  if (current !== VERSION_STATUS.requested && current !== VERSION_STATUS.underReview) {
    return `No write made: ${text(record.fields[V.name])} has version-level exception status "${current || "(empty)"}" — nothing awaiting a decision.`;
  }
  const undecided = num(record.fields[V.undecidedItems]);
  if (args.decision === "approved" && undecided > 0) {
    return `No write made: ${undecided} per-item row(s) are still undecided on ${text(record.fields[V.name])}. Decide every item first (list_pending_exceptions shows them) — the aggregate follows the items.`;
  }
  if (args.decision === "denied" && args.confirm_release !== true) {
    return [
      "No write made. Denying the version-level exception RELEASES THE FEEDBACK TO THE DEVELOPER:",
      "the version moves to ❌Rejected and the standard pipeline emails the review feedback to the partner automatically.",
      "Call again with confirm_release: true to proceed."
    ].join("\n");
  }
  const statusValue = args.decision === "approved" ? VERSION_STATUS.approved : args.decision === "denied" ? VERSION_STATUS.denied : VERSION_STATUS.underReview;
  const existingNotes = text(record.fields[V.exceptionDecisionNotes]);
  const notes = `${existingNotes ? `${existingNotes}

` : ""}${args.notes ?? ""}${attribution(ctx.decider)}`;
  const { stamped } = await writeDecision(
    ctx.airtable,
    VERSIONS_TABLE,
    args.version_id,
    { [V.exceptionStatus]: statusValue, [V.exceptionDecisionNotes]: notes },
    V.exceptionDecisionBy,
    ctx.decider
  );
  return [
    `Recorded ${statusValue} on ${text(record.fields[V.name])} as ${ctx.decider.name}.`,
    stamped ? "" : "(⚖️Exception Decision By collaborator stamp could not resolve — attribution preserved in decision notes.)",
    args.decision === "denied" ? "The denial follow-through now runs automatically: the version moves to ❌Rejected and the review feedback is emailed to the partner." : args.decision === "approved" ? "This approves the exception only — the assigned reviewer is DMed to resume with a full testing round before any version approval." : "Marked under review; add per-item recommendations with decide_exception_item.",
    "Transparency posts and datetime stamps are automatic."
  ].filter(Boolean).join("\n");
}
__name(toolDecideVersion, "toolDecideVersion");
async function toolRecommendItem(ctx, args) {
  const record = await ctx.airtable.getOne(ITEMS_TABLE, args.item_id);
  const current = selectName(record.fields[I.status]);
  if (!isUndecided(current)) {
    return `No write made: "${text(record.fields[I.item])}" already has a decision (${current}) — a recommendation no longer applies.`;
  }
  const existingNotes = text(record.fields[I.decisionNotes]);
  const line = `Partner-lead recommendation: ${args.recommendation.toUpperCase()}${args.notes ? ` — ${args.notes}` : ""}`;
  const notes = `${existingNotes ? `${existingNotes}

` : ""}${line}${attribution(ctx.decider)}`;
  await ctx.airtable.update(ITEMS_TABLE, args.item_id, {
    [I.status]: ITEM_STATUS.underReview,
    [I.decisionNotes]: notes
  });
  return [
    `Recorded recommendation (${args.recommendation.toUpperCase()}) on "${text(record.fields[I.item])}" as ${ctx.decider.name}.`,
    "The item is now \u{1F440}Under Review — it stays in the queue until the final allow/deny is recorded with decide_exception_item."
  ].join("\n");
}
__name(toolRecommendItem, "toolRecommendItem");
async function toolDraftDeveloperUpdate(ctx, args) {
  const version = await ctx.airtable.getOne(VERSIONS_TABLE, args.version_id);
  const itemIds = linkIds(version.fields[V.itemsLink]);
  const items = itemIds.length ? await ctx.airtable.getByIds(ITEMS_TABLE, itemIds, [I.item, I.status, I.rationale]) : [];
  const approved = [];
  const denied = [];
  const pending = [];
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
      denied.push(
        `- **${name}**${plain ? ` — ${plain}` : ""}${why ? ` ${why}` : ""}${fix ? `
  Fix: ${fix}` : ""}`
      );
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
    `**Where things stand:** ${total} flagged item(s) — ${approved.length} exempted, ${denied.length} requiring fixes, ${pending.length} still pending a decision.`
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
    DEVELOPER_TOOLKIT_NOTE
  );
  return sections.join("\n");
}
__name(toolDraftDeveloperUpdate, "toolDraftDeveloperUpdate");
function toolWhoami(ctx) {
  return [
    `You are deciding as ${ctx.decider.name} <${ctx.decider.email}>${ctx.decider.role ? ` (${ctx.decider.role})` : ""}.`,
    "Every decision stamps ⚖️Decision By (best effort) and appends a signed attribution line to the decision notes.",
    "Decision chain: partner-lead review → final allow/deny. Item decisions post to #app-review-exceptions as they land."
  ].join("\n");
}
__name(toolWhoami, "toolWhoami");
var JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version"
};
function rpcResult(id, result) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status: 200, headers: JSON_HEADERS });
}
__name(rpcResult, "rpcResult");
function rpcError(id, code, message) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status: 200,
    headers: JSON_HEADERS
  });
}
__name(rpcError, "rpcError");
function toolText(content, isError = false) {
  return { content: [{ type: "text", text: content }], isError };
}
__name(toolText, "toolText");
function resolveDecider(request, pathKey, env) {
  if (!env.DECIDERS_JSON) return null;
  let deciders;
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
__name(resolveDecider, "resolveDecider");
async function handleMcp(request, env, decider) {
  if (request.method === "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: JSON_HEADERS });
  }
  if (request.method === "DELETE") {
    return new Response(null, { status: 200, headers: JSON_HEADERS });
  }
  let message;
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (message.id === void 0 || message.id === null) {
    return new Response(null, { status: 202, headers: JSON_HEADERS });
  }
  const id = message.id;
  if (message.method === "initialize") {
    const requested = message.params?.protocolVersion;
    const supported = ["2025-06-18", "2025-03-26", "2024-11-05"];
    return rpcResult(id, {
      protocolVersion: supported.includes(requested ?? "") ? requested : "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "exception-decisions-mcp", version: "1.1.0" },
      instructions: "App-review exception decisions only. Start with list_pending_exceptions; read items with get_exception_item. Partner-lead stage: recommend_exception_item + draft_developer_update (developer comms drafts). Final stage: decide_exception_item / decide_version_exception. Approving an exception never approves the version — reviews still run their testing round. Denying a version-level exception emails the review feedback to the developer automatically."
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
    const ctx = {
      airtable: new Airtable(env.AIRTABLE_API_KEY, env.AIRTABLE_BASE_ID ?? BASE_ID_DEFAULT),
      decider,
      viewUrl: env.DECISIONS_VIEW_URL ?? VIEW_URL_DEFAULT
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
          const decision = args.decision;
          if (!DECISION_VALUES.includes(decision)) {
            return rpcResult(id, toolText(`decision must be one of: ${DECISION_VALUES.join(", ")}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolDecideItem(ctx, {
                item_id: args.item_id,
                decision,
                notes: typeof args.notes === "string" ? args.notes : void 0
              })
            )
          );
        }
        case "decide_version_exception": {
          if (typeof args.version_id !== "string" || !args.version_id.startsWith("rec")) {
            return rpcResult(id, toolText("version_id must be an Airtable record id (rec…).", true));
          }
          const decision = args.decision;
          if (!DECISION_VALUES.includes(decision)) {
            return rpcResult(id, toolText(`decision must be one of: ${DECISION_VALUES.join(", ")}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolDecideVersion(ctx, {
                version_id: args.version_id,
                decision,
                notes: typeof args.notes === "string" ? args.notes : void 0,
                confirm_release: args.confirm_release === true
              })
            )
          );
        }
        case "recommend_exception_item": {
          if (typeof args.item_id !== "string" || !args.item_id.startsWith("rec")) {
            return rpcResult(id, toolText("item_id must be an Airtable record id (rec…).", true));
          }
          const recommendation = args.recommendation;
          if (!RECOMMENDATION_VALUES.includes(recommendation)) {
            return rpcResult(id, toolText(`recommendation must be one of: ${RECOMMENDATION_VALUES.join(", ")}.`, true));
          }
          return rpcResult(
            id,
            toolText(
              await toolRecommendItem(ctx, {
                item_id: args.item_id,
                recommendation,
                notes: typeof args.notes === "string" ? args.notes : void 0
              })
            )
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
__name(handleMcp, "handleMcp");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify(
          {
            name: "exception-decisions-mcp",
            version: "1.1.0",
            description: "Decision-scoped MCP for the app-review exceptions loop: list the pending queue, read dual-register items, record approve/deny with identity stamping. Reviewer-side fields are out of scope.",
            auth: "Per-person key — Authorization: Bearer <key>, or path form /mcp/<key> for clients without header support.",
            endpoints: { mcp: "/mcp (bearer) or /mcp/<key>" },
            configured: {
              airtable: Boolean(env.AIRTABLE_API_KEY),
              deciders: Boolean(env.DECIDERS_JSON)
            }
          },
          null,
          2
        ),
        { headers: JSON_HEADERS }
      );
    }
    const mcpMatch = url.pathname.match(/^\/mcp(?:\/([A-Za-z0-9_-]+))?\/?$/);
    if (mcpMatch) {
      const decider = resolveDecider(request, mcpMatch[1] ?? null, env);
      if (!decider) {
        return new Response(
          JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Unknown or missing decision key." } }),
          { status: 401, headers: { ...JSON_HEADERS, "WWW-Authenticate": 'Bearer realm="exception-decisions-mcp"' } }
        );
      }
      return handleMcp(request, env, decider);
    }
    return new Response("Not found", { status: 404, headers: JSON_HEADERS });
  }
};
export {
  index_default as default
};
