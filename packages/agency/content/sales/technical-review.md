# Technical review of an existing project

Public page: https://createsomething.agency/technical-review

Reader: a founder or team with working software, a stuck feature, or a customer request they cannot confidently evaluate. This is a scoped review before a pilot; Control remains post-launch operations.

## First answer on a call

“You have something working. We can help you check the parts you are uncertain about before you commit to a customer. We agree on one workflow to review, inspect the relevant code, and give you a prioritized report: fix before the pilot, improve later, and leave alone for now. We quote that review before work starts. Any fixes are scoped separately.”

Ask what the customer needs to do, what already works, what remains uncertain, and what deadline matters. Explain the review output before discussing tools. A stack choice alone is not evidence of security or readiness.

## Scope before work

The fit call establishes whether we can help and the basis for a quote. It does not include a complimentary code audit. The review quote names the workflow, environment and access, checks, deliverables, walkthrough, timing, price, and exclusions. Agree who performs the review and how questions will be handled. No implied unlimited development, response-time commitment, equity arrangement, or certification.

The client keeps the findings and any project-specific tests or instructions. Implementation, broader testing and launch require separate scope. Control starts at the published $900/month for agreed post-launch operations; do not describe that price as an open-ended prelaunch engineering subscription.

## Measure the buying path

Run `pnpm --filter @create-something/agency analytics:commercial-funnel -- --days 30 --remote` with authorized D1 access. The report separates external, internal, preview, automated and test sessions. Review interest counts sessions that viewed the review page or carried its intent. Review booking columns count only events explicitly carrying the technical-review intent. A visit followed by a booking for another service does not count as a review booking. These counts do not establish a strict ordered funnel or causal attribution.

The existing consent-aware booking CTA and handoff events carry `intent=technical-review`; the scheduler receives the same intent. Do not add advertising pixels, bypass consent or count a click as a qualified inquiry. Tests must be labeled as test traffic. A missing event does not prove no booking happened.

After each inquiry, update the existing private sales record. Include the known referral or campaign source, stated trigger, fit decision, proposed scope, proposal status, and paid or declined outcome. Include referral calls that bypass the website. Do not publish prospect names, private requirements or revenue details. Compare qualified review inquiries, proposals and paid reviews over time, with the recorded visitor count and consent coverage stated. Do not claim an improvement from a handful of sessions.

## Illustrative report

The public sample is fictional and labeled. Never reuse private meeting details as a case study without permission. Real findings should record the tested scope, observed evidence, consequence, next action and untested limits. A green check on one route does not establish whole-product readiness.
