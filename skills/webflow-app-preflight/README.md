# webflow-app-preflight

A shareable agent skill that guides a developer through building a **Webflow Marketplace App** — Designer Extension, Data Client, or Hybrid — that passes review on the first attempt.

It combines Webflow's official developer documentation with the recurring, real-world patterns that most often cause a submission to be rejected or escalated into deeper security review, so those patterns get designed out before they ship.

The workflow classifies credential and scope authority before applying OAuth rules. It does not mistake an App-owned or third-party token, scope, session, or consent flow for Webflow OAuth merely because the same vocabulary appears in code.

Use this skill before findings are issued. If the developer already has exact review findings or acceptance criteria, use `webflow-app-review-remediation` instead.

## What's inside

```
webflow-app-preflight/
├── SKILL.md                              # entry point: the 5-phase workflow
├── assets/
│   └── webflow-app-submission-checklist.md # self-contained checklist to send a developer
├── reference/
│   ├── app-types-and-registration.md     # building blocks, registration, CLI, credentials
│   ├── oauth-scopes-and-security.md      # OAuth flow, scope list, backend authorization
│   └── listing-and-submission.md         # assets, requirements, rejection grounds, timeline
├── checklists/
│   ├── pre-submission-quality-gate.md    # the go/no-go checklist
│   └── governance-pitfalls.md            # the modal reasons apps fail review, and the fix
└── evals/
    ├── run-static-evals.mjs              # consistency + grounding harness, no API key needed
    ├── trigger-positive.yml              # 10 prompts that should route here
    ├── trigger-negative.yml              # 8 that should not
    ├── quality.yml                       # 9 output-assertion cases
    └── rubric.yml                        # weighted grading, passing_score 80
```

## Measured baseline

In our internal evaluation (July 2026), the skill was run against a fixture app carrying **24 deliberately planted violations** across code, backend, config, and README. The fixture app, prompts, and grading transcript are internal and are not included in this package, so treat the figures below as our internal evaluation rather than an independently reproducible benchmark.

|                 | With skill | Unaided control |
| --------------- | ---------- | --------------- |
| Caught          | **24/24**  | 14/24           |
| Missed entirely | 0          | 5               |
| Inverted advice | 0          | 3               |

The unaided run got every issue inferable from general security instinct (hardcoded secret, credential harvesting, `eval`, the review-bypass loader) and then degraded on Webflow-specific governance — producing three confidently wrong recommendations now captured in the skill's **Anti-advice** section:

- "Add exponential backoff and retry on the 401" (it's revocation — stop)
- "Drop the extra scopes on uninstall" (you must retain cleanup scopes)
- Accepting the claim that Webflow auto-removes injected scripts (it doesn't)

The eval also caught two defects in the skill itself: a `redirect_uri` description that contradicted its own example, and a missing privacy/data-handling section. Re-run the evals in `evals/` before changing guidance.

## Running the evals

Run the deterministic static harness after every guidance change. It requires no API key.

```bash
node evals/run-static-evals.mjs
```

Checks that the eval files parse and are internally consistent, that every `contains` assertion is groundable somewhere in the skill corpus, that `not_contains` phrasing appears only inside Anti-advice, that rubric weights sum to 100 and each criterion's vocabulary exists in the corpus, that the checklists haven't regressed below their item thresholds, that the partner checklist still covers every gate section and pitfall, that SKILL.md's backend exemplars stay grounded in the quality gate (and point to it as authoritative), that the load-bearing corrective phrases (revocation, retained cleanup scopes, site-and-page removal, CORS as defense-in-depth, site IDs in published page source) appear verbatim in SKILL.md, the gate, and the partner checklist, that the frontmatter contract holds (name, description length, sibling cross-reference), that each trigger-positive prompt routes to this skill's description rather than the sibling's, and that no internal tooling references or finding IDs have leaked into any shareable artifact (including the evals and this README). It answers "could a grounded model produce the expected output, and is this package self-consistent?" — not "did the model do it."

**Coverage note.** The 24-violation fixture is bundle- and lifecycle-weighted. The **Backend and API surface** section — server-side identity resolution, object-level authorization, destination allowlisting, CORS as defense-in-depth, credential storage, upload validation, dependency-advisory hygiene, and production-only infrastructure — was added after that baseline was measured, and is exercised by quality cases 6–8 plus the `backend_authorization` rubric criterion. It has no unaided control figure yet. Those checks address the class of failure that review finds by _calling_ a service rather than by reading a bundle, so a static review of source alone cannot fully confirm them; the skill states them as requirements the developer must be able to demonstrate.

## Using it

**In an agent that supports skills** (e.g. Claude Code): drop the `webflow-app-preflight/` directory into your skills location (for Claude Code: `~/.claude/skills/`) and invoke it when building or preparing a Webflow App.

**As a standalone guide:** read `SKILL.md` top to bottom, then run the two checklists before submitting.

**Sending it to a developer who isn't running an agent:** use `assets/webflow-app-submission-checklist.md`. It's a single self-contained file — the full gate, the ten failure patterns with fixes, the inverted advice to avoid, and the submission mechanics — with no agent instructions or internal references. It's derived from the checklists, and `run-static-evals.mjs` fails if it drifts out of step with them.

## How the guidance was built

The skill deliberately distinguishes two kinds of guidance:

- **Published Webflow requirements** trace to the exact public documentation below.
- **Security and engineering controls** generalize recurring review risks into public-safe practices. They help a developer prepare evidence, but are not represented as published Webflow policy unless the linked page says so.

Primary public sources:

- Marketplace Guidelines — <https://developers.webflow.com/apps/docs/marketplace-guidelines>
- Scopes — <https://developers.webflow.com/data/reference/scopes>
- Register an App — <https://developers.webflow.com/apps/data/docs/register-an-app>
- Developer platform — <https://developers.webflow.com/>

The `governance-pitfalls.md` layer generalizes the highest-signal issues observed across many App reviews into public-safe best practices. It contains no internal identifiers, app names, or reviewer details—only patterns and mitigations. When a control goes beyond an explicit public requirement, the skill labels it as security or engineering guidance rather than claiming that Webflow requires it.

## Scope

Covers the lifecycle from scaffolding to a pre-submission quality gate. It does **not** own issued-finding remediation, submit on the developer's behalf, or interact with review systems. Use `webflow-app-review-remediation` after exact findings exist.
