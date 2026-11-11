---
name: link-doc-anchors
kind: function
version: 0.1.0
---

# Link Doc Anchors

> Turns anchor text in the week's section into links in one batch of
> text-style updates, then verifies every linked run equals its anchor.

### Parameters

- `doc_id`: the notes document id.
- `anchors`: list of `{ text, url, must_contain? }`; `must_contain` picks the
  paragraph when the anchor text occurs more than once in the section.
- `section`: `{ start, end }` from `write-doc-blocks`.

### Returns

- `result`: `{ expected, verified, missing: [{ text, hits }], revision_id }`.
- if an anchor occurs zero or more than once after `must_contain`: it is
  skipped and listed in `missing`; the batch still runs for the rest.

### Invariants

- One `updateTextStyle { range, textStyle: { link: { url } }, fields: "link" }`
  per anchor; text-style updates never move indexes, so order is irrelevant.
- Range = paragraph `startIndex` + UTF-16 offset of the anchor in the
  paragraph text; length in UTF-16 units.
- Verification is a fresh GET with the link mask and an exact match of every
  linked run's text and url inside the section; extra linked runs inside the
  section that no anchor explains are reported.
- URL patterns: Zendesk
  `https://<zendesk-subdomain>.zendesk.com/agent/tickets/<id>`; Slack
  `https://<slack-workspace>.slack.com/archives/<C…>/p<ts-without-dot>`;
  Airtable `https://airtable.com/<MARKETPLACE_BASE_ID>/<tbl>/<rec>`; GitHub
  `https://github.com/webflow/webflow/pull/<n>`; Jira
  `https://webflow.atlassian.net/browse/<KEY>`; templates
  `https://webflow.com/templates/html/<adminDetailPagePath slug>`; apps
  `https://webflow.com/apps/detail/<slug>`.
- Anchors whose only source is a private DM are refused.

### Shape

- `self`: resolve, batch, verify.
- `prohibited`: inserting or deleting text; linking outside the section.
