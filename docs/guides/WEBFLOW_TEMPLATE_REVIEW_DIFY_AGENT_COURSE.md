# Webflow Template Review Dify Agent Course

Plain-language onboarding course for reviewers using the Natalia, Mariana, Eric, and Vicki Dify agents to complete Webflow Template Review work.

## Course Goal

Teach reviewers how to use the Dify chat interface as a safe review workspace.

The working hypothesis is:

> Reviewers can complete more reviews with less context switching when they give the agent the templates they want reviewed and ask it to run published-site checks, draft feedback, and prepare approved review actions in one chat.

The course does not teach reviewers to hand decisions to the agent. It teaches reviewers to use the agent for parallel evidence gathering, draft feedback, and clean write preparation while the human reviewer keeps ownership of the decision.

## Source Of Truth

Use this course with the current reviewer sources:

- `docs/guides/WEBFLOW_TEMPLATE_REVIEW_DIFY_AGENT_MANUAL.md`
- `packages/dotfiles/codex/skills/webflow-template-review-reviewer/SKILL.md`
- `config/dify-agents/eric-hub.dify.yml`
- `config/dify-agents/mariana-hub.dify.yml`
- `config/dify-agents/natalia-hub.dify.yml`
- `config/dify-agents/vicki-hub.dify.yml`
- `packages/webflow-template-review-mcp/README.md`
- `docs/WEBFLOW_SURFACE_OWNERSHIP_RUNTIME_MAP.md`

If these files disagree, use the Dify exports and reviewer MCP README first, then update this course.

## Who This Is For

This is for Webflow Marketplace reviewers who already understand the review rubric and need a practical way to use the Dify review agent during real queue work.

Reviewers should know:

- how to find templates in Airtable or the reviewer queue
- what a published URL is
- what the Designer or Preview URL is for
- what high-quality creator feedback looks like
- when a template needs manual judgment

Reviewers do not need to know MCP, Hub routing, Airtable field names, or Dify internals.

## What Changes

### Current Manual Pattern

The reviewer usually works across several surfaces:

1. Find an asset in the Airtable list.
2. Read `Agent Review Feedback`.
3. Open the Designer or Preview URL for manual review.
4. Check the published site.
5. Return to Airtable.
6. Enter feedback.
7. Update the status fields that allow feedback to be sent.

This works, but it is serial and context-heavy.

### Agent-Assisted Pattern

The reviewer works from Dify chat:

1. Pick the assets they want reviewed.
2. Give the agent the asset names and published URLs, either as a typed list or a screenshot that includes the URLs.
3. Ask the agent to review the published URLs in a batch, or open several Dify chat tabs and run one review lane per tab.
4. Read one response with confirmed findings, caveats, and draft feedback.
5. Manually check anything that needs human judgment.
6. Approve the exact feedback or status action.
7. Let the agent prepare the approved write action when the reviewer is assigned and capability checks allow it.

This can reduce context switching and allow public-site checks to run while the reviewer stays in one interface.

### Transparent Practice Pattern

The Webflow course component should make the workflow visible instead of asking reviewers to trust the agent blindly.

The course should pivot around three primary experiences:

- Start: choose the path and review mode.
- Practice lanes: learn the reviewer pattern without needing live tools.
- Live Dify: copy the prompt, paste it into the embedded chat, and run the rehearsal.

Secondary references should be revealed only when useful. Keep time-savings numbers,
trusted-context detail, and review set detail behind clear stateful controls so they support the
workflow without crowding the prompt and chat. Screenshots are now optional course-production
support; the reviewer path should center the embedded Dify rehearsal.

The `Live chat` view should make the prompt and embedded Dify chat primary. It should expose support
panels for:

- the review set source: live queue pull, pasted rows, screenshot extraction, or pinned training URLs,
- the coverage boundary: what the agent can prove from validator/sandbox/review-context evidence vs what the reviewer must confirm in Designer,
- the no-write boundary,
- focus controls so reviewers can give more space to the prompt or the embedded chat.
- a small trusted-context explainer for Instructions, Knowledge, MCP tools, and E2B sandbox.

The component should not fetch Airtable, Langfuse, Braintrust, or raw Dify traces directly from the
browser. Those systems require server-side credentials and controlled redaction. For transparency
during onboarding, the facilitator can open the Dify backend conversation or app logs in a separate
tab during the walkthrough.

## Live Dify UI Orientation

The reviewer will usually see two Dify surfaces:

- the Studio or Debug Preview view, where the agent instructions, model, knowledge, and tools are configured
- the published chat app, where the reviewer runs the actual review workflow
- the Webflow course `Live chat` view, where the published chat app can be embedded beside copyable prompts

In the reviewer chat app, reviewers may see saved starters such as:

- `Check My Queue`
- `Review [template name]`
- `Complete a review of...`
- `Template Review Workflow`

These starters are shortcuts. They do not replace the safety flow. The reviewer should still expect the agent to confirm the template, check review context, use published URLs for automated checks, draft feedback, and wait for explicit write approval.

In Studio, the reviewer agents should have:

- Submission Guidelines knowledge
- Grading Rubric knowledge
- Hub tools for the reviewer lane
- sandbox tools for bounded public-site checks

