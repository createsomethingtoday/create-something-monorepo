# Runbook — Template submission with no linked creator

**Status (2026-10-06):** the root cause is fixed in the ingestion script, and the cases it
can't fix now raise an alert. This runbook covers the cases that still need a human:
an email nobody owns, an email shared by two Creator records, and records orphaned
before the fix.

**What the creator reports:** "I submitted my template, got a processing receipt, but it
isn't in my Asset Dashboard and I never got a review email."

**What ops sees:** an Asset Version with `📝Review Status` =
`🚨Error: Field Missing (Email, Type, etc.)`, an Asset in `1️⃣Upcoming🆕` with an empty
`🎨Creator`, and no Zendesk thread. The SLA keeps running while nobody owns it. Since
2026-10-06, an alert also lands in `#triage-marketplace-templates`.

Base: `appMoIgXMTTTNIc3p` (👛Marketplace Assets).

---

## 1. What changed on 2026-10-05/06

| # | Fix | Where | State |
|---|---|---|---|
| 1 | When the submitted email isn't linked to a Creator, look the Creator up by `📧Email` **or** `📧WF Account Email`. Link the 📧Emails row and give it a type (`WF Account` or `Other`, never `Primary`). | Automation `wflrLKII59WwoyKbW`, branch "Marketplace Template Submission", node `wacVknQRDzBrZHl3A` (Asset Ingestion Script) | Live |
| 1b | If several 📧Emails rows share the address, pick the one linked to a Creator instead of crashing. Before this, `upsert()` returned an empty id and the script crashed on `selectRecordAsync('')`. | Same node | Live |
| 2 | Don't guess. With 0 or 2+ matching Creators, still create the Asset (the submission isn't lost), leave `🎨Creator` empty, and set the script output `creatorErr` to the reason. | Same node | Live |
| 3 | At creator signup, create or link a 📧Emails row for `📧WF Account Email`, typed `WF Account`. It never re-links a row that belongs to another Creator. | Same automation, branch "Marketplace Creator Submission", node `wac4eurISiryceKnz` (Attach Profile Image) | Live |
| 4 | Write `Submission receipt: <id>` into the asset's ℹ️Notes, so a receipt a creator quotes can be found in Airtable. | `webflow-template-submission-form`, `app/api/intake/template/route.ts` (PR #25) | Live |
| 5 | The confirmation copy says support can trace the receipt. | Same app | Already true: the form saves every submission in D1 under the receipt before handing it to Airtable |
| 6 | Alert `#triage-marketplace-templates` when a template Asset is created with no Creator. | Automation `wflN0CNuHq3B2pobO` | Live |

Also removed on 2026-10-06: the "Send Template Onboarding Email" step in the creator
branch. It posted to an Iterable relay Zap that was turned off during the 2026-09-25
Knock migration, so every creator signup failed at that step. No Iterable journey sent
an email on that event, so no creator-facing email was lost.

Airtable script nodes can't be edited through the API (`update_automation` rejects
`customScript` nodes). Each change above was made in the UI script editor, checked
against the API (draft == patched script), and then published with **Update**.

---

## 2. Root cause (before the fix)

The ingestion script found the Creator **only** through the submitted email's 📧Emails →
🎨Creators link. Creator onboarding only ever linked the **Primary** email. So when a
creator submitted with their Webflow account email:

1. `upsert()` on 📧Emails found no row and created one with no 🎨Creators link.
2. `creatorRecord` was `null`, and the `if` branch was an empty
   `// Creator creation is deprecated` comment. **No error was raised.**
3. The Asset was created with `🎨Creator` empty.

Every downstream symptom follows from that empty link:

| Effect | Mechanism |
|---|---|
| Version flips to `🚨Error: Field Missing` | `🎨📧 Creator Email` and Type are rollups **through** `🎨Creator` |
| No review email, no Zendesk thread | The ZD-thread automation fires on `🆕Ready for Review`, which the version never reaches |
| Not in the Asset Dashboard | The dashboard lists assets by creator email, through `🎨Creator` |
| Creator only sees a "processing" receipt | The receipt lookup matches on creator email, through `🎨Creator` |
| SLA silently runs over | Nobody is assigned |

---

## 3. Detection

**Alert (live):** automation `wflN0CNuHq3B2pobO` posts to `#triage-marketplace-templates`
when an Asset *newly* matches all of these: `#️⃣🎨Creators` = 0, `🥞CMS Status` =
Active, and Type contains "Template". It doesn't fire for records that already matched
when it was switched on.

**Backlog query:** 👛Assets (`tblRwzpWoLgE9MrUm`) where `#️⃣🎨Creators`
(`fldn7X8GbeEjIRkEw`) = 0. The status query (Asset Versions `tblHxZ2hgSFLZxsZu`,
`📝Review Status` `flde8Huk5NRIdm2wZ` = `🚨Error: Field Missing`) returns ~500 rows,
mostly legacy noise. Narrow it with `📝Review Type` (`fldjYFJMGTerFYlol`) = `New Asset`
and an Asset link.

**Why it still happens after the fix:** the script's `creatorErr` output says which case:
- `no creator for <email>`: the email isn't on any Creator. Usually a new creator who
  never finished onboarding, or a typo.
- `ambiguous: <email> matches <ids>`: the email is on two Creator records. See §6.

---

## 4. Identify the creator

In order of reliability:

1. **The Zendesk ticket.** `requester_id` gives the user email. The ticket also carries
   the asset in custom field `30320430508051` (name, shortName, site `_id`, `previewId`)
   and the workspace in `20436740811411`.
2. **Timestamp correlation.** The 📧Emails row is created 10–30 s before the Asset by the
   same run. Query 📧Emails where 🎨Creators is empty, sorted by `📅CRT`
   (`fldXYSFz4iiFm787K`), and match on the Asset's created time.
