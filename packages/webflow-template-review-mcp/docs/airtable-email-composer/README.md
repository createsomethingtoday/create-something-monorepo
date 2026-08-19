# Airtable Review-Email Composer: HTML-Escaping Fix + Rejection Copy Update

## The bug

The Zendesk review emails are composed by custom scripts inside the Airtable
automation **🖌️Review Status Trigger** (`wflHI29nzYv35Wtd0`) in the
**👛Marketplace Assets** base (`appMoIgXMTTTNIc3p`). The scripts convert the
`📝Review Feedback` / rejection-feedback rich-text fields to HTML with a custom
`markdownToHTML()` that never escapes HTML special characters.

When a reviewer's feedback contains a literal tag — e.g.
`` A `<script type="application/ld+json">` block now appears on every page `` —
the raw `<script>` tag lands in the email HTML. Zendesk's sanitizer strips the
tag **and everything after it**, silently truncating the email.

**Observed incident (2026-08-08):** Onart / Templout, Zendesk ticket 1170959.
The "Changes Requested" email cut off mid-item-1; item 2 ("Link the
Instructions page") was never delivered. Creator escalated via the community
("Incomplete Review Feedback", Marketplace Creators, 2026-08-08).

**Second incident (2026-07-30, found 2026-08-10):** Wistia, Zendesk ticket
1170775. The "Version Rejected" email cut off mid-item-2 at a literal
`<script>` reference; Shea re-sent the full feedback manually. Wistia's
follow-up feedback on the rejection comms drove the copy changes below
(relayed by Paige Conrad, #wg-app-marketplace, 2026-08-10).

## The fix

Two script actions need their code replaced (paste-in):

| Script action | Patched file |
|---|---|
| Notifications: Changes Requested | `notifications-changes-requested.patched.js` |
| Notifications: Version Rejected | `notifications-version-rejected.patched.js` |

What changed in each (everything else is byte-identical to the deployed code):

1. New `escapeHTML()` helper (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`).
2. `markdownToHTML()` escapes its input **first**; all tags it emits are
   generated from markdown, never passed through.
3. Inline code support: `` `x` `` → `<code>x</code>` (after escaping, so
   `` `<script>` `` renders as visible code — what reviewers intend).
4. Changes-Requested only: the `<https://…>` autolink regex updated to match
   the escaped form (`&lt;https://…&gt;`).
5. Improvement-areas list items are escaped with the same helper.

Version-Rejected only — copy changes from Wistia's feedback on rejection
comms (approved by Paige Conrad, 2026-08-10):

6. Intro: "your submission fell below our quality standards" → "your
   submission needs the following update(s) in order to meet our quality
   standards".
7. Outro now branches by asset type: Apps get "Once you've addressed the
   required feedback necessary for approval, please submit a new bundle for
   review." The existing "submit a new asset / do not resubmit the same
   asset" outro (template-oriented, reads as a permanent rejection) is kept
   for all other asset types.

## How to apply

The Airtable API treats `customScript` nodes as read-only, so this cannot be
pushed programmatically — it must be pasted in the UI:

1. Open <https://airtable.com/appMoIgXMTTTNIc3p/workflows/wflHI29nzYv35Wtd0>
2. Find the branch for **Changes Requested** → script action
   "Notifications: Changes Requested" → replace the code with
   `notifications-changes-requested.patched.js`.
3. Find the branch for **Rejected** → script action
   "Notifications: Version Rejected" → replace the code with
   `notifications-version-rejected.patched.js`.
4. Click **Update** to publish the automation.

## Verification performed (2026-08-10)

The patched `markdownToHTML()` was run against the exact feedback that
truncated the Onart email:

- no raw `<script` in output; renders as `<code>&lt;script type="application/ld+json"&gt;</code>`
- item 2 present in output
- `**bold**`, `[text](url)`, `<https://…>` autolinks, and list handling unchanged

## Defense in depth

`template_review_save_draft_feedback` / `template_review_update_version_review`
in this package reject feedback containing raw HTML tags at save time (see
`src/validation.ts`), so drafts that would truncate never reach the composer.
The composer fix makes the escaping correct regardless of the entry path
(reviewers typing directly into Airtable bypass the MCP guard).
