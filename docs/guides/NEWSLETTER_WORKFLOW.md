# Operate a newsletter edition

Use the newsletter workspace to take one verified lesson from a draft to an approved send, then review what happened. Start at `/admin/newsletter` in CREATE SOMETHING `.io` while signed in as an administrator. The existing newsletter analytics view remains at `/admin/newsletter-analytics`.

You need the edition's source files, a named editorial owner, evidence for its claims, and access to the intended sending account. Production delivery also needs explicit approval for the exact content, eligible audience, and send time. Preparing a draft or deploying this workflow does not grant that approval.

## Prepare and review the edition

1. **Select one useful lesson.** Record its author, accountable owner, source references, supported claims, limitations, and one primary reader action. Keep private client information out of the source and email.
2. **Prepare the exact email.** Import the checked-in candidate where available, or supply a subject, complete HTML template, and plain text. Both parts must contain the literal `{{unsubscribe_url}}` placeholder. Keep review banners in review files, not in a send template. Save the content revision and inspect the resulting content hash.
3. **Inspect the render.** Review desktop and mobile layouts, keyboard-accessible links, image-blocked behavior, and the plain-text alternative. Send the exact revision to the authenticated operator when the test is authorized. Preserve the provider receipt; confirm the intended inbox received it. A successful provider request alone does not prove inbox placement or a human read.
4. **Complete the human read.** Check the claims, links, author attribution, reader action, and proof limits. Correcting content after a test requires another test. Correcting content after approval invalidates that approval.
5. **Review the current audience.** Read each eligibility category and the selected audience fingerprint. Active status is only one requirement. Never treat an exception from an earlier edition as a standing permission.
6. **Approve one content/audience/time combination.** Record the exact content hash, current audience fingerprint and count, approved send time, and authenticated approver. A changed content revision, audience, or send time requires renewed approval.
7. **Send deliberately and reconcile.** Dispatch through the governed workflow at the approved time. Confirm provider IDs and receiving-mail-server delivery states. Keep operator-test receipts separate from audience receipts. Read failures as unavailable or failed; never replace them with zero delivered.
8. **Review the outcome.** At roughly 24 hours and the next editorial checkpoint, inspect tagged visits, resource use, confirmed signups, and any substantive replies reviewed separately. Record what to continue, revise, or stop in Linear.

If a gate is missing, the next action is to satisfy that gate. A draft, rendered template, operator test, approval, provider acceptance, delivery, and public publication are different states.

## Keep consent categories distinct

The canonical audience selector is `packages/canon/src/lib/newsletter/audience.ts`.

| Category | Meaning | Next action |
| --- | --- | --- |
| Eligible | Direct confirmation, required consent evidence, reviewed audience classification, and no suppression | Include only in the current approved audience |
| Unconfirmed | Confirmation has not completed | Preserve the pending state; use the existing confirmation workflow only when authorized |
| Consent unproved | Required direct-consent evidence is absent | Review the evidence; do not manufacture confirmation or import into eligibility |
| Audience unreviewed | Consent exists but audience classification is incomplete | Review classification under the owning subscriber workflow |
| Suppressed | Unsubscribed, inactive, bounced, complained, or otherwise excluded by the selector | Exclude; never clear suppression to complete a campaign |

Recheck eligibility immediately before dispatch. If the selected audience no longer matches the approved fingerprint, stop and prepare a new approval. A subscriber's later opt-out takes precedence over the send plan.

## Understand attribution

Each edition records its author and evidence sources. Marketing attribution is separate: public edition, channel, and campaign values connect eligible tagged visits to requested and confirmed newsletter signup. Use only the configured public values. Preserve existing property-source semantics so an `.io` edition does not rewrite the originating property.

Campaign URLs must never contain an address, subscriber ID, confirmation token, or unsubscribe token. The unsubscribe URL is a recipient-specific control used only in the email footer; it is not an analytics tag. Unknown or ambiguous campaign parameters do not establish attribution.

Measurement follows existing analytics consent, Do Not Track, and profile opt-out. Do not add a tracking pixel or tracking cookie, change Resend tracking settings, or infer attribution for historical untagged signups. Confirmation can occur later or in another browser; retain only the permitted public attribution snapshot associated with the original signup. Count the actual confirmation once, not each confirmation-page refresh.

