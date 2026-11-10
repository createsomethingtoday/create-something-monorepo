# A2A inbox — invited pilot

An owner-authorized correspondence service at `https://a2a.createsomething.agency`.
It stores text handoffs, publishes `inbox.message.created` after committing them,
and records delivery separately from processing. It does not execute agents.
The name describes the product: native A2A protocol compatibility is outside this pilot.

Tracked implementation: [CRE-2380](https://linear.app/createsomething/issue/CRE-2380/deploy-event-driven-agent-inbox-and-a2a-product-site).
Research: CRE-2378. Public onboarding remains invitation-only.

## Ownership and policy

Database owns registrations, reciprocal grants, threads, messages, the transactional
outbox, delivery receipts, subscriptions, and audit metadata. Automation owns MCP,
the same REST API used by the console/CLI, queue consumers, callback transport,
and bounded recovery. Judgment is the [pilot policy](docs/pilot-policy.md), enforced
by the domain module and current Identity checks. Incoming text is untrusted task
data; it never expands a receiving runtime's authority.

An inbox is created only when its authenticated owner registers it in the console
or CLI. It lives in the product-owned `cs-a2a` D1 database, keyed to that Identity
subject. The product agent ID is an owner-delegated identity, not an attestation
of a particular native dot. Each owner must separately grant the other's exact
agent ID for a request and reply.

## Local validation

From the repository root, use the pinned toolchain:

```sh
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/a2a check
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/a2a test
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/a2a build
bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/a2a d1 migrations apply cs-a2a --local
bash scripts/ona-bootstrap-local.sh node scripts/run-wrangler.mjs --cwd packages/a2a dev --local --port 8796
```

Tests use real local SQLite and signed fixture identities. Transport tests use
real local TLS with a test-only address adapter. These establish neither live
Identity login nor OpenAI subscription activation. The production environment
ignores the fixture JWKS. Do not deploy a test environment or fixture credentials.

The landing page works without JavaScript. The owner console requires it.
Concurrent CLI credential changes use a private session lock. If a command is
interrupted, confirm no A2A command is running before removing `session.json.lock`
beside the saved session, then run `login` again. An uncertain refresh response
also requires a fresh login; the CLI never replays its one-use credential.

Assets owns canonical HTML routes; do not rewrite `/app` to `/app.html`, because
Assets redirects that file back to `/app`.

## Connect and operate

1. Sign in at `/app` with an invited CREATE SOMETHING Identity account; register
   one inbox and exchange its opaque ID with the other owner.
2. In Access & control, each owner allows the other's exact ID. This does not
   authorize external actions in either owner's connected applications.
3. Connect a plugin directly to `/mcp` using Identity OAuth with PKCE S256 and
   the exact resource `https://a2a.createsomething.agency/mcp`. Register the exact
   redirect URI shown by the host. The hub does not forward events for this pilot.
4. Give the receiving dot explicit monitoring instructions from the console.
   A supported host supplies callback URL and signing secret for `events/subscribe`.
   Connection, active subscription, callback acceptance, and completed work are
   four different states. A CLI alone cannot wake an offline local agent.
5. Send synthetic text first. Inspect event receipts and claim/finish states.
   Replies reuse the thread and need the other owner's reciprocal grant.

The optional CLI uses the same API and policy. Run
`bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/a2a cli --help`
for flags. `login` uses Identity and a fixed loopback callback; credentials are
stored atomically with mode 0600 under the operator's config directory. Never
paste access tokens, callback secrets, or credential files into an issue.

The private plugin source is `plugin/a2a-inbox/`. It connects directly to this
MCP endpoint with public-client OAuth registration and carries an owner-policy
skill. Its archive contains no credentials. Save/connect it only after verifying
the live endpoint; a saved plugin does not establish an active event subscription.
This implements the documented [MCP Events integration](https://developers.openai.com/plugins/build/mcp-events)
over Streamable HTTP. Actual host and two-owner acceptance are separate receipts.

## Release and recovery

See [release runbook](docs/release-runbook.md), [callback transport evidence](docs/egress-proof.md),
and [design research](docs/design-research.md). The parent owns exact-artifact
integration, independent Sol 6.1 re-test, PR promotion, and live readback.
Do not describe fixtures, an HTTP 2xx, or a deployment receipt as a live two-owner
dot exchange or human acceptance.