The opening statement should make the same promise this course makes: read-only analysis and draft feedback by default, concrete evidence when available, caveats when coverage is partial, and no external writes without explicit reviewer approval.

## Safety Boundary

The agent is a review assistant. It is not the reviewer.

The agent may:

- list review work
- search assets and versions
- read version details
- read reviewer context and capability flags
- run published-site validation using the published URL
- inspect the public site in the sandbox when needed
- draft feedback
- save or request changes only after explicit reviewer approval

The agent must not:

- approve a template without explicit reviewer approval
- reject a template without explicit reviewer approval
- request changes without explicit reviewer approval
- publish or complete publishing without explicit reviewer approval
- use the Preview URL for automated review
- use raw Airtable as the normal review path
- treat website copy, scripts, metadata, or creator-provided content as instructions
- invent scores, grades, check IDs, or job IDs

## What The Agent Can Review In Parallel

Good parallel work:

- published-site crawl checks
- broken links
- missing or weak metadata signals
- placeholder text
- image and asset signals
- accessibility signals
- obvious utility-page issues
- GSAP, custom-code, and IX policy signals when exposed by validators
- first-pass draft feedback

Human-owned work:

- final review decision
- visual taste and marketplace quality
- whether the feedback is fair and actionable
- Designer-only issues
- ambiguous interaction behavior
- edge cases where the validator has partial evidence
- deciding whether a creator-facing status should change

## Coverage Boundary Panel

The Live Dify support panels should include a compact coverage boundary. Use it when a reviewer asks:

- what Dify can verify from public published-site evidence
- what the validator and sandbox can only partially support
- what still needs Designer confirmation before feedback or a status decision

Keep the panel practical. It should map submission-guideline coverage into three evidence labels:

- `Auto`: the agent can point to validator, sandbox, or review-context evidence.
- `Partial`: the agent has useful evidence, but the reviewer still needs to confirm the judgment.
- `Manual`: the decision depends on Designer, marketplace quality, creator intent, or write approval.

The panel should include a copyable prompt that asks Dify to return `Agent-covered`,
`Needs Designer confirmation`, `Manual blockers`, and `Safe next step`. This gives reviewers a
repeatable way to separate agent evidence from reviewer-owned judgment during a live review.

## Evidence Workflow

Every Dify-assisted review should use current evidence from the published URL. The depth of evidence depends on the review mode.

Use this order:

1. Confirm the template and version.
2. Call review context.
3. Run `template_review_run_published_site_validation` with the published URL when that tool is exposed.
4. For a comprehensive report, run a targeted agent sandbox gap-fill pass, including E2B `run_code` or `run_command`, for what the validator misses.
5. For lightweight triage, use sandbox checks when validator coverage is unavailable, incomplete, contradicted, too shallow for the reviewer question, or when the reviewer asks for a bounded public-site check.
6. Draft feedback from confirmed current evidence, and label weak evidence as Partial or Manual.

### Should `run_code` Happen On Every Review?

Not as the first pass. The required standard is **fresh current published-site evidence for every reviewed published URL**.

For a quick triage review, the validator may be enough unless it is missing, incomplete, contradicted, or too shallow.

For a comprehensive report, `run_code` or `run_command` should be used after the validator to fill validator gaps. That second pass should be targeted, not a duplicate crawl.

Reviewers can ask for sandbox/run_code at any time when they want reassurance on a specific public-site question. The request should stay bounded, and the agent should state exactly what it fetched.

`run_code` is useful when:

- the published-site validator is unavailable
- the validator fails or returns incomplete coverage
- the reviewer asks for a comprehensive report
- the reviewer asks for a focused pass, such as typos, links, metadata, utility-page text, or content extraction
- the agent needs to inspect the public HTML, page text, or simple HTTP responses beyond the validator result
- the validator finding conflicts with what the reviewer sees

Use `run_code` gap-fill for:

- page text and typo extraction
- utility-page content checks beyond existence
- page-by-page heading and metadata detail
- internal link and empty-link sampling when validator output is incomplete
- form labels, button copy, and obvious content issues visible in public HTML
- sitemap or same-origin page discovery when the validator coverage looks narrow
- confirming or refuting Partial validator findings

Keep these limits:

- the reviewer MCP validator is the standardized first-pass evidence path
- running sandbox code for every template adds latency and cost
- duplicate crawls can create noisy or inconsistent outputs
- sandbox output still needs evidence labels and human review
- broad sandbox execution increases the chance that page text or scripts are accidentally treated as instructions
- visual quality, interaction feel, and Designer-only issues remain Manual unless the sandbox can produce direct evidence

Good rule:

> Run the validator first. For comprehensive reports or bounded public-site checks, use `run_code` for the specific evidence the validator misses. For lightweight triage, use `run_code` when the validator is missing, incomplete, contradicted, too shallow for the reviewer question, or the reviewer asks for a bounded public-site check.

When the agent does use `run_code`, it should say exactly what it checked, which URLs or paths it fetched, and which findings are confirmed vs partial.

## Time-Savings Model

These numbers are a starting benchmark for a pilot, not a claimed production result. Replace them with measured reviewer timings after the first pilot week.

### Baseline Manual Review