3. **Search 🎨Creators** (`tbljt0plqxdMARZXb`) for `📧WF Account Email`
   (`fldT0VVP9GXMOhajO`) = the submitted email. **More than one hit means §6 applies.
   Don't pick one yourself; it's the reviewer's call.** Signals that help: which profile
   was edited around the submission date, and whose bio fits the template.
4. **Snowflake site → owner.** Match on `DIM_SITE.owner_user_id`, not
   `created_by_user_id`: template sites are routinely duplicated.

**Check for a renamed site before treating two Assets as two templates.** `ℹ️UID` is a
snapshot of the site slug at submission time. Quick tells: the older asset's
`*.webflow.io` URL returns 404, and both assets share a `previewId` in their Preview
URLs. The authoritative check is `ANALYTICS.WEBFLOW.SHORTNAME_SITE_HISTORY`.

Don't guess the creator from the site's footer or license page. Demo content names
fictional brands.

---

## 5. Repair

Three writes, in this order. The Creator link must exist **before** the status write, or
the validation automation flips the status straight back to the error.

```
Step 1 — 📧Emails (tbldQNGszIyOjt9a1)
  <email row>.fldDqzJQbU1PRhZHp = [<creator>]
  <email row>.flde85upOCodXsivs = ["WF Account"]        # 🌟Email Type(s) — always set a type
Step 2 — 👛Assets (tblRwzpWoLgE9MrUm)
  <asset>.fldGDWo2VfnTbSUiL = [<creator>]
  Verify: #️⃣🎨Creators = 1 and 🎨📧 Creator Email is populated.
Step 3 — 🖌️Asset Versions (tblHxZ2hgSFLZxsZu)
  <version>.flde8Huk5NRIdm2wZ = "🆕Ready for Review"
  Re-read it. If it bounced back to the error, the link didn't take: fix the link,
  don't retry the status.
```

**Get approval before Step 3.** It is creator-facing: within about 5 minutes it opens a
Zendesk review thread, addressed to the Creator's **Primary** email at that moment.

Expected and unrelated on a new Upcoming asset: `🚩MRP ID missing` and
`🚩Creator Stripe Status Invalid`. `👀🕸️Creator Asset Edit URL` stays `?id=&sid=` before
MRP, so it isn't a useful check.

**Email Type decides where mail goes.** `🎨Creators.📧Email` and the Primary count only
include 📧Emails rows typed `Primary`. Linking a row fixes creator *resolution*, not
delivery. To redirect mail, retype the rows: target → `["Primary","WF Account"]`, old
primary → `["CC Recipient"]`. Keep exactly one Primary. Only do this with evidence the
creator isn't reading the current primary, and do it **before** Step 3.

---

## 6. One email on two Creator records

This is new since the fix, and the script deliberately refuses to guess. It happens when
a creator onboarded twice, for example a personal profile and a studio profile, using
the same Webflow account.

1. The reviewer decides which profile owns the template. If it isn't clear, ask the
   creator.
2. Repair as in §5 against the chosen Creator.
3. If the profiles should be merged (the decision can wait):
   - move the other profile's 📧Emails rows to the kept Creator and type them `Other`
     (or `CC Recipient` if they should get copies). Keep one Primary.
   - set `❌TEMP Don't Sync to CMS` (`fldmuo1M3aZcDkNWv`) on the retired record.
   - **clear `📧WF Account Email` on the retired record.** Otherwise the ingestion script
     keeps seeing two matches and alerting.
   - move any Assets, then deal with the retired Designer CMS item. See the Creator→Designers
     sync notes for slug collisions.

---

## 7. Duplicate submissions

When one site produced several Assets, keep **one** live review and set the others'
version `📝Review Status` = `☠️Archived`, so the creator gets one thread. Open versions
count toward the submission cap.

Default: keep the earliest. **Exception:** if the site was renamed and the earlier
asset's URL now 404s, keep the asset with the live URL, especially when the creator asks
for that. Link the Creator on both Assets so the archived one doesn't show up as an
orphan.

---

## 8. Reply to the creator

Say plainly that the submission was received, and that an internal link between it and
their creator profile was missing, which is why it wasn't in the dashboard and no review
email went out. Confirm it's now in the queue and that they shouldn't resubmit. Tell
them which address review mail will go to (the profile's Primary). Give the submitted
date. Since 2026-10-06 the receipt is also searchable in Airtable ℹ️Notes.

Don't blame the "1 active review at a time" cap unless you've checked it. An AI agent
guessed that on an earlier ticket and was wrong. Creator-facing replies need human review
before they're sent.

---

## 9. Sibling failure mode — a resubmission silently does nothing (not fixed)

Same script, opposite branch. The 👛Assets branch of `upsert()` is find-or-create with
**no update path and no status filter**. It matches the submitted name against
`Assets.Name` or `ℹ️UID`, and on a match it writes nothing, so no version and no review
ticket are created. The form's duplicate guards release a *rejected* asset's name, but
the ingestion upsert doesn't, so the two layers disagree.

**Detection:** version count doesn't increase. `template_review_list_versions` shows one
version against two reported attempts.

**Repair:** rename the old rejected Asset (`<Name> Rejected <hash>`) to free the name.
Confirm with the assigned reviewer first: whether a rejected template may be resubmitted
is their call.

---

## Related

- [`runbook-orphaned-version-asset-sync`](../../webflow-app-review-mcp/docs/runbook-orphaned-version-asset-sync.md)
  covers the same error status on the app side, where the missing link is `🍑Asset`
  rather than `🎨Creator`.
- Form repo: `createsomethingtoday/webflow-template-submission-form`. It deploys through
  Webflow Cloud on every push to `main`.
