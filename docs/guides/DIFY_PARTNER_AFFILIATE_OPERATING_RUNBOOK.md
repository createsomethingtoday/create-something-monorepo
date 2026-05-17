# Dify Partner And Affiliate Operating Runbook

> Owner: CREATE SOMETHING
> Source packet: `docs/DIFY_PARTNER_AFFILIATE_LEAD_PACKET.md`
> Tracker: Linear

## Purpose

This runbook turns the Dify partner and affiliate plan into a repeatable
operator workflow. It keeps the three lanes separate:

- `Service Partner`: paid implementation, training, governance, and possible
  enterprise resale support.
- `Marketplace Partner`: public templates, plugins, and repeatable Dify
  solutions.
- `Affiliate`: disclosed self-serve acquisition for paid Dify subscriptions.

## Operating Rules

1. Do not claim official Dify partner, certified provider, or Dify-approved
   status until Dify approves the application and authorizes the language.
2. Do not use Dify commercial brand assets in sales collateral without approval.
3. Do not put affiliate links on undeclared domains or channels.
4. Do not use affiliate links for self-purchases.
5. Do not use affiliate links on deals that are also partner, reseller, or
   co-sell transactions.
6. Do not publish raw traces, private hub details, broad connector surfaces, or
   credentials as public proof.

## Lane 1: Service Partner Application

1. Open `docs/DIFY_PARTNER_AFFILIATE_LEAD_PACKET.md`.
2. Confirm the application narrative still matches the current repo state.
3. Run the validation commands in the packet.
4. Attach or reference the public proof assets:
   - `/dify` public route.
   - `docs/PUBLIC_AGENT_MCP_TRUST_CATALOG.generated.md`.
   - `docs/DIFY_WORKSPACE_INVENTORY.generated.md`.
   - `docs/DIFY_MCP_COVERAGE.generated.md`.
5. Use `Policy OS` as the primary offer and describe it as Dify plus MCP
   governance, not generic consulting.
6. Submit as `Service Partner` first.
7. Record the submission date, submitted category, contact email, and evidence
   links in the Linear issue.

## Lane 2: Marketplace Partner Execution

Use this lane to turn delivery assets into reusable Dify distribution assets.

### App Templates

Before submitting a Dify app template:

1. Run the app once in Dify Cloud or the latest Community Edition.
2. Confirm every plugin used by the app is installed directly from Dify
   Marketplace.
3. Use an English template name.
4. Write a 2-4 sentence English overview.
5. Write 3-8 numbered setup steps, one short sentence per step.
6. Confirm there are no hardcoded credentials, private URLs, or client-private
   examples.
7. Submit through Dify Studio or Creator Center.
8. Record template title, submission date, review status, and reviewer comments
   in Linear.

### Plugins

Before submitting a Dify plugin:

1. Complete plugin development and local testing.
2. Write privacy policy details and reference them from plugin metadata.
3. Package the plugin as `.difypkg`.
4. Fork the Dify plugins repository.
5. Add the package under a CREATE SOMETHING organization folder.
6. Submit a PR using Dify's PR template.
7. Respond to review comments quickly so comments do not sit unresolved.
8. Record package name, PR URL, review status, and support contact in Linear.

## Lane 3: Affiliate Application And Funnel

Use this lane only for disclosed self-serve acquisition.

1. Submit the Dify Affiliate application after `/dify` is live.
2. Once accepted, complete the affiliate dashboard account.
3. Add payment details and required tax documentation.
4. Register the exact domains and channels where links will appear.
5. Add a link ledger to the active Linear issue or a follow-up issue.
6. Add clear affiliate disclosures wherever links appear.
7. Replace direct Dify links on approved surfaces with affiliate links only
   after acceptance.
8. Track the first 20 paid conversions as the first economics milestone.

Start from `docs/examples/dify-affiliate-link-ledger.template.csv`.

Suggested link ledger fields:

| Field              | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| Surface            | Page, newsletter, video, repo doc, or social channel. |
| URL                | Exact public URL where the link appears.              |
| Audience           | Builder, operator, agency, or client buyer.           |
| Disclosure present | Yes or no.                                            |
| Link type          | Direct, affiliate, partner referral, or marketplace.  |
| Date added         | When the link went live.                              |
| Notes              | Context, campaign, or removal requirement.            |

## Public Funnel

The public `/dify` route should stay focused on three audiences:

- Builders who need Dify plus MCP tooling.
- Operators who need policy and proof before running agents in production.
- Agencies who need reusable Dify delivery packages.

Publish or maintain these content topics:

- `Dify + MCP control plane`
- `Dify agent eval gates`
- `How to ship a Dify app with MCP tools`
- `Client-safe Dify delivery evidence`

Keep current public Dify links direct until affiliate approval exists.

## Evidence To Record In Linear

For each work session, record:

- Linear issue ID.
- Files changed.
- Commands run.
- Pass/fail status.
- Public or local page URL.
- Remaining manual submission steps.
- Any Dify review comments or follow-up commitments.

## Validation Commands

```bash
pnpm dify:inventory:check
pnpm dify:coverage:check
pnpm trust:catalog:check
pnpm --filter @create-something/agency check
```

If a generated Dify or trust artifact fails, regenerate it with the owning
script before changing application copy.
