---
name: halfdozen-audience-article
description: Review approved Half Dozen context every 14 days and draft the one evidence-bound operating article most useful to the audience. Use for a review-ready draft only, never for scheduling, publishing, or sending.
---

# Half Dozen Audience Article

Turn a bounded set of approved Half Dozen context into one useful,
review-ready article every 14 days. Select for the audience's operating needs,
not for technical intricacy or the amount of work completed.

## Audience contract

Write for the least-tenured credible owner or operator in live events,
entertainment, or client-service work. They know their field but do not arrive
knowing Half Dozen's tools or systems vocabulary. The article should help them
recognize an operating problem, understand the recommended approach, and know
what to do or consider next.

## Cadence contract

Every 14 days means the context review cadence. It is not a source-age limit,
publication schedule, or requirement to manufacture an article. Review what is
new or newly relevant since the previous cutoff, while allowing older approved
material when it best supports the current audience idea.

## Draft-only boundary

This skill produces local draft artifacts only. Do not publish to a CMS, queue a
post, send a newsletter, post to social media, create a scheduled job, or mutate
a client system. Before any publication or external write, stop and request
explicit operator approval through the owning workflow.

## Start with approved context

Ask for or inspect the previous cutoff, the current review date, and a bounded
set of approved context. Useful sources may include:

1. a recurring operating problem recognizable to the Half Dozen audience;
2. an approved client or Half Dozen systems observation that can be generalized
   safely;
3. a public work story with a useful operating lesson;
4. a technical change with a clear consequence for how people work; or
5. an approved evergreen idea from the Half Dozen content backlog.

Prefer current, reviewable evidence such as public work stories, merged pull
requests, release notes, deployment receipts, approved summaries, or
client-approved work logs. Do not treat agent conversation history, a raw
transcript, an issue title, an open pull request, or a plan as proof that a
change shipped or as permission to publish private detail.

Read [evidence-ledger.md](references/evidence-ledger.md) before selecting work.
If the evidence does not establish the work's status, exclude it or state the
uncertainty plainly. Exclude private, proprietary, security-sensitive, or
client-confidential detail unless an operator provides an approved public
summary.

## Select one controlling idea

Rank candidates by these criteria, in this order:

1. relevance to the audience's operating work;
2. clarity of the problem, tension, or decision;
3. strength and public safety of the supporting evidence; and
4. usefulness of the takeaway.

Technical complexity is not a positive selection signal. Do not invent numeric
scores. Return the winning theme and a short reason it won, plus the weaker,
excluded, or uncertain candidates.

Return a hold with the evidence gap and smallest next action when no candidate
is relevant, well supported, and public-safe. A hold is a successful governed
result; do not force a draft to satisfy the cadence.

## Build the article

1. State the controlling idea in one plain sentence.
2. Create the claim ledger. Every material factual claim needs a source, proof
   level, and safe wording.
3. Write the draft using
   [audience-draft-template.md](references/audience-draft-template.md).
4. Lead with the quick answer, then show the operating tension, the useful
   explanation, and the practical recommendation.
5. Technical detail is optional. Include it only when it helps the reader
   understand the operating consequence, the tradeoff, or an important limit.
   Remove the technical section when it adds machinery without reader value.
6. Run a subtractive editorial pass for direct, operational prose. Preserve the
   locked claim ledger: editing may improve clarity and structure but may not add
   facts, attribution, partnerships, customer outcomes, or release claims.
7. End with evidence notes, limits, and the smallest explicit review question.

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

- selected theme and why it won;
- article draft;
- evidence ledger;
- weaker, excluded, or uncertain candidates;
- a statement that the article is **not published**; and
- the smallest review question needed to decide whether and where it should be
  published later.

If the requested output includes a publish action, publication date, CMS entry,
newsletter, social post, or automated schedule, stop after the draft and ask
for explicit approval plus the owning delivery workflow.
