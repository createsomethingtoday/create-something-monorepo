# Disposable cloud acceptance — CRE-2431

Parent/release operator executes cloud mutations after independent source review.
Implementation agents must not deploy this lab or production. Never reuse a
production owner, grant, client, inbox or database. This harness creates its own
synthetic `lab-*` subject/client/family and `example.invalid` email internally.
Credentials remain private in the running Worker; the runner receives only
scenario names and outcomes. No email, A2A message, Slack or callback is sent.

The same deployed Worker hosts the actual Identity token/userinfo handlers and
A2A application modules, using two fresh D1 databases. Build-time adaptation
changes only Identity's fixed A2A resource to the dedicated lab `/mcp`, and A2A's
issuer/network transport to a request-local in-process Identity adapter. The
production modules remain unchanged on disk. This is server/client recovery
acceptance against deployed Cloudflare storage/runtime, not an end-to-end
ChatGPT OAuth installation or cross-service networking test. The lab tests the
existing encrypted cookie refresh protocol; it never modifies an existing owner.
Fault hooks are exclusively in this directory and its generated bundle, which
neither production Wrangler config imports. All network from the lab A2A adapter
is restricted to local Identity token/userinfo handlers. No outgoing delivery
binding is available. The lab only registers and reads an empty synthetic inbox.

## Prepare and inspect

Run from the registered repository checkout, using its pinned tooling. Fresh
names below are for one run; choose another suffix and new databases for reruns.
Do not copy production config or secrets. Review the printed UUIDs and compare
against production-before evidence before passing them to preparation.

```sh
w() { bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/a2a "$@"; }
w d1 create cs-a2a-lab-cre2431-identity --update-config false
w d1 create cs-a2a-lab-cre2431-inbox --update-config false
# Substitute account, workers.dev subdomain and the TWO NEW UUIDs:
bash scripts/ona-bootstrap-local.sh node packages/a2a/acceptance/prepare.mjs ACCOUNT_ID WORKERS_SUBDOMAIN NEW_IDENTITY_DB_UUID NEW_INBOX_DB_UUID cre2431
# Use the exact lab URL printed by prepare (not a production URL):
A2A_LAB_URL=https://cs-a2a-lab-cre2431.WORKERS_SUBDOMAIN.workers.dev bash scripts/ona-bootstrap-local.sh node packages/a2a/acceptance/build.mjs
w deploy --config acceptance/wrangler.lab.json --no-bundle --dry-run --outdir /tmp/cre2431-lab-dry-run
```

Preparation rejects known production DB UUIDs and identical bindings. Runtime
also refuses nonempty user/inbox databases, non-lab environment/resource names,
wrong origins, missing keys and unsupported routes. These are defense in depth;
the operator must verify newly created UUIDs rather than rely on name prefixes.
The isolated configs, bundles, credentials and local state are ignored by Git.
`dist/secrets.json` is created mode 0600 with exclusive creation and never printed.
Do not paste it into chat, logs or a command line. Build metadata is sanitized.

Migrate only the new bindings, deploy the separate service, then upload its lab
key from the private file. Before the key exists the deployed service denies all
requests. No production config, routes, domains, resources or secrets are used.

```sh
w d1 migrations apply IDENTITY_DB --config acceptance/wrangler.lab.json --remote
w d1 migrations apply INBOX_DB --config acceptance/wrangler.lab.json --remote
w deploy --config acceptance/wrangler.lab.json --no-bundle
w secret bulk acceptance/dist/secrets.json --config acceptance/wrangler.lab.json
bash scripts/ona-bootstrap-local.sh node packages/a2a/acceptance/run.mjs
```

