---
name: halfdozen-monthly-article
description: Draft a monthly Half Dozen technical update from verified work evidence, with plain-language, developer, and business-operations explanations. Use for a review-ready draft only, never for publishing or sending.
---

# Half Dozen Monthly Article

Turn a bounded set of verified Half Dozen technical work into one useful,
review-ready monthly article. The article explains what changed for a general
reader, a developer, and the business that operates the system.

## Draft-only boundary

This skill produces local draft artifacts only. Do not publish to a CMS, queue a
post, send a newsletter, post to social media, create a scheduled job, or mutate
a client system. Before any publication or external write, stop and request
explicit operator approval through the owning workflow.

## Start with a source set

Ask for or inspect a date window and a bounded source set. Prefer current,
reviewable evidence such as merged pull requests, release notes, deployment
receipts, approved work logs, or client-approved internal records. Do not treat
agent conversation history, an issue title, an open pull request, or a plan as
proof that a change shipped.

Read [evidence-ledger.md](references/evidence-ledger.md) before selecting work.
If the evidence does not establish the work's status, exclude it or state the
uncertainty plainly. Exclude private, proprietary, security-sensitive, or
client-confidential detail unless an operator provides an approved public
summary.

## Build the article

1. Select one coherent theme from the evidence set. Prefer an operational
   outcome over a list of unrelated commits.
2. Create the claim ledger. Every material claim needs a source, proof level,
   and safe wording.
3. Write the draft using [monthly-draft-template.md](references/monthly-draft-template.md).
4. Keep the three reader sections distinct:
   - **In plain language:** the concrete problem, change, and user consequence.
   - **For developers:** the relevant system behavior and technical tradeoff,
     without exposing private implementation or credentials.
   - **For Half Dozen operations:** the operational improvement, owner, and
     remaining review or handoff.
5. Run an editorial pass for direct, operational prose. Preserve the locked
   claim ledger: editing may improve clarity and structure but may not add facts,
   attribution, partnerships, customer outcomes, or release claims.
6. End with the evidence notes, open questions, and an explicit review request.

## Claim discipline

Use the narrowest accurate proof level:

| Evidence status | Safe wording                                      |
| --------------- | ------------------------------------------------- |
| planned         | `We are evaluating…` or omit it.                  |
| reviewed        | `The team reviewed…`                              |
| merged          | `The change merged into the source branch…`       |
| released        | `The change was included in version…`             |
| deployed        | `The service is running the verified deployment…` |

Never present a contribution as an official partnership, endorsement, client
adoption, or production outcome unless a current primary source proves that
specific relationship or result.

## Review gate

Return these artifacts together:

- article draft;
- evidence ledger;
- excluded or uncertain candidates;
- a statement that the article is **not published**; and
- the smallest review question needed to decide whether and where it should be
  published later.

If the requested output includes a publish action, publication date, CMS entry,
newsletter, social post, or automated schedule, stop after the draft and ask
for explicit approval plus the owning delivery workflow.
