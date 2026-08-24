# Exception decision escalation

The compiled contract for moving undecided app-review exception items to a recorded human
decision — and the Airtable automation that implements one action of it.

## Two layers

| Layer | Surface | What it owns |
| --- | --- | --- |
| Contract | `workflow.json` + `cases.json`, compiled by `@create-something/workflow-compiler` | Who holds authority, what evidence each action requires, what needs approval, what the receipt must carry |
| Executor | Airtable automation `wflRQK15vUpqKxYtR` in base `appMoIgXMTTTNIc3p` | The scheduled Slack DM — the contract's `notify_decider` action |

The executor is **deployed** as of 8/24/2026: `cron weeklyV2` on weekdays `[2,4,5]` (Tue/Thu/Fri) at
14:00 UTC → `findRecords` where `fldDwkkTHErvn4atw = 1` → `sort` by 📅Requested ascending →
`conditionalGroup` (silent on an empty queue) → one `sendToSlack` DM to `U0ACR9V5UC9`.

Two details worth preserving. The DM is addressed by **Slack user ID, not email** — email and
D-channel targets can report success without delivering. And the conditional cannot test
`findRecords.records` directly (`isNotEmpty` rejects an array of Record); it tests the mapped id
array, `map(records, propertyGetter("id"))`.

The compiler cannot send the message. It has no outbound network by design: the only `fetch(`
in the published package is the generated console loading its own local `data.json`, and the
README states the shadow-only boundary outright. It compiles and proves the contract; Airtable
executes it.

## Commands

Build the workspace package and use its binary — `packages/workflow-compiler` is `0.3.1` on
`main`, matching the published npm release. No `npx` needed.

```bash
pnpm --filter @create-something/workflow-compiler build
CLI=packages/workflow-compiler/dist/cli.js

node $CLI validate --workflow workflow.json
node $CLI simulate --workflow workflow.json --cases cases.json
node $CLI compile  --workflow workflow.json --cases cases.json --out <dir>
node $CLI verify   --dir <dir>
node $CLI serve    --dir <dir> --port 4173
```

Verified against the vendored build: identical `definitionHash`, identical `manifestHash
sha256:77dfb8bf…`, and the package's own suite at 154/154.

Current state: `definitionHash sha256:e7254c2e…`, 4 decisions, 19 artifacts, `externalMutations: false`,
`verify` reports `integrity_verified` / `attestation: unsigned`.

## What the contract asserts

Four actions, and the governance sits in `autonomy` + `approval`:

| Action | Authority | Autonomy |
| --- | --- | --- |
| `recommend_exception_item` | recommendation automation | `auto_allow` — advisory only |
| `notify_decider` | notification automation | `auto_allow` — read-only, this automation |
| `decide_exception_item` | final decider | `approval_required` |
| `release_developer_contact` | operator | `approval_required` |

Six replay cases, all matching: 2 pass, 2 approval_required, 2 blocked. The two blocked cases are
the ones worth keeping — the recommendation automation attempting to decide, and a decision
recorded without rationale.

The compiler rejected the first draft with `ACTION_NOT_ALLOWED_FOR_AGENT`, because
`decide_exception_item` had been assigned to the recommendation agent whose allowlist does not
contain it. That is the rule the whole exceptions loop rests on, caught by validation rather
than by review.

## Known gap, recorded honestly

`release_developer_contact` is modelled `approval_required`, which is the intended posture, not
current behaviour. In the live base this release fires automatically: last item decided →
`⚖️Asset Undecided Exceptions` rolls to 0 → `wfleu2e0kOz68y9xK` flips `🖌️Review Status` to
`🆕Ready for Review` → the Review Status Trigger customScript notifies the developer through
Zendesk unless both suppression fields are set. The truth is written into that action's
`recovery.path` rather than hidden by the model. Wistia v2 (`reciu95rOkajz2ZRN`) is deliberately
held at one undecided item because of this coupling.

## Schema version

This definition is `workflow_definition.v0.1`, which the compiler still accepts. `0.3.x` added
`v0.2` and `v0.3` with exact-evidence matchers and `equals_one_of`, plus detached
`migrateWorkflowDefinitionToV0_3` helpers.

Migrating is worth doing. Today `automation-cannot-decide` is blocked because the actor sits
outside the action's authority. Under `v0.3` the same rule could also constrain `decider_id`
itself to the set of human decider identities, so a decision carrying an automation identity
would be unsatisfiable as evidence rather than only refused by actor. That is closer to how
`exception-decisions-mcp` actually enforces it server-side.

## Not done

- Artifacts are unsigned. `compile --signing-key <private.pem> --key-id <id>` and
  `verify --public-key` are available; using them needs a key-custody decision (Infisical path,
  rotation) that has not been made.
- Compiled output is not committed. Regenerate with `compile` when the definition changes.
