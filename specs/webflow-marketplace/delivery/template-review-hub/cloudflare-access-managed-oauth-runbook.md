# Template Review Cloudflare Access Managed OAuth Runbook

**Status:** Access application created; Worker deployment pending

**Date:** 2026-07-15

**Tracking:** CRE-1269

**Rollback:** Existing CREATE SOMETHING Identity connector at `/mcp`

## Boundary

Protect only this dedicated connector hostname:

`https://webflow-template-review-mcp-access.createsomething.workers.dev/mcp`

The hostname belongs to a fail-closed proxy Worker that forwards only `/mcp`
to the existing Worker's `/access/mcp` signed-assertion route. Do not place
Cloudflare Access or a custom domain on the existing Worker. Its
`webflow-template-review-mcp.createsomething.workers.dev/mcp` path continues to
serve the CREATE SOMETHING Identity connector and trusted hub bridge.

The first approved API create attempt targeted the existing hostname plus
`/access/mcp`. Cloudflare rejected it before creating an application with code
`12130`: Managed OAuth applications cannot have a path in `domain`. The
dedicated hostname is the fail-closed correction; no production object was
created by the rejected attempt.

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

## Created application readback

The corrected application was created after the fresh literal `deploy`
approval and read back through the scoped API:

| Field | Production readback |
| --- | --- |
| Application ID | `f18711d2-5673-4aa9-b04c-7227301e1064` |
| Audience | `9e652f0b7b017646202668709415884dfb620217d3ded9a71585ce9d8d740a5d` |
| Policy ID | `ea41ab8a-9e29-43c9-9bd4-c0b1527809f2` |
| Domain | `webflow-template-review-mcp-access.createsomething.workers.dev` |
| Session / grant / token | `12h` / `336h` / `15m` |
| Identity provider | One-time PIN (`6e4c08b5-43be-46a7-88d8-1daa80863b60`) |

The six-email policy, DCR callbacks, localhost/loopback denials, and Managed
OAuth settings match the candidate table below. Before the proxy Worker exists,
the dedicated hostname returns Cloudflare `1042`; the existing Worker's `/mcp`
protected-resource metadata remains unchanged and still names CREATE SOMETHING
Identity. Recheck OAuth discovery immediately after proxy deployment.

## Approved candidate configuration

Create one self-hosted Access application for the dedicated proxy Worker. This
protects the whole connector hostname without introducing an MCP portal or
touching the existing Worker hostname:

| Field | Candidate value |
| --- | --- |
| Name | `Webflow Template Review MCP` |
| Type | `self_hosted` |
| Domain | `webflow-template-review-mcp-access.createsomething.workers.dev` |
| Public connector URL | `https://webflow-template-review-mcp-access.createsomething.workers.dev/mcp` |
| Protected Worker | `webflow-template-review-mcp-access` (`workers.dev`; preview URLs disabled) |
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

The application generated its immutable application ID and Audience tag shown
above. The exact Audience is committed as `CF_ACCESS_AUD`; rerun both Worker
dry runs before deployment. If the Access edge does not emit
working OAuth discovery for the dedicated hostname while the existing
Worker's `/mcp` discovery remains unchanged, delete the new application and
stop before either Worker deployment.

The proxy accepts only `/mcp`, requires `Cf-Access-Jwt-Assertion`, forwards
only MCP transport headers plus that assertion, strips the opaque OAuth bearer
and unsigned forwarded-email header, and targets the existing Worker's
`/access/mcp`. The existing Worker remains the sole JWT verifier and reviewer
identity authority.

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
4. Create and read back the dedicated-hostname Access application and policy.
5. Verify Access discovery on the dedicated hostname and unchanged Identity
   discovery on the existing Worker; stop and delete the application if
   hostname isolation fails.
6. Set the generated `CF_ACCESS_AUD`, rerun both dry runs, and deploy the
   reviewed SHA to the existing Worker and dedicated proxy Worker.
7. Add the organization connector using the dedicated proxy `/mcp` URL.
8. Sign in through native Claude Cowork, call `template_review_my_queue`, and
   query D1 to prove the same canonical reviewer account was attributed.

## Rollback

Disable or remove the dedicated-hostname Access application, remove the
organization connector, delete or roll back the proxy Worker, and restore the
recorded prior Template Review Worker version if origin code must be rolled
back. The existing Worker hostname and `/mcp` Identity connector remain the
immediate service fallback throughout.
