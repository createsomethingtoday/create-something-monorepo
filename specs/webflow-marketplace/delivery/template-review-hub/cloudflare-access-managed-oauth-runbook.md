# Template Review Cloudflare Access Managed OAuth Runbook

**Status:** Deployment-ready candidate; not deployed

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

The Create Something Cloudflare account was read through the scoped Access API
without printing the token:

| Field | Readback |
| --- | --- |
| Account | `Create Something` (`9645bd52e640b8a4f40a3a55ff1dd75a`) |
| Access team domain | `https://createsomething.cloudflareaccess.com` (live `/cdn-cgi/access/certs` returns 200) |
| Existing applications | 2 self-hosted apps; neither targets Template Review or MCP |
| Existing MCP servers | 0 AI Controls MCP server records |
| Identity provider | Cloudflare One-time PIN only (`6e4c08b5-43be-46a7-88d8-1daa80863b60`) |
| Organization | `createsomething.cloudflareaccess.com`; configuration is writable |

The Wrangler OAuth grant cannot read Access, but Infisical provides a scoped
Access token for readback and the approved mutation. Never print it.

## Approved candidate configuration

Create one self-hosted Access application. This protects the exact direct
resource without introducing an MCP portal or touching the existing `/mcp`
connector:

| Field | Candidate value |
| --- | --- |
| Name | `Webflow Template Review MCP` |
| Type | `self_hosted` |
| Domain and public destination | `webflow-template-review-mcp.createsomething.workers.dev/access/mcp` |
| Access application session | `12h` |
| IdP | One-time PIN only |
| Policy | Allow the six reviewer sign-in emails listed below; no broad domain rule |
| Managed OAuth | enabled |
| Dynamic client registration | enabled |
| Allow localhost clients | false |
| Allow loopback clients | false |
| Allowed redirect URIs | `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback` |
| Access token lifetime | `15m` |
| Grant session duration | `336h` (14 days) |

Claude's published connector contract says remote Cowork/Desktop traffic is
brokered from Anthropic's cloud and documents those two HTTPS callback URLs.
Localhost and loopback grants are therefore unnecessary. Cloudflare recommends
a 5–15 minute access token and a 1–2 week grant for agents; the candidate uses
the least-permissive end of the token range and the longest recommended grant
to avoid daily reviewer sign-in.

Creating the application generates its immutable application ID and Audience
tag. Read both back immediately, set the exact Audience as `CF_ACCESS_AUD`, and
rerun the Worker dry run before deployment. If the Access edge does not emit
working OAuth discovery for `/access/mcp` while leaving `/mcp` unchanged,
delete the new application and stop before Worker deployment.

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

1. Retain the reviewed implementation commit SHA and green CI receipt.
2. Present the exact application settings, Worker variables, source SHA,
   current Worker version, deploy command, post-deploy checks, and rollback.
3. Require the operator to type the literal word `deploy` before either Access
   or Worker production mutation.
4. Create and read back the path-scoped Access application and policy.
5. Verify Access discovery on `/access/mcp` and unchanged Identity discovery on
   `/mcp`; stop and delete the application if path isolation fails.
6. Set the generated `CF_ACCESS_AUD`, rerun the dry run, and deploy the reviewed
   SHA.
7. Add the organization connector using the dedicated `/access/mcp` URL.
8. Sign in through native Claude Cowork, call `template_review_my_queue`, and
   query D1 to prove the same canonical reviewer account was attributed.

## Rollback

Disable or remove the path-scoped Access application, remove the organization
connector, and restore the recorded prior Worker version if origin code must be
rolled back. The existing `/mcp` Identity connector remains the immediate
service fallback throughout.
