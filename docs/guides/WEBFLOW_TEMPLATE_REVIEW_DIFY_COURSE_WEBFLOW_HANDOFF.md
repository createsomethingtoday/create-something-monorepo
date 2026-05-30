# Webflow Handoff: Template Reviewer Dify Course

This handoff is for adding the Dify reviewer course to a Webflow project as a reusable Code Component.

Source component:

```text
packages/webflow-components/src/components/training/TemplateReviewerDifyCourse.tsx
packages/webflow-components/src/components/training/TemplateReviewerDifyCourse.webflow.tsx
```

Webflow library:

```text
CREATE SOMETHING Canon Components
```

Component name:

```text
Template Reviewer Dify Course
```

## Use This When

Use this Webflow version when reviewers need a navigable internal training page instead of a Markdown file.

The component is designed to hold:

- the reviewer workflow overview,
- the 11-module onboarding course,
- copyable Dify review prompts,
- embedded Dify reviewer chat lanes,
- optional pinned walkthrough URLs,
- screenshot capture requirements,
- the validator-first plus sandbox gap-fill rule,
- the time-savings pilot calculator.

## Page Build

Recommended page:

```text
/template-reviewer-course
```

Recommended structure:

- Add one full-width section.
- Insert `Template Reviewer Dify Course` as the primary page content.
- Keep the page clean and internal-facing.
- Add supporting Webflow-native sections only below the component if needed.

Avoid adding:

- private Airtable rows,
- creator emails,
- internal notes,
- raw Dify traces,
- API keys, bearer tokens, or workspace credentials,
- unredacted screenshots.

## Component Props

Use these starting values.

| Prop                     | Value                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `Title`                  | `Dify Reviewer Course`                                                                           |
| `Eyebrow`                | `Webflow Marketplace Template Review`                                                            |
| `Intro`                  | Keep the default unless the page needs team-specific wording.                                    |
| `Dify Chat URL`          | Published Dify reviewer chat URL.                                                                |
| `Agent Instructions URL` | Hosted source-of-truth instructions URL, if available.                                           |
| `Course Doc URL`         | Hosted Markdown/docs URL, if available.                                                          |
| `Default View`           | `overview` for reviewer training; `agents` for live practice.                                    |
| `Screenshot Assets JSON` | Optional backstage capture data only; the main reviewer UI no longer centers a screenshot tab.   |
| `Walkthrough Review Set` | `[]` to pull live queue rows, or approved public training rows as JSON.                          |
| `Live Queue Batch Size`  | `3` for the first walkthrough.                                                                   |
| `Dify Agent Embeds`      | JSON array of reviewer chat iframe URLs.                                                         |
| `Show Pilot Calculator`  | `true`                                                                                           |
| `Compact`                | `false` unless the page is embedded inside a narrow internal layout with surrounding UI.         |

## Embedded Reviewer Agents

The component experience should stay centered on the primary reviewer path:

1. Start: choose the review path and parallel mode.
2. Practice lanes: learn the prompt and evidence pattern.
3. Live Dify: copy a prompt into the embedded reviewer agent and run the rehearsal.

Secondary features should stay behind intuitive reveal states. Course references, trusted-context
detail, screenshot requirements, time-savings data, review set details, and sandbox guidance should
support the primary workflow without taking over the prompt and chat space.

The `Live chat` view embeds Dify reviewer chats so reviewers can practice in the same interface as the course.

Use this format in `Dify Agent Embeds`:

```json
[
  {
    "id": "eric-hub",
    "name": "ERIC HUB",
    "role": "Template reviewer agent",
    "embedUrl": "https://udify.app/chatbot/yQFSjVPEPQOUi3EK"
  },
  {
    "id": "natalia-hub",
    "name": "NATALIA HUB",
    "role": "Template reviewer agent",
    "embedUrl": "https://udify.app/chatbot/UFJEfdLz5PVhKETI"
  },
  {
    "id": "mariana-hub",
    "name": "MARIANA HUB",
    "role": "Template reviewer agent",
    "embedUrl": "https://udify.app/chatbot/KqRs1GTWwH7ibVbt"
  },
  {
    "id": "vicki-hub",
    "name": "VICKI HUB",
    "role": "Template reviewer agent",
    "embedUrl": "https://udify.app/chatbot/zSHH89gR94W5jGgm"
  }
]
```

Each reviewer appears as a selectable lane in the `Live Dify` view. The component includes these
four reviewer lanes by default, and any `Dify Agent Embeds` entries with matching IDs override the
default URL or label. Keep this JSON updated when a reviewer agent embed URL changes.

## Walkthrough Review Set

Use one of two modes:

- Leave `Walkthrough Review Set` as `[]` when the Dify agent should pull review-ready rows from the review queue or Airtable-backed review tools.
- Add approved, redacted training rows when the course should provide a stable set of public URLs.

Do not make the Webflow component fetch Airtable directly. Airtable access belongs inside the Dify/review tools, where credentials and write permissions stay server-side.

Use this format in `Walkthrough Review Set`:

