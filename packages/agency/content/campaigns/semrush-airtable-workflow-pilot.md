# Airtable workflow consulting search experiment

Owner: Micah Johnson. Canonical launch and evidence: [CRE-2190](https://linear.app/createsomething/issue/CRE-2190/launch-airtable-workflow-consulting-search-experiment). Research: CRE-2189. Launch date remains unset until production intake and Semrush readback pass.

## Hypothesis and boundary

Airtable consulting searches can produce qualified conversations about operational workflow implementations. One page, `/airtable-workflow-consulting`, links to scoped Build intake. Notion is an optional connected tool; MCP supports the implementation. No ads, purchases, outreach or scheduled automation are included.

Proposed evaluation: 90 days from verified launch. Two qualified conversations and one scoped proposal are a continuation signal, not a forecast or revenue claim. A qualified conversation has an active business workflow, named owner, concrete failure or requirement, and willingness to discuss separately scoped implementation. Exclude employees, launch self-tests, jobs, generic connector installation and duplicate inquiries.

## Baseline and tracking

September 30, 2026 US Google English desktop research found Airtable consultant volume 720 / KD22, Notion consultant 260 / KD26, Airtable Notion integration 210 / KD23, Airtable MCP 590 / KD21. These are Semrush estimates, not observed business results. Existing campaign 24333231_2921894 tracked ten broad terms with zero visibility/top100; it contained no Airtable or Notion terms. Retain the original term/history evidence in CRE-2189 before configuring tracking.

Suggested bounded term set: airtable consultant, airtable consulting, airtable consulting services, airtable automation consultant, airtable notion integration, notion consultant, notion consulting, airtable mcp, airtable mcp server, workflow automation agency. Retain original tracking if replacing it would permanently delete history; obtain the required action-time confirmation for irreversible UI deletion. Add competitors ScottWorld, ProsperSpark and Flow Digital only within existing entitlement. No upgrade or trial.

The CTA carries `source=airtable-workflow`, `campaign=semrush-workflow-pilot`, `intent=workflow-mapping`, `lane=enterprise_extension`. Attribution is atomically persisted with a stable inquiry receipt. It identifies this intake path; it does not prove organic search origin or Semrush causality.

## Manual weekly review

Spend approximately 20 minutes reviewing tracked ranks and landing-page visibility, first-party attributed inquiries, and qualified conversations/proposals in Linear. Record dated observations and disposition in CRE-2190. Use Search Console impressions/clicks and analytics visits if access is verified; absent access is unavailable data, not zero. Do not create another task tracker or automate this routine without authorization.

At days 30 and 60, inspect indexing, query fit and inquiry quality before changing the page. At day 90, continue, revise or stop based on qualified pipeline and implementation fit. Traffic/rank changes alone do not establish business benefit.

Read-only attribution query, executed from `packages/agency`:

```sh
node ../../scripts/run-wrangler.mjs d1 execute create-something-db --remote --config wrangler.jsonc --command "SELECT a.request_id,a.created_at,a.source,a.campaign,a.intent,a.lane,s.status FROM contact_request_attribution a JOIN contact_request_receipts r ON r.request_id=a.request_id JOIN contact_submissions s ON s.id=r.submission_id WHERE a.campaign='semrush-workflow-pilot' ORDER BY a.created_at;" --json
```

Classify the launch self-test separately by its recorded request ID; never count it as a lead. Do not export names, emails or private inquiry bodies into public evidence. An accepted email receipt means provider acceptance; delivery requires provider or mailbox readback.

## Promotion and rollback

Apply only migration 0059 after inspecting the deployed 0058 receipt schema; do not run the entire outstanding migration queue. Record the pre-change D1 recovery bookmark and previous-good Pages deployment in CRE-2190. Migration adds a table and index without changing existing inquiry columns. Roll back the application to the recorded previous-good Pages deployment; preserve the additive table and receipts. Never delete inquiry history as rollback.

Launch proof requires reviewed source, relevant tests/build, desktop/mobile rendered CTA, production canonical/indexability/sitemap checks, one clearly labeled stable-ID self-test, inquiry/attribution readback, email and downstream lead evidence, and Semrush settings readback. Record exact deployment SHA, limitations, start date and worktree disposition in Linear. Search indexing and customer outcomes remain future observations.