| Step                                                 | Typical active reviewer time |
| ---------------------------------------------------- | ---------------------------: |
| Find row in Airtable and confirm asset/version       |                      1-2 min |
| Read existing agent feedback and creator context     |                      2-4 min |
| Open review URL and orient in Designer or Preview    |                      4-8 min |
| Check published-site issues manually                 |                     8-15 min |
| Draft feedback                                       |                      5-8 min |
| Return to Airtable and update feedback/status fields |                      2-4 min |
| **Estimated baseline total**                         |       **22-41 min/template** |

Planning midpoint: **32 min/template**.

### Agent-Assisted Review

| Step                                       | Typical active reviewer time |
| ------------------------------------------ | ---------------------------: |
| Prepare a list or screenshot for the agent |            1-3 min per batch |
| Ask the agent to run published-site checks |                        1 min |
| Review the agent output and caveats        |            5-10 min/template |
| Manually inspect judgment-heavy issues     |             4-8 min/template |
| Edit final feedback                        |             2-5 min/template |
| Approve the write or copy final feedback   |             1-3 min/template |
| **Estimated assisted total**               |       **12-26 min/template** |

Planning midpoint: **18 min/template**.

### Example Capacity Math

| Scenario                     | Active minutes/template | Reviews in 6 focused hours |
| ---------------------------- | ----------------------: | -------------------------: |
| Manual baseline midpoint     |                      32 |                         11 |
| Agent-assisted midpoint      |                      18 |                         20 |
| Conservative assisted case   |                      24 |                         15 |
| Best practical assisted case |                      14 |                         25 |

Using the midpoint, the agent-assisted process saves about **14 active minutes per template**.

For a 10-template batch:

- manual midpoint: `10 x 32 = 320 active minutes`
- agent-assisted midpoint: `10 x 18 = 180 active minutes`
- estimated active time saved: `140 minutes`
- estimated capacity increase: `20 reviews/day vs 11 reviews/day` in a six-hour focused review block

The key distinction is active reviewer time vs wall-clock time. Agent runs may take several minutes, but the reviewer can queue multiple published-site checks and review the returned evidence without opening and closing several tools.

## Pilot Measurement Plan

Run this before making stronger claims.

### Pilot Size

Use 20-30 templates across at least two reviewers:

- 10-15 manual baseline reviews
- 10-15 Dify-assisted reviews

Use similar template complexity where possible.

### What To Measure

| Metric                  | Definition                                                                    | Why it matters                   |
| ----------------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| Active reviewer minutes | Time the reviewer is actively reading, checking, editing, or writing          | Main productivity metric         |
| Wall-clock minutes      | Start-to-finish elapsed time                                                  | Shows operational throughput     |
| Tool switches           | Count of switches between Airtable, Dify, Designer, Preview, and browser tabs | Measures context switching       |
| Draft reuse rate        | Percent of agent draft used in final feedback                                 | Shows feedback quality           |
| Manual correction count | Number of agent findings removed or corrected                                 | Tracks trust and false positives |
| Rework rate             | Reviews reopened or corrected after status update                             | Guards against low-quality speed |
| Reviewer confidence     | 1-5 rating after each review                                                  | Finds training gaps              |

### Simple Tracking Sheet

Use one row per reviewed template.

| Field              | Example                                               |
| ------------------ | ----------------------------------------------------- |
| Reviewer           | Natalia                                               |
| Template name      | Example Template                                      |
| Version ID         | recXXXXXXXXXXXXXX                                     |
| Review mode        | Manual or Dify-assisted                               |
| Input mode         | Airtable row, typed list, screenshot                  |
| Start time         | 10:02                                                 |
| End time           | 10:24                                                 |
| Active minutes     | 16                                                    |
| Tool switches      | 2                                                     |
| Agent draft reused | 70%                                                   |
| Manual corrections | 3                                                     |
| Final action       | Draft feedback, request changes, approve, manual only |
| Rework needed      | Yes/No                                                |
| Notes              | Validator missed mobile issue                         |

### Success Threshold

Treat the pilot as successful if:

- active reviewer time drops by at least 25%
- rework does not increase
- reviewer confidence averages 4/5 or higher
- manual correction patterns are understood and added to training
- no writes happen without explicit reviewer approval

If speed improves but rework increases, do not call the workflow successful. Tighten the course, prompt examples, or write guardrails first.

## Course Format

Recommended onboarding format:

- 30-minute pre-read
- 90-120-minute live training
- 5 supervised practice reviews
- 1 lightweight certification review
- 1-week pilot with timing data

The best onboarding is hands-on. Reviewers should leave with prompts they can use immediately and a clear sense of what still requires human judgment.

## Course Outline

