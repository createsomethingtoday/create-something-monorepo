# Cloudflare Bot Access Hardening

This guide owns the Phase 1 no-charge bot hardening path for CREATE SOMETHING
public properties and adjacent MCP surfaces.

Use it when Cloudflare traffic shows crawler, scanner, or agent volume and the
operator needs to decide whether to allow, block, charge, or monitor that
traffic. The default Phase 1 posture is conservative:

- block obvious abuse only after a dry-run review
- keep search discovery available
- keep internal and client MCP automation out of content-monetization rules
- prepare monetization candidates without enabling payment gates

Tracked work: `CRE-946`.

## Current Evidence

Read-only Cloudflare GraphQL and dashboard review on 2026-07-01 showed:

| Zone                     | Window | Requests | Visits | Verified bots | Verified AI |
| ------------------------ | ------ | -------: | -----: | ------------: | ----------: |
| `createsomething.agency` | ~24h   |  191,834 |    760 |          0.4% |        0.1% |
| `createsomething.io`     | ~24h   |    8,211 |    581 |          7.2% |        3.2% |
| `createsomething.ltd`    | ~24h   |    3,239 |    258 |         16.8% |        2.9% |
| `createsomething.space`  | ~24h   |    3,394 |    144 |          6.2% |        1.2% |

The `.agency` volume is mostly automation rather than public content crawling.
Top hosts were reviewer and client MCP subdomains such as
`wf-template-review-vicki.mcp.createsomething.agency`,
`wf-template-review-eric.mcp.createsomething.agency`, and
`wf-template-review-micah.mcp.createsomething.agency`. Top user agents included
`node`, `curl`, no user agent, `claude-code`, and `python-httpx`.

The public content zones show a smaller but real verified AI slice. They also
show generic scanner probes such as `.env`, `.git`, `wp-*`, random `.php`, and
WordPress plugin/theme paths. Treat those scanner probes as abuse, not as
monetizable agent demand.

## Tier Mapping

- Database: Cloudflare analytics, AI Crawl Control tables, WAF events, and this
  guide are the evidence and policy artifacts.
- Automation: WAF custom rules, AI Crawl Control actions, and future
  Monetization Gateway or Pay Per Crawl rules are the execution paths.
- Judgment: Operators decide which crawler classes create value, which scanner
  traffic is abuse, and which premium resources may require payment.

## Phase 1 Scope

Phase 1 may:

- document traffic evidence by zone
- add WAF candidate expressions in disabled, preview, log, or review-only form
- block or challenge obvious scanner paths after explicit approval
- keep `*.mcp.createsomething.agency` and `*.mcp.createsomething.ltd`
  outside broad public-content rules
- keep AI crawler charging as a future approval-gated path

Phase 1 must not:

- enable blanket AI crawler blocking
- enable blanket HTTP `402 Payment Required` on public pages
- charge internal MCP, client MCP, reviewer MCP, or operator automation traffic
- mutate Cloudflare paid-plan settings without an approval note and rollback
  path

## Dry-Run WAF Candidates

Start with Cloudflare dashboard preview or Security Events review. If the plan
supports a log-only action, use log-only first. Otherwise keep the rule disabled
until the expression has been reviewed against sampled events.

Public content host candidate:

```text
(
  http.host in {
    "createsomething.agency"
    "www.createsomething.agency"
    "createsomething.io"
    "www.createsomething.io"
    "createsomething.ltd"
    "www.createsomething.ltd"
    "createsomething.space"
    "www.createsomething.space"
    "learn.createsomething.space"
    "templates.createsomething.space"
  }
  and (
    http.request.uri.path contains "/.env"
    or http.request.uri.path contains "/.git"
    or starts_with(http.request.uri.path, "/wp-")
    or http.request.uri.path contains "/wp-content/"
    or http.request.uri.path contains "/wp-includes/"
    or http.request.uri.path contains "/xmlrpc.php"
    or http.request.uri.path contains "/cgi-bin/"
    or ends_with(http.request.uri.path, ".php")
  )
)
```

