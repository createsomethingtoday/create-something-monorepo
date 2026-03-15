# thenpgroup.com Abundance Hub Readiness Assessment (2026-03-14)

## Scope

Objective: confirm whether the existing CREATE SOMETHING Hub and MCP config already support a reviewable Abundance target for `thenpgroup.com`, and identify the smallest missing artifacts if not.

Target contacts:

- Latasha Baxter `<latasha@thenpgroup.com>`
- Stacey `<stacey@thenpgroup.com>`

Primary artifacts inspected:

- `config/mcp-hub/registry.json`
- `config/mcp-hub/state.json`
- `config/mcp-hub/discovery-packs.json`
- `config/mcp-hub/intent-routes.json`
- `packages/cs-mcp-hub-remote/wrangler.team-hubs.toml`
- `packages/cs-mcp-hub-remote/wrangler.toml`
- `scripts/cs-hub-fleet-deploy.sh`
- `scripts/cs-hub-fleet-verify.sh`
- existing Hub deploy runbooks in `docs/`

## Result

Status: not ready as an existing Hub target.

There is no current `thenpgroup.com`, `thenpgroup`, `abundance`, `Latasha Baxter`, or `Stacey` Hub target in the existing Hub config, team-hub template, fleet deploy script, or fleet verify script.

The repo does contain Abundance product documentation, but not a deployable Hub lane or customer-bound runtime shape for this client.

## What Exists Today

### Shared Hub and existing team-hub pattern exist

The current repo supports:

- a shared broker-first Hub runtime via `packages/cs-mcp-hub-remote`
- a generic team-hub Wrangler template in `packages/cs-mcp-hub-remote/wrangler.team-hubs.toml`
- a fixed fleet of existing named workers in `scripts/cs-hub-fleet-deploy.sh` and `scripts/cs-hub-fleet-verify.sh`
- client-isolated or named-lane runbook patterns such as:
  - `docs/AARON_OUTERFIELDS_HUB_RUNBOOK.md`
  - `docs/ANDRE_OUTERFIELDS_HUB_RUNBOOK.md`
  - `docs/MORGAN_YOUNG_C3_MANAGEMENT_HUB_RUNBOOK.md`
  - `docs/VIV_BLONDISH_HUB_RUNBOOK.md`

### No thenpgroup / Abundance-specific target exists

No matching target appears in:

- Hub registry entries
- discovery packs
- intent routes
- fleet worker lists
- named-lane runbooks
- worker/domain/account mappings in deploy and verify scripts

That means there is no existing target to mark deploy-ready as-is.

## Verification Performed

Commands run from the monorepo root:

```bash
pnpm mcp:hub:build
pnpm mcp:hub:fleet:verify
rg -n "thenpgroup|thenpgroup\\.com|Abundance|abundance|latasha@thenpgroup\\.com|stacey@thenpgroup\\.com" config/mcp-hub packages/cs-mcp-hub-remote docs scripts -S
```

Observed results:

1. `pnpm mcp:hub:build`

- invoked the Hub control-plane TypeScript build
- did not emit compiler errors in captured output

2. `pnpm mcp:hub:fleet:verify`

- failed immediately during the existing worker secret check
- stopped at:
  - `Checking required secrets on each worker...`
  - `===== SECRETS cs-hub-lainy =====`
- exited with code `254`

This verifies that current fleet validation is already blocked before any hypothetical `thenpgroup.com` target could be checked.

3. Targeted local package checks on `@create-something/cs-mcp-hub-remote`

- attempted:
  - `pnpm --filter @create-something/cs-mcp-hub-remote test`
  - `pnpm --filter @create-something/cs-mcp-hub-remote typecheck`
  - `node --import tsx --test packages/cs-mcp-hub-remote/test/apps-metadata.test.ts`
  - `node --import tsx --test packages/cs-mcp-hub-remote/test/broker-execution.test.ts`
- the direct `node --import tsx --test ...` processes entered an uninterruptible wait state in this environment and produced no pass/fail output during observation
- the inspected test files are local unit tests with mocked runtime behavior, not live Cloudflare deploy checks

Conclusion:

- these package checks do not currently provide a clean readiness signal in this shell environment
- they do not change the main finding, which is that the customer target definition is missing

## Precise Readiness Gap

The missing artifacts are:

1. A declared Hub shape for this customer

- either an explicit decision that `thenpgroup.com` uses the shared hub path
- or a named-lane/client-isolated Hub definition following an existing runbook pattern

2. A customer-bound runtime identity

- lane slug or host binding
- worker name if dedicated
- fallback `HUB_ACCOUNT_ID`
- explicit identity mode choice (`session_required` or `compat`)

3. A bounded capability surface

- allowed enabled server list
- discovery defaults
- any required disabled servers
- any search-provider commitment if the lane promises search

4. A runbook or operator artifact

- deployment command shape
- required secrets list
- normalization step for persisted Hub state
- verification checklist

5. Partner provisioning inputs required by the existing scripts

From the current partner and delivery scripts, a reviewable customer lane would still need explicit values for:

- client slug
- display name
- owner email / delivery recipient
- workspace account id
- identity account id
- identity tenant id
- optional identity user id
- required toolkits / toolkit profile
- host or lane binding
- delivery channel
- any metadata needed to explain approved exceptions or onboarding context

Relevant existing script surfaces:

- `scripts/partner-client-init.ts`
- `scripts/partner-access-mint.ts`
- `scripts/partner-access-rotate.ts`

The current assessment did not find those customer-specific values for `thenpgroup.com` / Abundance in repo config or runbooks.

## What Should Not Be Claimed Yet

The current repo cannot honestly represent `thenpgroup.com` / Abundance as:

- an existing fleet target
- a deploy-ready named lane
- onboarding-complete for search
- verified end-to-end in production

## Smallest Safe Next Step

Do not change shared Hub config until the target shape is decided.

The smallest safe follow-through is to choose one of the existing paths and then implement only that path:

1. Shared-hub path

- document the account binding and intended server surface
- verify the shared runtime is the intended customer delivery shape

2. Named-lane path

- create a lane-specific runbook modeled on `MORGAN_YOUNG_C3_MANAGEMENT_HUB_RUNBOOK.md` or `VIV_BLONDISH_HUB_RUNBOOK.md`
- bind it to an existing customer-safe server set
- choose a transparent lane slug / bound host consistent with current named-lane policy
- keep it out of the shared fleet scripts unless the operating model explicitly requires fleet inclusion

Until that decision is made, any config change here would be inventing a provisioning path rather than confirming readiness.

## Operational Risks

- Vault risk: current fleet verification is blocked by existing worker secret checks, so runtime verification is incomplete even for current fleet workers.
- Identity risk: the team-hub template defaults to `session_required`, while external named-lane examples often use `compat`; no decision exists yet for `thenpgroup.com`.
- Policy risk: no client-specific server exposure or runbook contract is defined yet for this customer.
- Verification-environment risk: local `node --import tsx --test ...` package checks did not complete cleanly in the current shell session, so package-level pass/fail evidence is limited.
- Deploy risk: no real deploy was performed in this assessment.

## Bottom Line

Abundance for `thenpgroup.com` is not currently ready as an existing Hub target because no customer-specific Hub target or named lane exists in the current config and deploy paths.

The repo does have an established path to make it reviewable, but the missing decision is whether this customer belongs on the shared hub or on a named-lane runbook pattern. Until that is specified, the gap is architectural definition, not a missing one-line config fix.