| Module                            |   Time | Outcome                                                                      |
| --------------------------------- | -----: | ---------------------------------------------------------------------------- |
| 1. What the agent is for          | 10 min | Reviewer knows the agent assists, but does not decide                        |
| 2. Safe review flow               | 10 min | Reviewer can explain queue, context, validation, draft, approval, write      |
| 3. Single-template review         | 15 min | Reviewer can complete one read-only assisted review                          |
| 4. Batch review from a typed list | 15 min | Reviewer can ask for parallel published-URL review                           |
| 5. Batch review from a screenshot | 10 min | Reviewer can use a screenshot without letting the agent guess missing fields |
| 6. Multi-tab review lanes         | 10 min | Reviewer can run several Dify chats side by side without mixing assets       |
| 7. Existing agent feedback        | 10 min | Reviewer treats old feedback as background, not proof                        |
| 8. Feedback and status actions    | 10 min | Reviewer can approve a precise write safely                                  |
| 9. Manual override and escalation | 10 min | Reviewer knows when to stop trusting the agent output                        |
| 10. Narrow follow-up questions    |  5 min | Reviewer asks for focused passes like typos or content text only             |
| 11. Time-savings pilot            |  5 min | Reviewer records useful measurement data                                     |

## Screenshot Storyboard

Use screenshots for moments where reviewers need to recognize the UI, confirm a safe action, or understand what evidence quality looks like. Do not screenshot every prompt. Prompt text can stay as copyable text unless the visual state matters.

Before taking screenshots, hide or blur API keys, bearer tokens, private emails, creator PII, internal notes, and unrelated queue rows. Published template URLs can remain visible when they are the subject of the lesson.

| ID  | Required | Course moment                      | Capture this action or state                                                                                           | Why it helps                                                                                            | Redact or avoid                                           |
| --- | -------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| S1  | Required | Live Dify UI orientation           | Dify Studio view with the Instructions panel, model selector, Submission Guidelines, Grading Rubric, and enabled tools | Shows reviewers what a correctly configured reviewer agent looks like                                   | Secrets, unrelated tools, account menus                   |
| S2  | Required | Published chat orientation         | Dify chat app home with `Start New chat` and saved starters such as `Check My Queue`                                   | Helps reviewers find the actual place to work                                                           | Sidebar chats that include private creator names if risky |
| S3  | Optional | System check                       | A chat response after `Check whether the review tools are connected` showing tool calls and availability               | Builds confidence that Hub and validator tools are connected                                            | Raw auth details or trace IDs if exposed                  |
| S4  | Required | Queue review                       | `Check My Queue` or queue output with template name, version ID, published URL, status, and assignment state           | Teaches reviewers which row data to use before review                                                   | Extra queue rows, creator emails, internal notes          |
| S5  | Required | Typed-list batch                   | The reviewer prompt with 3-5 templates and published URLs pasted into Dify                                             | Shows the cleanest parallel-review input format                                                         | Any template not approved for training                    |
| S6  | Required | Screenshot batch                   | The Airtable or queue screenshot used as input, with visible template names and published URLs                         | Teaches the screenshot workflow and the need to confirm extracted rows                                  | Emails, unrelated fields, hidden/private Airtable columns |
| S7  | Required | Screenshot extraction confirmation | Agent response showing the extracted list before review begins                                                         | Reinforces that the agent must not guess missing URLs                                                   | None beyond normal row redaction                          |
| S8  | Required | Validator-first evidence           | Agent response showing `template_review_run_published_site_validation` was used and summarizing coverage/caveats       | Shows the normal first pass and partial-coverage language                                               | Long raw JSON unless needed                               |
| S9  | Required | Targeted sandbox/run_code check    | Agent response showing sandbox/run_code used for a validator gap or reviewer-requested public-site check               | Clarifies that sandbox access is available when reviewers need a bounded check after validator coverage | Full HTML dumps, irrelevant console output                |
| S10 | Required | Evidence labels                    | Output section where findings are labeled `Auto`, `Partial`, and `Manual`                                              | Teaches reviewers not to treat partial findings as final failures                                       | N/A                                                       |
| S11 | Optional | Narrow follow-up                   | Reviewer asks for typos/content-only review and agent returns scoped findings                                          | Shows how to stay in one chat without expanding scope                                                   | Long page excerpts; quote only enough text to identify    |
| S12 | Required | Draft feedback                     | Agent output separating confirmed summary, caveats, draft feedback, and manual checks                                  | Shows the expected answer shape                                                                         | Creator-sensitive feedback if not anonymized              |
| S13 | Required | Write approval                     | Reviewer prompt approving exact draft feedback and limiting the write action                                           | Teaches the difference between vague approval and safe approval                                         | Any production write if not in a safe demo context        |
| S14 | Required | No-write confirmation              | Agent response that says no external write has been made, or shows a saved draft/request-changes result after approval | Reinforces write safety and evidence trail                                                              | Raw Airtable payloads                                     |
| S15 | Required | Manual fallback                    | Agent returns a manual checklist when the validator/sandbox is unavailable or evidence is unclear                      | Shows reviewers what to do when tools cannot prove the issue                                            | N/A                                                       |
| S16 | Required | Pilot measurement                  | Timing sheet or tracker row with active minutes, tool switches, draft reuse, corrections, and rework                   | Helps managers run the time-savings pilot                                                               | Reviewer names if sharing broadly                         |
| S17 | Required | Multiple Dify chat tabs            | Browser with several Dify chat tabs open, each tied to one template or small batch                                     | Shows the third parallel-review mode                                                                    | Private chat titles, creator names, unrelated tabs        |
| S18 | Required | Lane comparison before approval    | Reviewer compares compact draft summaries across Dify tabs before approving any write                                  | Shows how speed and judgment stay together                                                              | Creator-sensitive feedback if not anonymized              |