Recommended first action: managed challenge or block only after the dry-run
sample confirms no legitimate paths match. Static SvelteKit/Cloudflare
properties should not serve PHP, WordPress admin, Git, or environment files.

MCP host candidate:

```text
(
  http.host contains ".mcp.createsomething."
  and (
    http.request.uri.path contains "/.env"
    or http.request.uri.path contains "/.git"
    or starts_with(http.request.uri.path, "/wp-")
    or http.request.uri.path contains "/wp-content/"
    or ends_with(http.request.uri.path, ".php")
  )
)
```

Recommended first action: log or managed challenge, not block. MCP hosts are
machine-facing by design, so validate against real client and reviewer traffic
before enforcement.

## AI Crawler Policy

Default by class:

| Class               | Default                               | Rationale                                               |
| ------------------- | ------------------------------------- | ------------------------------------------------------- |
| Search crawler      | Allow                                 | Keeps discovery and referrals intact.                   |
| SEO crawler         | Allow or monitor                      | Useful for auditing, but watch volume.                  |
| AI assistant/search | Allow while measuring                 | Can generate citations and operator value.              |
| AI training crawler | Monitor, then charge or block         | Training value is monetizable; no blanket allow needed. |
| Unknown scanner     | Challenge or block                    | No content value; usually probes for vulnerable stacks. |
| Internal/client MCP | Allow under existing auth/rate policy | It is product traffic, not content crawling.            |

Cloudflare AI Crawl Control currently shows the properties set to allow AI
training crawlers. Do not change that setting globally until the crawler table
has been reviewed by crawler/operator and the intended action is recorded in
Linear.

## Monetization Path

Cloudflare's Monetization Gateway announcement describes charging for pages,
datasets, APIs, and MCP tools through `402 Payment Required` and x402. Treat
that as an approval-gated future path until account availability and settlement
operations are confirmed.

Good first monetization candidates:

- premium MCP tool calls
- structured datasets
- policy packs and governed templates
- agent-readable delivery manifests
- high-value canonical research artifacts

Poor first monetization candidates:

- homepages and navigation routes
- login, identity, or OAuth metadata routes
- public search landing pages
- internal reviewer/client MCP traffic
- scanner probes

## Verification

Before enforcement:

```bash
pnpm linear:get -- --issue CRE-946
```

Then collect or attach:

- Cloudflare dashboard screenshot or GraphQL export for the target window
- candidate expression
- sampled matching events
- proposed action
- rollback note

After enforcement, verify:

- public pages still return expected `2xx` or redirect behavior
- known MCP health or `/mcp` checks still work
- Cloudflare Security Events show scanner matches under the intended rule
- traffic over the next 24 hours has fewer scanner requests without new false
  positives

Record evidence in Linear:

```bash
pnpm linear:comment -- --issue CRE-946 --body "Cloudflare bot hardening evidence: ..."
```

## Production Deployment

Use the repository workflow when local Wrangler OAuth cannot access WAF
Rulesets:

```bash
gh workflow run cloudflare-bot-access-hardening.yml \
  --repo createsomethingtoday/create-something-monorepo \
  -f mode=plan \
  -f zone=all

gh workflow run cloudflare-bot-access-hardening.yml \
  --repo createsomethingtoday/create-something-monorepo \
  -f mode=apply \
  -f zone=all
```

The workflow runs `scripts/cloudflare-bot-access-hardening.mjs` with either
`CLOUDFLARE_WAF_API_TOKEN` or `CLOUDFLARE_API_TOKEN` from GitHub Secrets. The
script is idempotent: it creates the `http_request_firewall_custom` entry-point
ruleset if missing, adds the `CRE-946 Phase 1 block scanner probes on non-MCP
hosts` rule if missing, and updates that rule if the expression changes.
