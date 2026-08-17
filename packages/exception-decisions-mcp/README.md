# exception-decisions-mcp

The **Judgment tier** of the app-review exceptions loop as its own MCP surface: a decision-maker (partner-lead → final allow/deny) sees the pending exception queue, reads each item in both registers (technical + plain English), and records approve/deny/under-review with their identity stamped on the record.

Deliberately narrow. Everything downstream of a decision — the #app-review-exceptions transparency posts, datetime stamps, the reviewer-resume DM on approval, the **automatic feedback release to the developer on denial**, and the approval-gate enforcement — belongs to the Airtable automations this worker writes into. It cannot touch review status, review feedback, or any reviewer-side field.

- **Production**: `https://exceptions.mcp.createsomething.agency`
- **Worker**: `exception-decisions-mcp` (CREATE SOMETHING account)
- **Source of truth**: `🖌️Asset Versions` + `⚖️Exceptions` in `appMoIgXMTTTNIc3p`
- **Runbook**: `packages/webflow-app-review-mcp/docs/exception-transparency-loop.md`

## Tools

| Tool | What it does |
|---|---|
| `list_pending_exceptions` | The decision queue: versions awaiting a decision + their per-item rows, with undecided/denied counts and record links |
| `get_exception_item` | One item's full dual-register rationale, status, and decision notes |
| `decide_exception_item` | Approve / deny / mark-under-review one item, with notes. Refuses to overwrite an existing decision |
| `decide_version_exception` | The aggregate decision. Approving requires all items decided; **denying requires `confirm_release: true`** because it emails the review feedback to the developer automatically |
| `recommend_exception_item` | **Partner-lead stage**: record an approve/deny recommendation on one item without deciding it — sets 👀Under Review and appends "Partner-lead recommendation: …" for the final decision-maker |
| `draft_developer_update` | **Partner-lead comms**: compose a developer-facing status update from the records (exempted / requires-fixes / pending, plain English first, developer skills toolkit included). Returns a DRAFT — the partner-lead reviews and sends through their own channel; the tool never contacts the developer |
| `whoami` | The identity this key decides as |

The two-stage flow maps onto the tools: the partner-lead works with `recommend_exception_item` + `draft_developer_update`; the final decision-maker records `decide_exception_item` / `decide_version_exception`. Roles are advisory (attribution is what's enforced) — the identity stamp and the channel posts keep everyone honest.

Developer-facing drafts always close with the **developer skills toolkit** pointer (`webflow-app-preflight`, `webflow-app-review-remediation`, and the App Review Preflight `wfpre_` receipt requirement) so partners can work through findings with the same tooling the review runs.

## Identity & auth

Per-person keys in the `DECIDERS_JSON` secret map a key → `{email, name, role}`. Two accepted forms:

- `Authorization: Bearer <key>` against `/mcp` (Claude Code, header-capable clients)
- `/mcp/<key>` path form (claude.ai custom connectors and other clients that cannot set headers)

Every decision stamps the `⚖️Decision By` collaborator field (best effort — falls back gracefully when the email is not resolvable in the Airtable workspace) **and** appends a signed attribution line to the decision notes, so authorship survives regardless.

### Connecting

Claude Code:

```bash
claude mcp add --transport http exception-decisions \
  https://exceptions.mcp.createsomething.agency/mcp \
  --header "Authorization: Bearer <your-key>"
```

claude.ai: add a custom connector with URL `https://exceptions.mcp.createsomething.agency/mcp/<your-key>` (no additional auth).

### Keys

Generated locally into `.deciders.local.json` (gitignored, chmod 600) and uploaded as the `DECIDERS_JSON` secret. Distribute each person's key via 1Password, never chat. To rotate or add a decider: edit the JSON, re-upload the secret:

```bash
cat .deciders.local.json | wrangler secret put DECIDERS_JSON
```

A leaked key's blast radius is bounded and loud: it can only record exception decisions, every decision posts to #app-review-exceptions within seconds, and decisions are correctable in Airtable.

## Guardrails encoded in the tools

1. **Dual sign-off shape** — item decisions are individual; the version-level approval is refused while any item is undecided (mirrors the Airtable approval gate).
2. **Denial = release** — a version-level denial triggers the denial follow-through (❌Rejected + partner email); the tool requires explicit `confirm_release: true` and says so before writing.
3. **No overwrites** — a decided item is never re-decided through this surface; corrections happen in Airtable where the automations can see the change history.
4. **Atomic writes** — notes + collaborator + status land in one PATCH, satisfying the loop's "text fields first, flip second" sequencing (the automations read record state at trigger time).

## Deploy

```bash
wrangler deploy            # from this directory
wrangler secret put AIRTABLE_API_KEY   # PAT: data.records:read+write on appMoIgXMTTTNIc3p
wrangler secret put DECIDERS_JSON < .deciders.local.json
```

## Why not the existing webflow-app-review-mcp?

That worker is the reviewer surface: broad Airtable writes behind a shared key plus a Cloudflare Access app on Webflow's account. Giving a decision-maker that connector grants the whole reviewer toolset; provisioning a new CF Access identity app requires Webflow CF dashboard access. This worker is the trust boundary drawn where the process draws it: Judgment gets its own, smaller door.
