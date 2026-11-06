---
name: resolve-open-items
kind: function
version: 0.1.0
---

# Resolve Open Items

> The follow-up pass the operator asks for after the notes are in: "any open
> items we can resolve?" Checks each open item against its primary system,
> closes the ones that only needed a verification or an internal write, stages
> exact text for anything that would reach a creator, developer or shared
> channel, and names an owner for the rest.

### Parameters

- `open_items`: every discussion bullet and every "owed" or "still open"
  phrase from this week's section, each with the system it lives in.
- `doc_id`: the notes document id, so resolved items can be corrected in
  place.
- `operator_present`: true when the operator is in the chat and can give a go.

### Returns

- `result`: three lists.
  - `resolved_by_verification`: `{ item, evidence, doc_correction }` for items
    a read closed (a curl of the live listing, a record read, an automation
    script read). The doc line is corrected in place and the evidence is
    screenshotted when a screenshot would help the meeting.
  - `closed_by_internal_write`: `{ item, write, record_or_action_id,
    screenshot }` for writes only the review team sees: an exception row, an
    automation draft, a checklist tick, a doc correction.
  - `staged_for_go`: `{ item, channel, exact_text, send_tool }` for anything
    creator-facing, developer-facing or posted to a shared Slack channel.
    Nothing in this list is sent by this function.
  - `needs_someone_else`: `{ item, owner, why }`.
- if an item's resolution depends on a system that is not connected (for
  example the App Review MCP): it is checked through the fallback named in
  `review-week-collected` or listed under `needs_someone_else` with the
  reason.

### Invariants

- Verification before closure: a carry-over is marked resolved only on
  evidence from the primary system, dated today.
- No creator-facing or developer-facing send, no post to a shared Slack
  channel, no Zendesk reply, no changes request, no approval leaves this
  function. Those are staged as exact text and wait for the operator's go,
  and the operator's standing rule is that Slack drafts are shown in full
  first.
- Airtable automation edits are made to the draft through the MCP and
  published with the Update button in the UI through ego-browser, with a
  screenshot of the published step. The revert action id is recorded.
- Exception rows follow the ⚖️Exceptions field map: title, asset link,
  version link, status 🆕Requested, type, rationale, requested by, requested
  at. The intake-hold automation is expected to place the version On Hold
  and post to the exceptions channel; the function checks both and
  screenshots the row and the post.
- Doc corrections go through `write-doc-blocks` in refresh mode and
  `link-doc-anchors`, with the same placement and link verification.

### Strategies

- Read before you decide: the automation script may already contain the line
  the discussion bullet asks for (the approval email's Stripe line did), the
  live listing may already prove the install URL works (AccessBit did), and
  a version may already have moved (Monotype landed the same evening).
- When a creator-facing message is staged, write it in the team's voice:
  thank, state the item, say exactly what to change, say what happens next.
  No "please" on required changes for apps; templates keep the softer form.
- A Slack reply to a support agent's triage question answers the agent, not
  the creator, and skips ticket links and emails.

### Shape

- `self`: verify, write internal, stage external, assign owners, correct the
  doc.
- `delegates`: `write-doc-blocks`, `link-doc-anchors`,
  `capture-evidence-screenshots`.
- `prohibited`: any external send; any approval or rejection; editing a
  record's review status.
