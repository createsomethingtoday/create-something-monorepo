# webflow-app-preflight

A shareable agent skill that guides a developer through building a **Webflow Marketplace App** — Designer Extension, Data Client, or Hybrid — that passes review on the first attempt.

It combines Webflow's official developer documentation with the recurring, real-world patterns that most often cause a submission to be rejected or escalated into deeper security review, so those patterns get designed out before they ship.

## What's inside

```
webflow-app-preflight/
├── SKILL.md                              # entry point: the 5-phase workflow
├── reference/
│   ├── app-types-and-registration.md     # building blocks, registration, CLI, credentials
│   ├── oauth-scopes-and-security.md       # OAuth flow, full scope list, security patterns
│   └── listing-and-submission.md          # assets, requirements, rejection grounds, timeline
├── checklists/
│   ├── pre-submission-quality-gate.md     # the go/no-go checklist
│   └── governance-pitfalls.md             # the modal reasons apps fail review, and the fix
└── evals/
    ├── trigger-positive.yml               # 8 prompts that should route here
    ├── trigger-negative.yml               # 6 that should not
    ├── quality.yml                        # output assertions from the fixture baseline
    └── rubric.yml                         # weighted grading, passing_score 80
```

## Measured baseline

The skill was evaluated against a fixture app carrying **24 deliberately planted violations** across code, backend, config, and README.

| | With skill | Unaided control |
|---|---|---|
| Caught | **24/24** | 14/24 |
| Missed entirely | 0 | 5 |
| Inverted advice | 0 | 3 |

The unaided run got every issue inferable from general security instinct (hardcoded secret, credential harvesting, `eval`, the review-bypass loader) and then degraded on Webflow-specific governance — producing three confidently wrong recommendations now captured in the skill's **Anti-advice** section:

- "Add exponential backoff and retry on the 401" (it's revocation — stop)
- "Drop the extra scopes on uninstall" (you must retain cleanup scopes)
- Accepting the claim that Webflow auto-removes injected scripts (it doesn't)

The eval also caught two defects in the skill itself: a `redirect_uri` description that contradicted its own example, and a missing privacy/data-handling section. Re-run the evals in `evals/` before changing guidance.

## Using it

**In an agent that supports skills** (e.g. Claude Code): drop the `webflow-app-preflight/` directory into your skills location (for Claude Code: `~/.claude/skills/`) and invoke it when building or preparing a Webflow App.

**As a standalone guide:** read `SKILL.md` top to bottom, then run the two checklists before submitting.

## How the guidance was built

Every requirement traces to Webflow's public documentation:

- Marketplace Guidelines — <https://developers.webflow.com/apps/docs/marketplace-guidelines>
- Scopes — <https://developers.webflow.com/data/reference/scopes>
- Register an App — <https://developers.webflow.com/apps/data/docs/register-an-app>
- Developer platform — <https://developers.webflow.com/>

The `governance-pitfalls.md` layer generalizes the highest-signal issues observed across many App reviews into public-safe best practices. It contains no internal identifiers, app names, or reviewer details — just the patterns and their fixes. Each pitfall maps back to a published guideline, so following it is simply meeting the bar early.

## Scope

Covers the full lifecycle from scaffolding to a pre-submission quality gate. It does **not** submit on the developer's behalf or interact with review systems — it prepares the App and the developer to submit with confidence.
