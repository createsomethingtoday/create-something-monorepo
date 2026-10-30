# app-owner-sync

Daily sync of Marketplace app ownership from Webflow (Snowflake `OAUTH_APPLICATIONS` + workspace owners) into the review base, so the submission form's ownership rule (`wf-app-form-cloud` `lib/submissionOwnership.js`) stays correct after app transfers and has creator identity to fall back on.

Writes, only when the live value differs or the field is empty:

| Table | Field | Written when |
|---|---|---|
| 👛Assets | 👀🔄Workspace ID (Override) | live owner workspace ≠ rollup/override |
| 👛Assets | 👀🎨📧 Creator WF Account Email (Override) | the field holds a non-email (URL) |
| 🎨Creators | 🔑WF User ID | empty |
| 🎨Creators | 📧WF Account Email | empty |

Creator fields come from the workspace that owns most of that creator's apps; even ties are skipped and listed under `conflicts` in the run plan. Apps whose client ID is no longer registered are listed under `unmatched` and untouched.

Run: `./run.sh` (dry run, writes `runs/plan-*.json`) or `./run.sh --execute`. Backfill 2026-10-26: 20 workspace overrides, 122 email-override fixes, 589 creator user ids, 550 creator emails.
