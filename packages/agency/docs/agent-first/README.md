# OpenAI-first support brief: local review candidate

Status: local implementation, not deployed or certified. Source baseline: 6ef4285ad. This is a Database context contract with browser Automation for preparation; human Judgment owns diagnosis, access and execution. No Canon-wide primitive is promoted yet.

## Review units

1. Draw discovery accuracy: remove drifting tool count, correct publishing/relay data boundary, replace personal installation path with explicit operator-supplied path. Runtime transport and permissions unchanged.
2. Support brief v1: bounded schema, strict import, local review and JSON/Markdown export; read-only discovery at `/api/support-brief`, no submission/auth/persistence backend. `/support-brief` is noindex. Instruction-only skill lives in `agent-skills/prepare-support-brief` for review, not installed globally or claimed discoverable in production.
3. Follow-up: PCN gated offer copy and deployment flags need owner reconciliation; content MCP health counts need registry-derived metadata. These remain findings, not silently changed commercial behavior.

## Host evidence and acceptance

| Pathway | Evidence | Current qualification | Required acceptance |
|---|---|---|---|
| Codex with local skill | Standard SKILL.md; repo contract and tests | Instruction package authored; host installation not tested | Install in a supported local skill location; generate brief from real authorized context, import, review, export |
| ChatGPT Work plugin | Official MCP documentation distinguishes hosted remote tools from local config | No hosted plugin created | Choose connected remote read-only integration and actual distribution surface; permission and schema tests |
| OpenAI computer use | Documented browser/desktop control with supplied environment | Local Chrome UI verification attempted, paused on user activity | Labeled fields, import errors, prepare, edit invalidation, export, reload clearing with actual available tool |
| @browser / in-app browser | Session-specific tool capability, not a site protocol | No portable mention or extension assumed | Inspect enabled tab tools in each host and run same flow; unsupported fallback is JSON artifact |
| Ego | Local app inventory only | Not qualified for this feature | Open preview through actual supported UI; verify semantics and local export. No injected WebMCP shim |
| Scopefield | Separate beta source/release evidence; not monorepo production route | Native acceptance incomplete; no support-brief qualification | Ordinary browser acceptance first; preserve stopped native WebMCP boundary; no dependency for launch |
| Draw | Existing WebMCP and paired Python stdio adapter | Source-backed transport; new pairing not exercised | Explicit pairing, project isolation, edits/receipt/revert, revoke, uncertain-result recovery |

OpenAI documentation checked 2026-10-16:
- [Build skills](https://learn.chatgpt.com/docs/build-skills): folder-based instructions; invocation differs by host.
- [MCP in Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli): local stdio/HTTP configuration does not establish hosted web availability.
- [Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use): the application supplies the browser/desktop environment and executes actions.
- [Design tools](https://developers.openai.com/plugins/plan/tools): bounded contracts and read/write separation; server authorization remains authoritative.

## Boundaries and recovery

The form holds values in Svelte page memory; no localStorage, fetch, ticket creation or payment operation is implemented. JSON import is bounded to 40,000 UTF-16 code units. Schema fields use Unicode character limits; browser maxlength is more conservative for surrogate pairs. Invalid imports leave current fields intact. Editing invalidates the prepared view; export revalidates. JSON remains the canonical artifact; Markdown quotes untrusted values as literal indented blocks. Reload/clear loses unsaved work; export explicitly creates a local file.

The existing site shell can send ordinary page analytics. The brief subtree uses the existing `data-analytics-ignore` boundary, respected by Canon interaction and selection-copy collectors. No brief payload is added to analytics. This is source verification, not a network-capture certification. Agent hosts have their own data policies. Do not claim all activity is offline.

No support receipt is fabricated. A future submission integration must name its owner, authenticate the recipient, enforce tenant/scope server-side, define idempotency and consent, return a durable receipt, handle uncertain outcomes and expose human recovery. Reuse CREATE SOMETHING Identity; do not add a provider. Gate deployment until those duties are explicitly scoped.

## Staged backlog

| Priority | Work | Dependency / effort | Acceptance |
|---|---|---|---|
| P0 | Review Draw truth correction | Existing source, S | Public discovery matches publish/relay behavior; release verification after approval |
| P0 | Reconcile PCN offer and runtime gates | Commercial owner, S–M | Copy follows actual approved availability; no flag toggles without acceptance |
| P1 | Accept support-brief local slice | This candidate, S | Clean typecheck/unit tests plus browser cases in table |
| P1 | Qualify one OpenAI host | User-selected installed host, M | Real skill invocation → schema → review/export; no invented tool availability |
| P1 | Add actual handoff backend | Named owner/destination, Identity/permissions, M–L | Explicit submission; tenant isolation, dedupe, receipt, retry and human recovery tests |
| P2 | Promote repeated UI to Canon candidate | Second real product consumer, M | Shared state semantics, accessibility, provenance and content rules; backend authority stays property-owned |

S: 1–3 days. M: 4–8 days. L: 2–4 weeks. Bands include acceptance, not provider procurement.

Do not build a universal chatbot, protocol badges, broad provider adapters, automatic remediation, new identity system, support marketplace or Scopefield requirement for this slice. Nikema and Huzaifa remain potential contributors, not committed owners.

## Release hold

Do not push this `codex/**` branch: `.github/workflows/agency-pages-deploy.yml` listens to those pushes and can deploy a public preview. Local patches and PR prose are prepared instead. No merge or deployment is authorized. The fictional handoff removal is a separate pending change; its files are untouched here. Linear coordination is unavailable in this session because LINEAR_API_KEY is absent; no new credential was requested.

## Validation record

- Worktree bootstrap completed with pinned Node 22.21.1 / pnpm 9.15.0; unrelated optional install-script and unbuilt package-bin warnings were reported.
- Ten support-brief contract/transition tests pass. Local discovery GET and server-rendered page pass via localhost.
- Agency Svelte diagnostics pass with zero errors and zero warnings after the reducer and export corrections.
- Skill validator passes using PyYAML 6.0.3 from PyPI in /tmp/cs-skill-validation, an isolated temporary virtual environment. No global Python package or repository dependency changed. Bundled schema parity is also tested.
- Chrome interaction verification paused after the computer-use tool reported user activity. No host is marked end-to-end qualified.
