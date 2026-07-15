# Template Review Cloudflare Access Managed OAuth Runbook

**Status:** Production candidate; not deployed

**Date:** 2026-07-15

**Tracking:** CRE-1269

**Rollback:** Existing CREATE SOMETHING Identity connector at `/mcp`

## Boundary

Protect only this dedicated resource:

`https://webflow-template-review-mcp.createsomething.workers.dev/access/mcp`

Do not place Cloudflare Access in front of the existing `/mcp` path. That path
continues to serve the CREATE SOMETHING Identity connector and trusted hub
bridge.

## Observed compatibility evidence

WROP's 2026-07-15 rollout established that Cloudflare Access Managed OAuth can
use Webflow Okta SSO and requires no client ID or secret in Claude
([configuration thread](https://webflow.enterprise.slack.com/archives/C08KYC4GC4R/p1784143295804299?thread_ts=1784141942.008439&cid=C08KYC4GC4R)).
The connector was then added to Claude
([receipt](https://webflow.enterprise.slack.com/archives/C08KYC4GC4R/p1784143616627369?thread_ts=1784141942.008439&cid=C08KYC4GC4R)),
and Claude Desktop plus Routines support was announced
([announcement](https://webflow.enterprise.slack.com/archives/C071KMZPPQQ/p1784144737704479?thread_ts=1784144737.704479&cid=C071KMZPPQQ)).
Slack did not expose WROP's exact token lifetimes, localhost toggles, redirect
URIs, Access application type, or origin assertion handling in readable message
text. The relevant screenshots (`F0BHQBR2EF6`, `F0BHHJFG3AR`, and
`F0BHM0Q0L58`) were not readable through the available Slack MCP. Do not infer
Template Review production values from those unknowns.

## Required pre-deploy readback

Record these exact values from the Create Something Cloudflare account before
deployment:

| Field | Required value |
| --- | --- |
| Account | `Create Something` (`9645bd52e640b8a4f40a3a55ff1dd75a`) |
| Access team domain | `https://createsomething.cloudflareaccess.com` (live `/cdn-cgi/access/certs` returns 200) |
| Application domain/path | Exact Worker hostname plus `/access/mcp` |
| Application Audience tag | Exact stable AUD from the created application |
| Identity provider | Explicit approved provider; verify sign-in returns reviewer email |
| Access policy | Include only the approved Template Review teammate cohort |
| Managed OAuth settings | Read back application type, redirect policy, token lifetime, and grant/session lifetime |

The current Wrangler login can deploy Workers but cannot read Access
applications or organizations. The public JWKS endpoint established the team
domain, but the remaining application values still require an authenticated
Zero Trust dashboard session or a narrowly scoped Access read/write API token;
never print the token.

## Origin verification contract

The Worker accepts the Access route only when all of the following hold:

1. `CF_ACCESS_TEAM_DOMAIN` is an exact HTTPS `*.cloudflareaccess.com` origin.
2. `CF_ACCESS_AUD` is non-empty and exactly matches the Access application.
3. `Cf-Access-Jwt-Assertion` verifies with the team-domain rotating JWKS.
4. The JWT uses RS256 and satisfies exact issuer, audience, time, subject,
   signed email, and `type: app` checks.
5. The email passes the existing Template Review allowlist.
6. Only a reviewer-directory match receives write scope; an explicitly
   allowlisted but unmapped identity remains read-only.

The opaque Managed OAuth bearer and unsigned forwarded-email headers never
become reviewer identity.

## Reviewer cohort

- `natalia.ledford@webflow.com` -> `acct_wf_natalia`
- `eric.unger@webflow.com` -> `acct_wf_eric`
- `vicki.chen@webflow.com` -> `acct_wf_vicki`
- `mariana.segura@webflow.com` -> `acct_wf_mariana`
- `micah@webflow.com` -> `acct_wf_micah`
- `micah@createsomething.io` -> auth alias for `acct_wf_micah`

Before promotion, verify the deployed `REVIEWER_DIRECTORY_JSON` resolves every
canonical account. Do not expose its secret value in logs.

## Promotion gate

1. Merge the reviewed implementation and retain its commit SHA.
2. Create and read back the path-scoped Access application and policy.
3. Present the exact application settings, Worker variables, source SHA,
   current Worker version, deploy command, post-deploy checks, and rollback.
4. Require the operator to type the literal word `deploy` before either Access
   or Worker production mutation.
5. Set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`, then deploy the reviewed SHA.
6. Add the organization connector using the dedicated `/access/mcp` URL.
7. Sign in through native Claude Cowork, call `template_review_my_queue`, and
   query D1 to prove the same canonical reviewer account was attributed.

## Rollback

Disable or remove the path-scoped Access application, remove the organization
connector, and restore the recorded prior Worker version if origin code must be
rolled back. The existing `/mcp` Identity connector remains the immediate
service fallback throughout.
