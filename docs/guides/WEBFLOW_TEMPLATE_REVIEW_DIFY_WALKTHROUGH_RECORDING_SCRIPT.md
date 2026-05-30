# Webflow Template Review Dify Walkthrough Recording Script

Use this to record the reviewer walkthrough for the Webflow Dify course component.

Target length: 10-12 minutes.

Optional:

- Add 60-90 seconds to show Dify backend conversation logs.
- Add 2-3 minutes for the time-savings pilot if the audience includes leads.

## Voice Direction

Sound like a helpful reviewer showing another reviewer a better way to work.

Use:

- clear language
- confident, practical explanations
- short transitions
- reviewer-centered phrasing
- concrete actions on screen

Avoid:

- sounding like a policy readout
- overexplaining tools
- making Dify feel like the decision-maker
- reading every module out loud

The main message: move faster, keep the judgment.

## Setup

Open these before recording:

- The Webflow course page.
- The Dify chat for the reviewer agent you want to show.
- Optional: the Dify backend conversation log page for a quick transparency moment.
- Optional: a redacted queue screenshot or approved training rows.

Do not show creator emails, private Airtable notes, API keys, bearer tokens, hidden prompts, raw traces, or private system details.

## 10-Minute Walkthrough

### 0:00-0:45 - Start With The Shift

**Show:** Start view.

**Say:**

This walkthrough shows the new review motion. Instead of opening one template, checking one site, going back to Airtable, and repeating that over and over, we can give Dify a clear set of templates and let it gather evidence in parallel.

The reviewer still makes the call. Dify helps with the evidence, the caveats, and the first draft.

**Action prompts:**

- Click `Start`.
- Point to `Run reviews in parallel`.
- Say: "The unlock is parallel review, not automated approval."

### 0:45-1:45 - Set The Boundary

**Show:** Practice lanes, module 1.

**Say:**

Before we ask Dify to review anything, we make the role clear. Dify can gather evidence, run the published-site validator, use sandbox checks when we ask for a specific gap, and draft feedback.

It does not approve, reject, request changes, save feedback, change status, or publish unless the reviewer approves that exact action.

**Action prompts:**

- Click `Practice lanes`.
- Open `Let Dify gather the evidence`.
- Point to the role-card prompt.

**Prompt to show:**

```text
Before we start, give me a short role card for this review workflow. Use only these headings: Can help with, Needs my approval, Evidence order, Sandbox/run_code use. Keep it under 120 words. Keep this read-only. Do not write feedback or change status.
```

### 1:45-2:45 - Show How The Course Builds

**Show:** Practice lanes module list.

**Say:**

The modules build a repeatable pattern. First, set the role. Then confirm the review set. Then reuse the same evidence shape for one URL, a typed list, a screenshot batch, or several chat tabs.

You do not need to memorize the whole course. The goal is to know which prompt to use when the review changes shape.

**Action prompts:**

- Click module 2, `Keep control at speed`.
- Click module 4, `Typed-list batch`.
- Click module 6, `Multi-tab review lanes`.
- Keep this fast. Do not read every module.

### 2:45-3:30 - Explain The Three Parallel Modes

**Show:** Start view or the relevant module cards.

**Say:**

There are three practical ways to run parallel reviews.

First, paste a typed list of templates and published URLs into one chat. That is best when the queue rows are clean.

Second, upload a screenshot of the queue when the published URLs are visible. Dify extracts the rows first, and you confirm them before review starts.

Third, open several Dify chats in different tabs. That is best when you want true side-by-side lanes.

**Action prompts:**

- Point to typed batch.
- Point to screenshot batch.
- Point to multi-tab lanes.
- Say: "Published URLs are the automated review input. Preview URLs are for reviewer confirmation."

### 3:30-4:30 - Open Live Dify

**Show:** Live Dify view.

**Say:**

Now we move from learning the pattern to practicing it. Choose the reviewer agent, keep the prompt and chat together, and copy one walkthrough prompt.

This page is meant to keep the workspace simple: prompt on one side, Dify on the other.

**Action prompts:**

- Click `Live Dify`.
- Choose `ERIC HUB`, `NATALIA HUB`, `MARIANA HUB`, or `VICKI HUB`.
- Keep the view on `Split`.
- Click `Copy walkthrough prompt`.

### 4:30-6:00 - Paste The Walkthrough Prompt

**Show:** Embedded Dify chat.

**Say:**

This prompt asks Dify to start read-only. It either pulls a few review-ready rows or uses the training rows on the page. Either way, it must show the rows first and wait for us to confirm the set.

That pause is important. We do not want Dify guessing which template to review.

**Action prompts:**

- Paste the prompt into Dify.
- Send it.
- Wait for rows, or let Dify ask for pasted rows or a queue screenshot.

**Walkthrough prompt:**

```text
Pull up to 3 review-ready submissions from the review queue or Airtable-backed review tools for a training walkthrough. Start read-only. Only use rows that include a template name, version ID, current review status, and published URL. Show me the rows first and wait for my confirmation before reviewing. After I confirm, review the published URLs in parallel with validator evidence first. Use targeted sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return grouped draft feedback per template. If queue tools are unavailable, ask me to paste rows or upload a queue screenshot. Do not write feedback or change status.
```

### 6:00-7:00 - Confirm The Rows

**Show:** Dify response with rows.

**Say:**