Expected HTTP 200, all thirteen named checks, `hostFaultHandling: unproven`:
simultaneous refresh, lost response, persistence failure recovery, successive
rotation, temporary provider failure, cookie-session response-loss recovery,
cookie-origin protection, authenticated status, synthetic inbox read receipt,
cookie persistence failure recovery, revoked grant denial, cookie terminal
denial, and durable renewal audit. Temporary provider failure is an injected
503 at the adapter boundary, not a real provider outage. Persistence failure is
injected before the Identity D1 batch and after refresh before the cookie save;
response loss is injected after Identity commits. Revocation targets the current
synthetic successor's family only. Scenario failures yield sanitized HTTP 500;
record the passed prefix and failure label, repair source, then use fresh DBs.
The runner sends once and never retries an uncertain run. A second run against
seeded databases is intentionally refused.

Use a Workers paid account for the 30-second CPU budget and subrequest budget.
Resources: one separate workers.dev Worker, two D1 databases, one private lab
secret, one synthetic identity/client/family/inbox, several rotated successors
and bounded audit rows. No Queue, Durable Object, container, R2, email provider,
custom domain, subscription or installed App. Expect hundreds of small SQL calls
and minimal storage; actual billing uses the account's Workers/D1 plan and
metered usage. Capture deployment/version IDs and sanitized runner JSON in the
release report. Do not call local success cloud proof.

## Local runtime qualification

```sh
A2A_LAB_URL=https://cs-a2a-lab-cre2431.example.workers.dev bash scripts/ona-bootstrap-local.sh node packages/a2a/acceptance/build.mjs
bash scripts/ona-bootstrap-local.sh node packages/a2a/acceptance/local.mjs
```

This runs the compiled lab in actual local workerd with two ephemeral D1 stores.
Its output explicitly says `runtime: local_workerd`; it is not deployed evidence.
The local adapter supports the repo-pinned Miniflare 5 compatibility converter.

## Cleanup and rollback

Record lab UUIDs and deployment receipt before deleting anything. Remove only
the exact service/databases created above, using this disposable config:

```sh
w delete --config acceptance/wrangler.lab.json
w d1 delete cs-a2a-lab-cre2431-identity --config acceptance/wrangler.lab.json
w d1 delete cs-a2a-lab-cre2431-inbox --config acceptance/wrangler.lab.json
```

Verify the lab service and both UUIDs are absent. Delete the local ignored lab
credentials/config/bundle/state once sanitized evidence is retained. Cleanup is
also rollback: production never depends on this lab. A failed test must never
trigger real owner revocation, forced expiry, re-consent or private App changes.

## Production promotion (parent-owned)

1. Review exact commit and all local results; run independent final acceptance.
2. Apply Identity migration 0020 remotely using the **production Identity** config
   before deploying its userinfo/audit code. Capture current version for rollback.
3. Deploy Identity, then A2A with the reviewed commit as BUILD_REVISION. Use normal
   PR/review gates. No installed plugin/App release is part of these commands.
4. Verify anonymous diagnostics has no principal/audit, authenticated HTTP/MCP
   status and receipts have the reviewed revisions, scopes remain unchanged,
   and existing owner data/grants remain intact. Observe a natural renewal for
   new committed audit evidence; do not revoke/expire a real owner to test it.
5. Roll back Worker versions to captured pre-release IDs if needed. Leave the
   additive audit table in place; do not delete production audit/grant data.

Example commands from the repo root (parent fills reviewed SHA and receipts):

```sh
bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/identity-worker d1 migrations apply identity-db --remote
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/identity-worker deploy
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/a2a build
bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/a2a deploy --var BUILD_REVISION:REVIEWED_SHA
# Rollback, only if needed, with the captured respective version IDs:
bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/a2a rollback PREVIOUS_A2A_VERSION
bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/identity-worker rollback PREVIOUS_IDENTITY_VERSION
```

CRE-2428 remaining limit: undocumented real ChatGPT host fault handling, prompt
versus scheduler-triggered renewal, and exact installed binding require separate
actual-host observation. A disposable Cloudflare pass does not prove those facts.
Keep `unknown`/`unproven` labels and existing working consent unchanged.

Command/config references checked against pinned Wrangler help and official
[Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)
and [Worker configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