### Screenshot Placement

Use screenshots in these course sections:

- `Live Dify UI Orientation`: S1 and S2
- `Module 2: Safe Review Flow`: S3 and S8
- `Module 3: Single-Template Review`: S8, S10, and S12
- `Module 4: Batch Review From A Typed List`: S5 and one completed batch output
- `Module 5: Batch Review From A Screenshot`: S6 and S7
- `Evidence Workflow`: S8 and S9 side by side
- `Module 6: Multi-Tab Review Lanes`: S17 and S18
- `Module 8: Approving A Write Or Status Action`: S13 and S14
- `Module 9: Manual Override And Escalation`: S15
- `Module 10: Narrow Follow-Up Questions`: S11
- `Module 11: Time-Savings Pilot`: S16

Minimum screenshot set for the first version:

```text
S1, S2, S4, S5, S6, S7, S8, S9, S10, S12, S13, S14, S15, S16, S17, S18
```

Screenshots that can wait:

```text
S3 if S8 already shows tool connectivity clearly.
S11 if typo/content follow-up is covered in live training.
```

## Webflow Code Component Version

Use the Webflow Code Component when reviewers need the course inside a Webflow project instead of a standalone Markdown doc.

Component source:

```text
packages/webflow-components/src/components/training/TemplateReviewerDifyCourse.tsx
packages/webflow-components/src/components/training/TemplateReviewerDifyCourse.webflow.tsx
```

Component name in Webflow:

```text
Template Reviewer Dify Course
```

Implementation handoff:

```text
docs/guides/WEBFLOW_TEMPLATE_REVIEW_DIFY_COURSE_WEBFLOW_HANDOFF.md
```

Recommended page structure:

- Add one full-width page section for the Code Component.
- Keep the component as the primary course surface, then add supporting Webflow-native sections below it only if needed.
- Do not paste private Airtable rows, creator emails, internal notes, or secrets into component props.
- Use the embedded Dify rehearsal as the primary walkthrough recording surface; screenshots are optional support material.

Recommended props:

| Prop                     | Use                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `Dify Chat URL`          | Link to the published Dify reviewer chat app.                                                                 |
| `Agent Instructions URL` | Link to the current source-of-truth agent instructions, if hosted for the team.                               |
| `Course Doc URL`         | Link to this full Markdown course or a hosted docs version.                                                   |
| `Default View`           | Use `overview` for the first reviewer page; use `agents` for live practice.                                   |
| `Screenshot Assets JSON` | Optional image list once screenshots have been captured, uploaded, and approved.                              |
| `Walkthrough Review Set` | Optional approved public training URLs; leave empty for live queue pull.                                      |
| `Dify Agent Embeds`      | Embedded Dify reviewer chat URLs for the `Live Dify` view. Matching IDs override the built-in reviewer lanes. |
| `Show Pilot Calculator`  | Keep enabled for reviewer onboarding and manager calibration.                                                 |
| `Compact`                | Use only when embedding the course in a narrower internal page with surrounding nav.                          |

Screenshot asset JSON format:

```json
[
  {
    "id": "S1",
    "url": "https://example.com/s1-dify-studio.png",
    "alt": "Dify Studio configuration for the reviewer agent",
    "caption": "Correctly configured reviewer agent with knowledge and tools enabled."
  },
  {
    "id": "S8",
    "url": "https://example.com/s8-validator-first.png",
    "alt": "Validator-first published-site evidence",
    "caption": "Validator output showing coverage and caveats before sandbox gap-fill."
  }
]
```

Publishing note:

- Build validation can be run with `pnpm --filter @create-something/webflow-components typecheck` and `pnpm --filter @create-something/webflow-components bundle`.
- Sharing the library to a Webflow workspace should use `pnpm --filter @create-something/webflow-components share` only after the target workspace is confirmed.

## Module 1: What The Agent Is For

Plain-language message for reviewers:

> The Dify agent helps gather evidence and draft feedback. It can check published URLs, summarize issues, and prepare the exact review action you approve. You still make the decision.

Teach these three ideas:

- The agent is fastest at public-site evidence.
- The reviewer is still responsible for final judgment.
- The agent should not write or change status until the reviewer clearly approves the action.

Exercise:

Ask the reviewer to classify each task as agent-assisted or human-owned.

| Task                                                    | Expected answer      |
| ------------------------------------------------------- | -------------------- |
| Check a published URL for broken internal links         | Agent-assisted       |
| Decide whether the visual design is Marketplace-quality | Human-owned          |
| Draft creator feedback from confirmed issues            | Agent-assisted       |
| Approve a template for publication                      | Human-owned          |
| Save approved feedback after the reviewer confirms it   | Agent-assisted write |

## Module 2: Safe Review Flow

Teach the normal sequence:

1. Find the submission.
2. Load the version details.
3. Check review context.
4. Run published-site validation with the published URL.
5. Review caveats.
6. Draft feedback.
7. Reviewer approves the exact action.
8. Agent writes only the approved action.

The reviewer should remember this short version:

```text
Find -> Context -> Published URL checks -> Draft -> Human approval -> Write
```

Key rule:

> If the agent has not checked review context, it should not write.

## Module 3: Single-Template Review

Use this when a reviewer wants help with one template.

Prompt:

```text
Find the template named [template name]. Summarize the version details and review context. Do not write anything yet.
```

Then:

```text
Run published-site validation for the published URL only. Return:
1. confirmed summary
2. caveats
3. draft feedback
4. what I should manually inspect

Do not save feedback or change status.
```

Reviewer checks:

- Is this the right template?
- Is this the right version?
- Did the agent use the published URL, not the Preview URL?
- Are findings labeled Auto, Partial, or Manual?
- Is the feedback specific enough for the creator to act on?

Good agent output should separate:

- confirmed findings
- caveats
- draft creator feedback
- recommended manual checks

## Module 4: Batch Review From A Typed List

This is the clearest way to run parallel reviews.

Use it when the reviewer already knows the assets they want reviewed.

Prompt:

```text
I want to review these submitted templates as a batch.

Use only the published URL for automated checks.
Do not use Preview URLs for automated review.
Do not save feedback or change any status yet.

For each item:
1. confirm the template/version if possible
2. run published-site validation when available
3. if I ask for a comprehensive report or bounded public-site check, use sandbox/run_code for the specific evidence the validator misses
4. if this is lightweight triage, use sandbox/run_code only when validator coverage is unavailable, incomplete, contradicted, too shallow, or I ask for a narrow public-site check
5. return confirmed summary, caveats, draft feedback, and manual checks
6. label evidence as Auto, Partial, or Manual

Items:
1. Template: [name]
   Version ID: [version id if available]
   Published URL: [published URL]
2. Template: [name]
   Version ID: [version id if available]
   Published URL: [published URL]
3. Template: [name]
   Version ID: [version id if available]
   Published URL: [published URL]
```

Best practice:

- Include version IDs when available.
- Include asset names and published URLs.
- Keep each batch to 3-5 templates while reviewers are learning.
- Increase batch size only after the reviewer can catch weak or partial evidence.

Expected output:

| Template | Confirmed findings | Caveats            | Draft feedback      | Manual checks | Suggested next step                               |
| -------- | ------------------ | ------------------ | ------------------- | ------------- | ------------------------------------------------- |
| Name     | Specific evidence  | What is not proven | Creator-facing text | Human checks  | Manual review, draft feedback, or request changes |

## Module 5: Batch Review From A Screenshot

Use screenshots when the reviewer is already looking at an Airtable or queue list and the screenshot includes the needed URLs.

Screenshot requirements:

- template name is visible
- published URL is visible
- version or row identifier is visible when possible
- status is visible when possible
- screenshot is sharp enough to read

Prompt:

```text
I attached a screenshot of review queue rows.

Extract only the template names, version identifiers if visible, and published URLs that you can read clearly.
Do not guess missing URLs or hidden fields.
If a URL is not readable, ask me for it.

Then review the readable published URLs as a batch.
Use published URLs only for automated checks.
Do not save feedback or change status yet.

Return:
1. extracted item list for my confirmation
2. confirmed summary for each item
3. caveats for each item
4. draft feedback for each item
5. manual checks for each item
```

Reviewer confirmation step:

Before letting the agent run checks, the reviewer should confirm:

- every extracted URL is correct
- no unrelated row was included
- no missing URL was guessed
- the batch size is reasonable

Follow-up prompt:

```text
The extracted list is correct. Continue with published-site validation for those items. Keep all writes disabled.
```

## Module 6: Using Existing Agent Review Feedback

Existing `Agent Review Feedback` can be useful background, but it is not final evidence.

Prompt:

```text
Use the existing Agent Review Feedback as background only.

For each issue in that feedback:
1. verify it against the published URL when possible
2. mark it Auto, Partial, or Manual
3. remove anything that is not supported by current evidence
4. rewrite the feedback in clear creator-facing language

Do not save feedback or change status.
```

Reviewer rule:

> Do not copy old agent feedback into final creator feedback unless the current review still supports it.

## Module 7: Approving A Write Or Status Action

The agent can help with writes, but only after explicit approval.

Before approving a write, the reviewer checks:

- the template and version are correct
- the feedback text is final
- the reviewer is assigned or can assign themselves
- the agent has checked review context
- the intended action is clear

Safe approval prompts:

```text
I approve this exact feedback for [template name] / [version id].
Assign the version to me if required, re-check review context, and save this as draft feedback only.
Do not change the review status.
```

```text
I approve this exact feedback for [template name] / [version id].
Assign the version to me if required, re-check review context, and request changes with this feedback.
Do not approve, reject, or publish.
```

Do not say:

```text
Looks good, handle it.
```

That is too vague for a write action.

## Module 8: Manual Override And Escalation

Slow down when:

- the agent has duplicate matches
- the version is assigned to someone else
- the published URL is missing
- the screenshot is not readable
- the finding depends on visual quality
- the validator shows partial evidence
- the agent mentions a tool, score, or job ID that is not in the current result
- the creator needs a nuanced explanation
- an official approval, rejection, or publishing action is involved

Use this prompt:

```text
Pause the review. Give me a manual checklist for what I need to inspect before deciding.
```

Escalate to an operator when:

