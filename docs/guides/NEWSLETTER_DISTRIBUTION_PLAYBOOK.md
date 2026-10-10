# Newsletter distribution playbook

Use this playbook to turn one verified CREATE SOMETHING field note into a useful conversation across the first-party newsletter, `.agency`, LinkedIn, and Substack. This is the distribution companion to [commit-driven marketing](./COMMIT_DRIVEN_MARKETING_SCHEDULE.md), the [newsletter content strategy](../../packages/io/docs/newsletter-strategy.md), and [newsletter engagement review](./NEWSLETTER_ENGAGEMENT_RUNBOOK.md).

## Keep each surface's job clear

| Surface | Reader's next step | Source of truth |
| --- | --- | --- |
| [`.io` newsletter archive](https://createsomething.io/newsletters) | Read a validated edition; choose the first-party double-opt-in signup | Published edition, signup state, and delivery receipts |
| [`.agency` Dispatch](https://createsomething.agency/dispatch) | Understand the editorial program and find service-relevant evidence | Current public schedule and field reports |
| LinkedIn founder and company accounts | Discover a specific lesson and follow one relevant link | Exact published post under the intended author |
| [Substack](https://createsomethingltd.substack.com/) | Read a native short note or join discussion | The public note/post and its separate subscription state |

Do not present `.agency` as a second signup if its public signup is hidden. Do not imply the two subscriber lists are synchronized. Treat any import, cross-list send, or welcome-message change as its own consent and delivery task. A Substack theme change is a separate visual decision; the September 2026 owner choice was to keep the Profile theme.

## One source card before channel drafts

Select a published work item that answers a reader's real workflow question. A merge, CTX recollection, or agent draft alone is not public evidence. Read the live artifact and its owning source. Write a compact card with:

- The reader question and one reusable operating lesson.
- Canonical URL, source revision or artifact, owner, and date checked.
- Claims supported by evidence, exact numbers and denominators, and limits or unknowns.
- Private or client details that must stay out of public copy.
- Primary audience and next step: learn through `.io`, or explore a service workflow through `.agency`.
- Intended channels, exact destination URLs, measurement tags if supported, and proposed outcome checkpoint.

Use CTX to find earlier reasoning, then re-check current claims. The September 2026 launch paired the [`.io` field note](https://createsomething.io/newsletters/2026-09-01-the-interface-is-becoming-executable) with an [`.agency` template-review field report](https://createsomething.agency/field-reports/template-review). The field report supported “49 of 50 selected evidence packets assembled”; it did not support a reviewer time-saved claim. See [Linear CRE-2159](https://linear.app/createsomething/issue/CRE-2159/launch-first-party-newsletter-distribution-across-linkedin-and) for that launch's approvals and receipts. Reverify any example before reusing it.

## Draft for the channel

1. **First-party edition:** Keep the full method, evidence, limitations, and one clear next step in the canonical `.io` article. The newsletter strategy limits ordinary email to two validated sends per month. A web publication and an audience email are separate decisions.
2. **`.agency` Dispatch:** Keep dated promises accurate. If a queue date was only a review target, say so before promoting it. Link to current service evidence and the first-party archive where useful.
3. **LinkedIn:** Draft distinct founder and company posts when both accounts add a meaningful angle. Lead with the workflow problem and concrete lesson; link directly to the relevant live artifact. Check the intended author, destination, preview, and any supported campaign tags in the actual composer.
4. **Substack:** Write a native note or post that adds a useful thought or question. Link to the canonical work when appropriate. Do not paste an entire edition merely to create another subscription surface.

Use campaign tags only after the receiving property accepts and records them. Keep tags public and non-personal; never include addresses, recipient IDs, or unsubscribe tokens. A tagged link proves a configured path, not that production ingestion or conversion reporting works. Keep `.io` and `.agency` results separate.

## Agent handoff and review

Linear owns shared scope, owner, approval, and evidence. Give a delegated agent the source card, exact deliverable, account or page, claim limits, links to the owning policy, and the expected proof. Ask for drafts or read-only checks separately from publication. An agent's completion means its assigned artifact is ready for review, not that the campaign is live.

Before a public write, bind the approval to the exact copy, account, link, and timing. If any of those change materially, review that changed item. The operator checks that the intended account is signed in, the source and destination still render, and no matching post already exists. Publish once, then read back the post under the right author and record its public URL and time. If a composer errors or a tool times out, inspect the account activity before retrying; social writes are not safely idempotent.

For email, use the [newsletter engagement runbook](./NEWSLETTER_ENGAGEMENT_RUNBOOK.md) and its delivery owner. Require the exact audience, content, and time approval, real unsubscribe handling, provider receipt, and delivery readback. Do not infer a send from a draft or schedule.

## Outcome checkpoint

Record a pre-publication snapshot when available, then review at roughly 24 hours and at the next editorial checkpoint. Report counts with their source and time:

| Evidence | What it can support | Do not infer |
| --- | --- | --- |
| Public post URL and account readback | The exact item is live under that author | Reach, clicks, or qualified leads |
| Platform impressions and follower totals | Account-level exposure snapshots | Campaign-attributed subscriber growth |
| First-party tagged sessions | Observed visits under the configured analytics and consent rules | Every reader click or causal attribution |
| Confirmed subscriptions, replies, and workflow-mapping conversations | Specific reader action or qualified inquiry | Conversion rate without a matching denominator |
| Provider message IDs and delivery readback | Mail-server acceptance for an approved send | Inbox placement or opens |

If a dashboard, API, or database query is unavailable, say which metric is unavailable and why. For example, the September 2026 launch's production D1 analytics query returned authorization code `7403`; the public posts were verified, but visit ingestion was not. Do not fill that gap with platform reach or operator test traffic. Compare the actual outcomes with the time spent producing each format. Keep, revise, or retire a format based on useful conversations and reusable artifacts, not a tiny sample's apparent rate.

## Closeout record

In the Linear issue, record the source card, reviewed copy and destination, approval scope, public URLs and timestamps, checks run, baselines, follow-up time, observed outcomes, unavailable metrics, and the next editorial decision. Include Paperclip issue URLs with the instance name. Keep the state explicit: **candidate → evidence reviewed → draft → approved → published → outcome recorded**. Correct a public error on the affected surface, link the correction, and preserve the original receipt.