Report traffic classes separately. External-classified traffic can include unmarked operator activity. Visits are sessions, not unique recipients; resource use is observed website activity, not an email click rate. Confirmed signups are observed conversions under the declared attribution rules, not proof that the campaign caused them. Workflow inquiries are outside this attribution scope. Opens, recipient click rates, campaign unsubscribe rates, and replies remain unavailable unless their owning workflow supplies evidence.

## Know which record owns the answer

| Record | Owns | Does not establish |
| --- | --- | --- |
| Versioned edition files in `packages/io/content/newsletters/` | Article, email templates, source evidence, reviewed historical receipts | Current audience eligibility or a new approval |
| D1 edition and delivery records | Current preparation, content hash, approval binding, audience fingerprint, exact provider IDs and runtime outcomes | A human read, inbox placement, or publication on another channel |
| Subscriber records and canonical audience selector | Consent evidence, classification, suppression, current eligibility | Permission to import another list or reuse a legacy exception |
| Existing first-party analytics and permitted signup attribution | Observed visits and signup outcomes under existing consent rules | Every reader action, recipient click rates, or causal lift |
| Linear issue | Accountable owner, scope, human decisions, review evidence, release and rollback handoff | Runtime send completion without matching delivery receipts |

The candidate import currently covers the refreshed September 8 edition only. Its checked-in receipt records author, owner, evidence sources, and SHA-256 hashes for the article, email source, plain text, template, and review render. Importing that manifest prepares a revision; it never approves its content, audience, send time, or web publication. Preserve those source hashes alongside the runtime content hash so a reviewer can trace the prepared revision back to the files.

Read the authoritative record before changing a state. Reconcile contradictory historical wording against the retained receipt, preserving when that evidence was observed. A November reconciliation of a September provider receipt is not a November provider readback.

The `.io` archive and Substack are separate publication destinations and subscriber lists. Web publication requires its own approval and public-URL readback. An email send does not publish an article, and publishing an article does not send an email.

## Recover from a partial or uncertain send

Each approved audience message needs a stable idempotency key and durable delivery record. Do not create a new edition or key to get around a failed or uncertain attempt.

- **Known rejection:** retain the provider error and the affected delivery record. Correct the cause within authorization, then follow the workflow's eligible retry path.
- **Timeout or lost response:** the provider may already have accepted the message. Keep the outcome uncertain. Inspect the provider by its receipt or idempotency evidence before retrying. Never assume that provider idempotency remains valid indefinitely.
- **Accepted message with failed local recording:** reconcile the exact provider ID before considering another send. Preserve the partial-failure evidence in Linear.
- **Missing or mismatched provider readback:** report unavailable and stop. A matching subject alone is not enough to identify a delivery.
- **Audience or content changed:** discard the old approval, retain its audit record, and obtain a new exact approval.

Cancel an existing provider schedule only through the documented provider path and within its cancellation limits. An application rollback does not cancel an already accepted or scheduled email.

## Release and completion proof

Before production promotion, run the affected workflow, attribution, lifecycle, archive, and package checks. Independently exercise the actual admin interface, including loading, empty, error, blocked-approval, and uncertain-delivery states. Verify that an unauthenticated API call is rejected. Mark operator analytics checks as test traffic.

Apply the reviewed additive D1 migrations before deploying code that depends on them. Verify the intended Cloudflare account and database. Preserve existing subscriber records, consent evidence, and delivery history. Do not backfill guessed attribution or approvals. Read back the seeded edition states and migration results before claiming they are live.

Rollback code through the reviewed prior production artifact. Additive tables and historical receipts can remain for recovery; do not drop them as part of a routine rollback. Code rollback does not undo subscriber actions, migrate consent back, delete recorded events, or retract a sent email.

Record the source revision, checks and their limits, deployment ID/URL, migration readback, and observed runtime behavior in Linear. Include remaining approval gates, outcome checkpoint, rollback note, and `Worktree disposition:`. Distinguish implemented, independently tested, deployed, live-verified, and human-approved.

Related instructions: [newsletter engagement review](./NEWSLETTER_ENGAGEMENT_RUNBOOK.md), [distribution playbook](./NEWSLETTER_DISTRIBUTION_PLAYBOOK.md), and [content strategy](../../packages/io/docs/newsletter-strategy.md).