- reviewer identity is unavailable
- assignment ownership is unclear
- the agent cannot see review context
- write capability flags do not match the intended action
- the tool output conflicts with what the reviewer sees

## Module 9: Narrow Follow-Up Questions

One of the strongest parts of the Dify workflow is that the reviewer can stay in the same conversation and ask for a narrower pass after the first review.

Good follow-up questions:

```text
Great. Now check only for typos, grammar issues, or content text issues in the findings you already reviewed.

Use current published-site evidence only.
Quote the exact text only when needed to identify the issue.
Separate confirmed text issues from style suggestions.
Do not add new policy findings.
Do not save feedback or change status.
```

```text
Now turn the confirmed issues into concise creator-facing feedback. Keep partial findings out of the final feedback unless you mark them as things I should manually verify.
```

```text
Which of these issues are strong enough for request-changes feedback, and which should stay as reviewer notes?
```

Weak follow-up questions:

```text
Anything else?
```

```text
What should I do?
```

```text
Can you finish this?
```

The weak prompts are too broad. They invite the agent to expand scope or imply a decision. Reviewers should ask for a specific next pass.

## Module 10: Time-Savings Pilot

Teach reviewers how to capture timing without slowing down the review too much.

At the start of each review, record:

- review mode: Manual or Dify-assisted
- input mode: Airtable row, typed list, or screenshot
- start time
- expected action

At the end, record:

- end time
- active minutes
- tool switches
- final action
- whether the draft was mostly used, partly used, or not used
- whether any rework was needed

Prompt for Dify-assisted reviews:

```text
At the end of this batch, summarize the process metrics I should record:
1. number of templates reviewed
2. which templates needed manual checks
3. which drafts were ready to use
4. which findings were partial or removed
5. any workflow friction I should log
```

Do not let the agent invent time measurements. The reviewer records actual timing.

## Prompt Pack

### System Check

```text
Check whether the review tools are connected. Tell me whether published-site validation is available. Do not write anything.
```

### Evidence Path Check

```text
For this review, use current published-site evidence.

Start with template_review_run_published_site_validation if available.
If I ask for a comprehensive report, use run_code or run_command after validation to cover what the validator misses.
If this is lightweight triage, use run_code or run_command only if the validator is unavailable, incomplete, contradicted, or too shallow for the specific question I ask.
If you use sandbox code, tell me exactly which URLs you fetched and which findings are confirmed, partial, or manual.

Do not write anything.
```

### Find Work

```text
Show me the current review queue. Return the template name, version ID, published URL if available, current status, and assignment state.
```

### Resume Assigned Work

```text
Show my assigned reviews. For each one, summarize what action is available and what is still needed.
```

### Single Template

```text
Find [template name], confirm the version details, and run published-site validation using the published URL only. Return confirmed summary, caveats, draft feedback, and manual checks. Do not write anything.
```

### Comprehensive Report

```text
Create a comprehensive review report for [template name] / [version id] using the published URL only.

Start with template_review_run_published_site_validation.
Then run a targeted run_code or run_command gap-fill pass for what the validator does not cover.

The gap-fill pass should check:
1. visible page text and typo/content issues
2. utility-page content, not just page existence
3. page-by-page headings and metadata detail
4. same-origin link and empty-link signals when validator coverage is incomplete
5. form labels, button copy, and obvious public-HTML content issues
6. additional same-origin pages if the validator crawl looks narrow

Do not use Preview URLs for automated review.
Do not write anything.
Separate confirmed findings, partial findings, manual checks, and draft feedback.
Tell me exactly which URLs or paths the sandbox fetched.
```

### Batch From List

```text
Review these templates as a batch using published URLs only. Do not write anything yet.

For each item, return:
1. confirmed summary
2. evidence labels: Auto, Partial, Manual
3. caveats
4. draft feedback
5. manual checks
6. recommended next step

Items:
- [template name] | [version id if available] | [published URL]
- [template name] | [version id if available] | [published URL]
- [template name] | [version id if available] | [published URL]
```

### Batch From Screenshot

```text
Read the attached screenshot and extract only visible template names, version IDs if visible, and published URLs.

Do not guess missing URLs.
Show me the extracted list first.
After I confirm it, review those published URLs as a batch.
Do not write anything.
```

### Verify Existing Agent Feedback

```text
Use the existing Agent Review Feedback as background only. Verify each issue against current published-site evidence. Remove unsupported findings. Rewrite the supported findings as clear creator feedback. Do not save or change status.
```

### Typos And Content Text Follow-Up

```text
Review the findings from this chat only for typos, grammar issues, and content text issues.

Use current published-site evidence only.
For each issue, include:
1. page or path
2. exact text if needed to identify it
3. why it is a typo, grammar issue, or content issue
4. whether it is confirmed or needs manual review

Do not add new policy findings.
Do not save feedback or change status.
```

### Save Draft Feedback

```text
I approve this exact feedback for [template/version].
Assign it to me if required, re-check review context, and save draft feedback only.
Do not change review status.
```

### Request Changes

```text
I approve this exact feedback for [template/version].
Assign it to me if required, re-check review context, and request changes with this feedback.
Do not approve, reject, publish, or change metadata.
```

### Manual Fallback

