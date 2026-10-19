# Template review: OpenProse program

Started October 18, 2026. Owner: Micah Johnson. Pin: `docs/openprose/VENDOR.md`.

Runs Marketplace template reviews on a schedule, up to one decision step. Each
run reads the reviewer's own queue, collects evidence, and stages verdicts. It
then writes a numbered digest. The reviewer answers the digest in one line, and
`apply-reviewer-decisions` carries that answer out.

## Why there is one human step

Approving publishes a template to the Marketplace. Request Changes emails the
creator. Webflow policy requires human review before either one reaches a
partner. The Template Review MCP enforces the same rule. Removing the step
needs an exception from Enterprise AI Ops.

## Shape

| File | Kind | Tier | Model |
| --- | --- | --- | --- |
| `template-review-tick.prose.md` | gateway | Ignition | n/a |
| `review-queue-loaded.prose.md` | responsibility | Database | haiku |
| `review-evidence-collected.prose.md` | responsibility | Automation | haiku, one session per version |
| `designer-pass.prose.md` | function | Automation | ego-browser |
| `screen-false-positives.prose.md` | function | Judgment | n/a |
| `review-verdict-staged.prose.md` | responsibility | Judgment | sonnet |
| `apply-reviewer-decisions.prose.md` | function | Automation, gated | interactive session only |

Wiring: the gateway maintains `run_request`. The queue step maintains `queue`.
Evidence requires `queue` and maintains `evidence`. Verdicts require both.

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
which is the internal field. `bin/template-review-run.sh` passes every
decision, status, checklist, ticket, Admin, featured, Airtable-write, Slack,
and Gmail tool to `--disallowedTools`. The contracts also prohibit them, but
the runner enforces the block even if a contract render ignores its rules.
`--dry-run` also blocks the Agent Review Feedback write.

## Running it

```bash
# one version, no writes at all
.agents/prose/bin/template-review-run.sh --dry-run recXXXXXXXXXXXXXX

# the full queue, as the schedule runs it
.agents/prose/bin/template-review-run.sh
```

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
