# ABUNDANCE

## Slide 1: Title

Abundance.

This is the nurse staffing system, explained in plain language.

Not the implementation details first.
Not a wall of product jargon.
Just what the system does, why it exists, and where the safety rails sit.

---

## Slide 2: The staffing problem

Nurse staffing is still full of repeated facts and manual re-entry.

A nurse texts a recruiter.
Someone copies details into a system.
Someone checks a license.
Someone chases missing documents.
Someone decides who looks close enough.

That is slow.
And in healthcare, slow plus unclear is dangerous.

---

## Slide 3: What Abundance actually is

Abundance does three jobs.

First, it listens and turns conversation into a working profile.
Second, it ranks likely fits.
Third, it controls when the system is allowed to write, escalate, or stop.

Think of it as conversation plus matching plus guardrails.

---

## Slide 4: Translating the code

The codebase uses generic marketplace language.

Seeker.
Talent.
Match.
Intake.

In nurse staffing terms, that becomes the side asking for coverage, the nurse available to fill it, the recommended pairing, and the running intake history.

That translation matters because the engine is generic by design, but the workflow can be specialized.

---

## Slide 5: No giant intake form

The concierge flow is the simplest way to understand the product.

A nurse says, “I’m an ICU nurse in Austin looking for a 13-week travel contract starting in April. Nights are best.”

The system captures what it can.
Then it asks only for what is still missing.

That is the key move.
It does not force a 20-question form before it becomes useful.

---

## Slide 6: What the system keeps

The system keeps the facts it needs to keep working:

who you are,
what you can do,
when you are available,
what has been confirmed,
what still needs proof,
and what happened in previous conversations.

In the repo, that shows up as profiles, matches, and intakes.
It is meant to remember progress, not just collect data.

---

## Slide 7: Matching is simple on purpose

The current matching engine is not magic.
It is simple math.

Skills count for forty percent.
Budget counts for thirty percent.
Availability counts for thirty percent.

In a nurse staffing deployment, that maps cleanly to specialty and credential fit, pay fit, and shift or start-date availability.

Simple scoring is a feature here.
You can explain it.
You can audit it.
You can improve it without pretending it is a black box.

---

## Slide 8: When the system must stop

The seeded concierge demo includes a strong example.

A nurse says one license date.
The credentialing portal returns another.

The system does not guess.
It packages the thread for human review.

That is the right behavior in a regulated workflow.
The goal is not “AI does everything.”
The goal is “AI does the safe parts fast and hands off the risky parts clearly.”

---

## Slide 9: The policy rules

Three rules matter most for this product.

Inferred is not the same as confirmed.
Sensitive fields need an explicit yes before external use.
Low-confidence or regulated exceptions trigger a human handoff.

Those rules are already written down in the repo as policy artifacts.
That means the safety model is not hidden inside prompts.

---

## Slide 10: Why `.agency` exists

The concierge chat is the product surface.
`.agency` is the control surface.

That is where identity, entitlement, credential separation, and route authorization live.

In plain terms:
the chat can feel simple because the control layer is doing the serious work in the background.

One login boundary.
One governed access model.
One place to stop execution when policy, billing, contract, or security state says no.

---

## Slide 11: What is real now versus what gets specialized

What is already real in code:
profiles, intake history, matching, WhatsApp-ready identity, human handoff, governed widgets, and controlled execution.

What gets specialized for nurse staffing:
facility-side data, nurse credential rules, shift templates, license-verification integrations, compliance workflows, and downstream writebacks.

That distinction is important.
This is not a fake deck.
It is a real system with a clear adaptation path.

---

## Slide 12: What paid acquisition likely costs

We also have enough research to budget the go-to-market honestly.

On the nurse side, a lean paid test is roughly three to six thousand dollars a month.
A stronger single-market test is roughly six to twelve thousand.

That is grounded in recruitment and healthcare benchmarks:
lower-cost job-channel clicks,
higher-cost Google and LinkedIn clicks,
and healthcare application costs that rise fast for harder-to-fill roles.

On the facility side, the numbers are higher and less direct.
A lean validation range is roughly four to eight thousand dollars a month.
A more serious demand-generation range is roughly eight to fifteen thousand.

That side is inferred from B2B healthcare and staffing benchmarks, especially LinkedIn lead-gen costs.
So the honest statement is:
candidate acquisition is better benchmarked than facility acquisition.

---

## Slide 13: Recommended first 90 days

If we wanted to test the funnel instead of just describe it, the starting range is clear.

Minimum viable paid test:
eight to twelve thousand dollars per month total.

Better signal-generating budget:
twelve to twenty thousand dollars per month total.

The recommended split is about two-thirds nurse acquisition and one-third facility acquisition.

On the nurse side:
job channels first,
search second,
Meta and specialty LinkedIn tests where they help.

On the facility side:
LinkedIn lead gen,
search for staffing-intent terms,
then retargeting and follow-up.

Month one is message testing.
Month two is budget reallocation.
Month three is scaling the best specialty and geography combinations.

---

## Slide 14: The client value

For nurses, less form fatigue.
For recruiters, less retyping.
For operators, fewer hidden blockers.
For leadership, a system that is faster without becoming opaque.

The claim is simple:
Abundance turns staffing from repeated intake and manual guesswork into guided matching with visible safety rails.

And now the adaptation path includes a research-backed budget range, not just a product story.