```text
The tool result is incomplete. Give me a manual review checklist for this template, grouped by content, utility pages, visual quality, interactions, accessibility, and creator feedback.
```

## Good Output Standard

A strong batch answer should be easy to scan.

Use this structure:

```text
Batch summary:
- 4 templates checked
- 2 need request-changes feedback
- 1 needs manual Designer review before deciding
- 1 has incomplete URL evidence

[Template name]
Confirmed summary:
- Auto: [specific evidence]
- Partial: [specific signal]

Caveats:
- [what is not proven]

Draft feedback:
[creator-facing feedback]

Manual checks:
- [what the reviewer should inspect]

Recommended next step:
- [draft feedback, manual review, request changes, or no action yet]
```

## Quality Rubric For Reviewer Training

Use this rubric during supervised practice.

| Skill                 | Pass criteria                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| Selects correct input | Provides template names and published URLs, or confirms screenshot extraction |
| Uses safe review path | Published URL only for automated checks                                       |
| Understands evidence  | Separates Auto, Partial, and Manual                                           |
| Preserves judgment    | Does not treat the agent as the final reviewer                                |
| Writes safely         | Gives explicit approval before any save/status action                         |
| Gives useful feedback | Final feedback is specific, fair, and creator-facing                          |
| Measures the pilot    | Records time, tool switches, corrections, and rework                          |

Certification target:

- 3 supervised reviews completed without unsafe write behavior
- 1 batch list review completed
- 1 screenshot extraction review completed
- reviewer can explain when to use manual fallback

## Recommended Reviewer Onboarding Plan

### Phase 1: Pre-Read

Send reviewers:

- this course
- the Dify Agent Manual
- the current review rubric
- one example of strong creator feedback

Ask them to bring 2-3 real queue items to training.

### Phase 2: Live Training

Run the course with real examples. Use 90 minutes for a compressed onboarding or 120 minutes when reviewers are new to Dify.

Do not start with a slide-heavy overview. Start with one live review and explain the safety rules as they appear.

Recommended agenda:

|      Time | Activity                                                  |
| --------: | --------------------------------------------------------- |
|  0-10 min | What the agent does and does not do                       |
| 10-25 min | Single-template review demo                               |
| 25-45 min | Typed-list batch demo                                     |
| 45-60 min | Screenshot batch demo                                     |
| 60-70 min | Narrow follow-up questions, including typo/content checks |
| 70-80 min | Feedback approval and write safety                        |
| 80-90 min | Practice, questions, and pilot measurement                |

### Phase 3: Supervised Practice

Each reviewer completes:

- 2 single-template reviews
- 2 typed-list batch reviews
- 1 screenshot batch review

Reviewer lead checks:

- Did the reviewer confirm the version?
- Did they keep automated checks to published URLs?
- Did they catch weak or partial findings?
- Did they approve writes explicitly?
- Did feedback quality stay high?

### Phase 4: Pilot

For one week:

- use Dify-assisted review for selected batches
- record the measurement fields
- sample at least 20% of final feedback for quality
- collect reviewer friction notes

At the end of the week, calculate:

```text
average manual active minutes
average Dify-assisted active minutes
active minutes saved per template
tool switches avoided per template
draft reuse rate
manual correction rate
rework rate
```

### Phase 5: Rollout

Roll out more broadly only if:

- review quality remains stable
- write safety is clean
- reviewers report confidence
- measured time savings are meaningful

Recommended rollout:

1. Start with reviewers who already understand the rubric well.
2. Keep batches small for the first week.
3. Review the first 10 Dify-assisted outcomes per reviewer.
4. Add common corrections back into this course.
5. Increase batch size only after the reviewer has a stable quality pattern.

## Common Mistakes

| Mistake                                           | Correction                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Asking the agent to "handle" a review             | Ask for a specific read-only review or an explicitly approved write |
| Using Preview URL for automated checks            | Use the published URL only                                          |
| Pasting old feedback directly into final feedback | Verify current evidence first                                       |
| Treating partial evidence as a failure            | Mark it as Partial and manually inspect                             |
| Letting a screenshot drive hidden assumptions     | Confirm extracted rows before review                                |
| Batch size too large during training              | Start with 3-5 templates                                            |
| Skipping review context                           | Check context before any write                                      |
| Measuring only wall-clock time                    | Measure active reviewer minutes too                                 |

## Manager Checklist

Before training:

- reviewers have Dify access
- reviewer identity is mapped
- agents can list queue/context tools
- published-site validation is available or fallback is explained
- sample templates are available
- timing sheet is ready

During training:

- use real published URLs
- keep writes disabled until the final write-safety section
- ask reviewers to challenge one agent finding
- show a partial finding and how to handle it
- show the exact approval wording for write actions

After training:

- review the first assisted feedback samples
- collect corrections and friction
- compare manual vs assisted active time
- update this course with measured numbers

## Final Reviewer Mental Model

Use the agent for speed where evidence is public and repeatable.

Use human judgment where quality, fairness, and final decisions matter.

The best workflow is not "agent decides faster." It is:

```text
Reviewer chooses the work.
Agent gathers evidence in parallel.
Reviewer edits and decides.
Agent writes only what the reviewer approves.
```