Now we check the row list. We want a template name, version ID, review status, and published URL. If this came from a screenshot, this is where we catch extraction mistakes.

Once the rows look right, we confirm the review set and ask Dify to run the evidence pass.

**Action prompts:**

- Point to template name.
- Point to version ID.
- Point to published URL.
- If needed, correct one row out loud.
- Paste the confirmation prompt.

**Confirmation prompt:**

```text
Confirmed. Review these rows read-only. Use published-site validator evidence first. Use sandbox/run_code only for bounded gaps or if validator coverage is incomplete. Return grouped findings, caveats, manual checks, and draft feedback per template. Do not write feedback or change status.
```

### 7:00-8:15 - Watch The Evidence Pass

**Show:** Dify response while it runs, or the completed response.

**Say:**

This is the evidence order we want to see: confirm the submission, load review context, run the published-site validator first, then use sandbox or run_code only when there is a specific gap.

Reviewers can ask for sandbox checks whenever they need reassurance. The key is to keep the request bounded.

**Action prompts:**

- Switch to `Chat` view if the response needs more room.
- Point to validator evidence.
- Point to caveats.
- Point to manual checks.

**Bounded follow-up prompt:**

```text
Use sandbox/run_code only for a bounded public-site check: inspect the published URL for visible typo or placeholder copy issues. State exactly which URLs or paths you fetched, and label each finding Auto, Partial, or Manual.
```

### 8:15-9:15 - Review The Draft

**Show:** Grouped draft feedback.

**Say:**

Now we read like reviewers. What can Dify prove? What needs a manual check? And is the draft feedback clear enough for a creator to act on?

If the evidence is partial, the feedback should say that. If something requires Designer judgment, it stays manual.

**Action prompts:**

- Point to one confirmed finding.
- Point to one caveat.
- Point to the draft feedback.
- Ask for a cleaner creator-facing version if needed.

**Polish prompt:**

```text
Rewrite the draft feedback so it is specific, helpful, and creator-facing. Preserve the evidence and caveats. Do not write or change status. Wait for my exact approval.
```

### 9:15-10:15 - Make Approval Explicit

**Show:** Module 8 or the Dify draft.

**Say:**

This is the part to be precise about. A good draft is not permission to write. If we want Dify to save feedback or request changes, we approve the exact action.

Dify should confirm what it changed and what it did not change.

**Action prompts:**

- Open `Approve Webflow-ready feedback` if you want the practice version.
- Do not perform a live write unless this is approved test data.
- Point to the exact-approval language.

**Safe demo prompt:**

```text
Use this exact draft feedback and write only to the approved review feedback field for this version. Do not change status unless I explicitly say so. Confirm what was written and what was not changed.
```

### 10:15-11:15 - Optional Trust Moment

**Show:** Dify backend conversation logs in a separate tab.

**Say:**

One way we build trust is by showing that these chats are logged. We are not embedding raw logs in the course because they can include private context, but during onboarding we can show the backend conversation view and confirm the workflow is auditable.

**Action prompts:**

- Open the selected Dify agent's backend conversation or app log view.
- Show that the current chat exists.
- Do not show private prompts, secrets, trace payloads, or creator-private data.
- Return to the course page.

### 11:15-12:00 - Close With The Reviewer Rule

**Show:** Live Dify or Start view.

**Say:**

The reviewer rule is simple: move faster, keep the judgment.

Give Dify the review set. Let it gather evidence in parallel. Compare the drafts. Ask for a bounded sandbox check when evidence is thin. Approve only the exact action you can stand behind.

**Action prompts:**

- End on a clean course view.
- Avoid ending on private rows or backend logs.

## Short Version

Use this if the recording needs to stay under 6 minutes.

1. Open with: "The unlock is parallel review, not automated approval."
2. Show the role boundary in Practice lanes.
3. Open Live Dify.
4. Choose the reviewer agent.
5. Copy the walkthrough prompt.
6. Paste it into Dify.
7. Confirm the returned rows.
8. Ask Dify to run validator-first review.
9. Show confirmed findings, caveats, and draft feedback.
10. Close with: "Move faster. Keep the judgment."

## Backup Prompts

### Typed List Review

```text
Using the same evidence shape from the single-lane review, review these templates in parallel from their published URLs. For each item, use validator evidence first. Use sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return separate draft feedback with evidence labels.
```

### Screenshot Extraction

```text
Extract the template names and published URLs from this screenshot so we can use the same batch-review structure. Show me the extracted list first. Do not review anything until I confirm the list.
```

### Multi-Tab Lane

```text
I am running this chat as one lane in a parallel review, using the same single-lane evidence shape. Review only this template from the published URL below. Use validator evidence first. Use targeted sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return a compact lane summary with confirmed findings, caveats, manual checks, and draft feedback. Do not write or change status.
```

### Go Manual

```text
Based on the caveats or Partial/Manual findings above, stop the tool attempts if the current tools cannot prove the issue. Return a manual checklist that says what could not be verified, what I should inspect in Designer or the public URL, and what evidence would be needed before writing feedback.
```

## Recording Checklist

- The selected reviewer agent is correct.
- The prompt is visible before paste.
- The row confirmation step is shown.
- Validator-first evidence is mentioned.
- Sandbox/run_code is framed as targeted gap-fill.
- Draft feedback stays reviewer-owned.
- No live write action happens unless using approved test data.
- Dify backend logs are optional and shown only in a separate tab.
- Private data is redacted or avoided.
