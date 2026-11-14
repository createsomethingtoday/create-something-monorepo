# Template review: OpenProse program

Started October 18, 2026. Owner: Micah Johnson. Pin: `docs/openprose/VENDOR.md`.
First live run October 19, 2026 (`runs/20261019-123111-trb87d`: 7 re-reviews
and 10 picked-up New submissions).

Runs Marketplace template reviews on a schedule, up to one decision step. Each
run reads the reviewer's own queue, collects evidence, and stages verdicts. It
then writes a numbered digest. The reviewer answers the digest in one line, and
`apply-reviewer-decisions` carries that answer out.

## Why there is one human step

Approving publishes a template to the Marketplace. Request Changes emails the
creator. Webflow policy requires human review before either one reaches a
partner. The Template Review MCP enforces the same rule. Removing the step
needs an exception from Enterprise AI Ops.

## Source of truth

The playbook is the `template_review_workflow` prompt served by the
Template Review MCP (`packages/webflow-template-review-mcp/src/prompts.ts`,
`REVIEW_WORKFLOW`). This package is its executable projection. If the two
disagree, the prompt wins and this package is corrected. The Featured Batch
runbook (`packages/webflow-template-review-mcp/docs/FEATURED_BATCH_RUNBOOK.md`)
is monthly curation and is not projected here.

## Playbook mapping

| Playbook phase | File | Kind | Tier | Model |
| --- | --- | --- | --- | --- |
| Ignition (schedule, manual kick, targeted kick, pickup kick) | `template-review-tick.prose.md` | gateway | Ignition | n/a |
| 2 Find Work (claim New submissions) | `claim-new-submissions.prose.md` | function | Automation, one write | haiku |
| 1 Setup and 2 Find Work (my queue), 3 Inspect | `review-queue-loaded.prose.md` | responsibility | Database | haiku |
| 4 Automated Analysis | `review-evidence-collected.prose.md` | responsibility | Automation | sonnet first reviews, haiku rechecks, one session per version |
| 4 Manual Designer checks | `designer-pass.prose.md` | function | Automation | ego-browser |
| 4 Interpreting Results (false positives) | `screen-false-positives.prose.md` | function | Judgment | n/a |
| 5 Decide (staged, Agent Review Feedback) | `review-verdict-staged.prose.md` | responsibility | Judgment | opus (Claude Code) / Sol 6.1 (Codex) |
| 5 Decide (official) and 6 Publish | `apply-reviewer-decisions.prose.md` | function | Automation, gated | interactive session only |

Wiring: the gateway maintains `run_request`. The queue step maintains `queue`
and calls `claim-new-submissions` when `run_request.pickup_new > 0`.
Evidence requires `queue` and maintains `evidence`. Verdicts require both.

## Model routing

ProseScript `agent` blocks carry a host-defined `model:` name; the host maps
it. The run embodies the VM in the top-level session, so that session is
also the judge's model.

| Role | Claude Code | Codex | Why |
| --- | --- | --- | --- |
| VM + judge (`review-verdict-staged`) | opus (Opus 5.5+) | Sol 6.1 | verdicts are reasoning; never a smaller model |
| collector (first reviews) | sonnet | mid tier | reads screenshots, many tool calls |
| rechecker (re-reviews), loader, claim | haiku | small tier | bounded extraction |
| Designer pass | sonnet | mid tier | drives ego-browser, reads panels |

`bin/template-review-run.sh` starts the headless session with `--model opus`.

## Token use

- Raw validator output, screenshots, stylesheets, and ticket threads stay in
  per-version Haiku sessions and the run directory. Only compact findings
  reach the Sonnet judge.
- Re-reviews recheck only the items cited in the last round.
- A version is skipped when nothing changed since its last staged verdict,
  or when the creator has not republished since Changes Requested.
- The Designer pass runs only on first reviews and on Designer-only recheck
  items.

## Write boundary

The scheduled run can make one write: `template_review_save_agent_feedback`,
which is the internal field. A pickup run (`--pickup N`) can also call
`template_review_assign_self`, through `claim-new-submissions` only.
`bin/template-review-run.sh` passes every decision, status, checklist,
ticket, Admin, featured, Airtable-write, Slack, and Gmail tool to
`--disallowedTools`, and adds `assign_self` unless `--pickup` was given. The contracts also prohibit them, but
the runner enforces the block even if a contract render ignores its rules.
`--dry-run` also blocks the Agent Review Feedback write.

## Running it

```bash
# one version, no writes at all
.agents/prose/bin/template-review-run.sh --dry-run recXXXXXXXXXXXXXX

# the full queue, as the schedule runs it
.agents/prose/bin/template-review-run.sh

# the queue plus the 10 oldest unassigned New submissions
.agents/prose/bin/template-review-run.sh --pickup 10
```

Tests: `prose test .agents/prose/src/template-review/tests/` in a Claude
Code session with the open-prose skill. Fixture ids start with `recTEST`
and are never written to Airtable.

Logs and digests go to `.agents/prose/state/template-review/`, which git
ignores because the digests name creators and templates.

Schedule (weekdays 08:30 and 13:30 Central):

```bash
cp .agents/prose/bin/com.createsomething.template-review.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.createsomething.template-review.plist
# pause
launchctl bootout gui/$UID/com.createsomething.template-review
```

## Signing off

In a Claude Code session, answer the digest:

```text
apply-reviewer-decisions .agents/prose/state/template-review/digest-2026-10-20-0830.md
approve 1 3 5; cr 2 4; hold 6; edit 2: <replacement line>
```

Versions you do not name stay held. A version is also held when its status or
publish stamp changed after the digest was written.

## Known limits

- Laptop-dependent: no run happens when the Mac is asleep or offline.
- The Designer pass needs ego lite running and signed in.
- Semantic postconditions are self-attested at this OpenProse pin. The
  runner's tool block is the hard boundary; the digest sign-off is the review.
