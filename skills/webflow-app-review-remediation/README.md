# webflow-app-review-remediation

A shareable agent skill that helps a Webflow App developer or partner resolve **issued Marketplace review findings**: normalize the findings, route each to the owning layer, make the smallest defensible change set, prove each acceptance criterion, and prepare a resubmission packet ending in `READY TO RESUBMIT` or `NOT READY TO RESUBMIT`.

Use this skill only after findings exist. For first-time builds and pre-submission preparation, use `webflow-app-preflight` instead.

Before implementing a token, scope, consent, or revocation finding, the workflow classifies issuer, audience, protected resource, App capability, and credential type. It preserves issued wording while preventing App-owned or third-party authority from being silently treated as Webflow OAuth authority.

## What's inside

```
webflow-app-review-remediation/
├── SKILL.md                                # entry point: the 6-step remediation workflow
├── assets/
│   └── remediation-plan.md                 # fill-in plan template (finding matrix, implementation cards, receipts)
├── checklists/
│   └── blocker-remediation-evidence.md     # per-finding evidence checklist (P1 and unassigned)
└── evals/
    ├── run-static-evals.mjs                # consistency + grounding harness, no API key needed
    ├── trigger-positive.yml                # prompts that should route here
    ├── trigger-negative.yml                # prompts that should not
    ├── quality.yml                         # output-assertion cases
    └── rubric.yml                          # weighted grading, passing_score 85
```

## Principles the skill enforces

- **Preserve the issued contract.** Finding IDs, priorities, and acceptance criteria are kept verbatim; missing priorities become `unassigned` and are treated as P1 for planning unless the reviewer says otherwise.
- **Containment before remediation.** Live credential exposure or exploitable paths get an authorized security owner and a separate containment lane first.
- **Evidence states stay distinct.** Source verified, artifact verified, installed revision, runtime observed, submitted, and reviewer accepted are never flattened into each other.
- **Authorization safety.** No tenant enumeration, unauthorized writes, or response-body retrieval as proof; cross-tenant tests need two authorized test identities.
- **Provenance discipline.** Every claim is labeled published requirement, issued finding, security control, or open decision.

## Running the evals

Run the deterministic static harness after every guidance change. It requires no API key.

```bash
node evals/run-static-evals.mjs
```

It checks that the eval files parse, that every `contains` assertion is groundable in the skill corpus (with issued finding IDs whitelisted as legitimate input echoes), that `not_contains` phrasing appears in the corpus only inside the Boundaries section, that the rubric is well-formed, that referenced paths exist, that the frontmatter contract holds (name, description length, sibling cross-reference), that each trigger-positive prompt routes to this skill's description rather than the sibling's, and that no internal tooling references have leaked into the shareable files. It answers "could a grounded model produce the expected output, and is this package self-consistent?" — not "did the model do it."

## Using it

**In an agent that supports skills** (e.g. Claude Code): drop the `webflow-app-review-remediation/` directory into your skills location (for Claude Code: `~/.claude/skills/`) and invoke it once review findings exist.

**As a standalone guide:** read `SKILL.md` top to bottom, fill in `assets/remediation-plan.md`, and run `checklists/blocker-remediation-evidence.md` per finding before resubmitting.

Give the skill only findings the recipient is authorized to receive. Do not attach internal reviewer discussion, another partner's examples, credentials, customer identifiers, or exploit payloads.

## Scope

Covers issued-finding remediation through resubmission readiness. It does **not** perform first-time preflight (use `webflow-app-preflight`), submit on the developer's behalf, speak for reviewer acceptance, or handle internal reviewer/governance deliberation.

Primary public sources:

- Marketplace Guidelines — <https://developers.webflow.com/apps/docs/marketplace-guidelines>
- Submit a Webflow App — <https://developers.webflow.com/submit>
- Custom Code APIs — <https://developers.webflow.com/data/reference/custom-code>
- Designer ID tokens — <https://developers.webflow.com/designer/reference/get-user-id-token>
