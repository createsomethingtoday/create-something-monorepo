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
└── checklists/
    ├── pre-submission-quality-gate.md     # the go/no-go checklist
    └── governance-pitfalls.md             # the modal reasons apps fail review, and the fix
```

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