```json
[
  {
    "name": "Example SaaS Template",
    "versionId": "ver_example_001",
    "assetId": "asset_example_001",
    "status": "Ready for review",
    "publishedUrl": "https://example-saas-template.webflow.io",
    "notes": "Replace with an approved public training URL."
  }
]
```

Use the example manifest as a starting point:

```text
docs/examples/webflow-template-review-dify-course-walkthrough-review-set.example.json
```

## Transparency Walkthrough

For the reviewer recording, keep transparency practical: paste the walkthrough prompt into the
embedded Dify chat, then open the Dify backend conversation or app logs in a separate tab to show
that reviewer chats are captured and can be audited.

Do not embed Braintrust, Langfuse, raw Dify traces, or validator logs in this Webflow component.
That keeps the course focused on the review motion and avoids exposing credentials, raw prompts,
private Airtable notes, creator PII, or internal trace payloads.

## Trusted Context Access Point

The sidebar includes a subtle `How Dify gets trusted context` detail panel.

Use it to explain why the agent can be trusted without turning the course into a technical architecture page:

- Instructions define the reviewer role, no-write boundary, evidence order, and approval rules.
- Knowledge keeps Submission Guidelines and the Grading Rubric close to the agent.
- MCP tools load current review context, queue data, validator output, and safe write tools.
- E2B sandbox/run_code is available when reviewers need bounded public-site checks beyond validator coverage.

Keep this section short. It should reassure reviewers that context is traceable and governed, not ask them to learn the implementation.

## Coverage Boundary Support Panel

The `Live Dify` support panels include `Coverage boundary`.

Use it when reviewers need to know what the agent can prove from validator, sandbox, and review-context evidence versus what still needs Designer confirmation. The panel should stay secondary to the prompt/chat workspace and should cover:

- public published-site checks the agent can verify,
- submission-guideline areas where the agent can only provide partial evidence,
- Designer-only checks such as CMS structure, class/component organization, interaction setup, breakpoints, visual quality, and final write/status decisions.

The panel includes a copyable coverage-boundary prompt so reviewers can ask Dify to return `Agent-covered`, `Needs Designer confirmation`, `Manual blockers`, and `Safe next step`.

## Screenshot Assets

The component can still render screenshot assets when the `screenshots` view is selected directly,
but the normal reviewer sidebar no longer exposes a screenshot tab. Use screenshots as internal
course-production support, not as the main learning surface.

Use this format in `Screenshot Assets JSON`:

```json
[
  {
    "id": "S1",
    "url": "https://example.com/s1-dify-studio.png",
    "alt": "Dify Studio configuration for the reviewer agent",
    "caption": "Correctly configured reviewer agent with knowledge and tools enabled."
  }
]
```

Use the example manifest as a starting point:

```text
docs/examples/webflow-template-review-dify-course-screenshot-assets.example.json
```

Required first-version screenshots:

```text
S1, S2, S4, S5, S6, S7, S8, S9, S10, S12, S13, S14, S15, S16, S17, S18
```

Optional screenshots:

```text
S3 if S8 already shows tool connectivity clearly.
S11 if typo/content follow-up is covered during live training.
```

## Capture Order

Capture screenshots in this order so the page can be filled progressively:

1. Dify configuration and chat orientation: `S1`, `S2`.
2. Queue and batch inputs: `S4`, `S5`, `S6`, `S7`.
3. Evidence quality: `S8`, `S9`, `S10`, `S12`.
4. Multi-tab lane comparison: `S17`, `S18`.
5. Write safety and fallback: `S13`, `S14`, `S15`.
6. Pilot measurement: `S16`.
7. Optional support shots: `S3`, `S11`.

## Redaction Rules

Before upload, redact:

- API keys,
- bearer tokens,
- private emails,
- creator PII,
- internal reviewer notes,
- unrelated queue rows,
- raw trace IDs if they expose sensitive context.

Published template URLs can stay visible when they are the subject of the lesson.

## Validation Before Share

Run:

```bash
pnpm --filter @create-something/webflow-components typecheck
pnpm --filter @create-something/webflow-components bundle
```

Confirm the generated manifest includes:

```text
TemplateReviewerDifyCourse
```

## Share Boundary

Do not run the share command until the target Webflow workspace is confirmed.

When the target workspace is confirmed, share with:

```bash
pnpm --filter @create-something/webflow-components share
```

On first share, the Webflow CLI may open a browser for workspace authentication and create local workspace credentials. Keep those credentials out of repo files.

## Reviewer Acceptance Check

After the component is added to Webflow, verify:

- the component appears on the reviewer training page,
- the `Overview`, `Practice lanes`, `Live Dify`, and `Reference` surfaces work,
- the `Live Dify` view shows the correct Dify agent embed,
- all text fits on desktop and mobile breakpoints,
- copy buttons work for prompt text,
- the walkthrough prompt can be copied and pasted into the embedded Dify chat,
- the transparency walkthrough uses Dify backend logs in a separate tab instead of embedded traces,
- pilot calculator inputs update the estimate,
- optional screenshot assets are redacted and legible when the screenshots view is used,
- outbound links open the intended Dify chat and docs.
