# ABUNDANCE

## Slide 1: Title

Abundance.

This is the nurse acquisition operating layer, explained in plain language.

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

For this client, it sits on top of existing demand sources and recruiter workflows.
It is not a replacement for every job board or agency system.

---

## Slide 4: Translating the code

The codebase uses generic marketplace language.

Seeker.
Talent.
Match.
Intake.

In nurse staffing terms, that becomes the approved opening, the nurse available to fill it, the recommended pairing, and the running intake history.

For this client, the important note is that demand already exists.
We are not trying to generate the facility side.
We are improving how nurses are acquired, qualified, and matched into it.

That translation matters because the engine is generic by design, but the workflow can be specialized.

---

## Slide 5: What intake feels like

The concierge flow is the clearest way to understand the product.

A nurse says, “I’m an ICU nurse in Austin looking for a 13-week travel contract starting in April. Nights are best.”

The system captures what it can.
Then it asks only for what is still missing.

That is the key move.
It does not force a 20-question form before it becomes useful.

---

## Slide 6: What the operating layer needs to keep

To keep the workflow moving, the operating layer has to keep the facts that survive from intake through handoff:

who you are,
what you can do,
when you are available,
what has been confirmed,
what still needs proof,
which approved openings are in play,
and what happened in previous conversations and recruiter handoffs.

In the repo today, the generic foundation shows up as profiles, matches, and intakes.
The nurse package needs to extend that with opening-source and credential state.

---

## Slide 7: How matching stays legible

The current matching foundation is not magic.
It is simple math.

Skills count for forty percent.
Budget counts for thirty percent.
Availability counts for thirty percent.

That foundation is useful because you can explain it, audit it, and improve it.

But a real nurse rollout needs hard gates before scoring:
license,
credential,
specialty,
shift,
start-date,
and missing-document checks.

---

## Slide 8: What happens on conflict

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
generic profiles, intake history, generic matching, WhatsApp-ready identity, human handoff, governed widgets, and controlled execution.

What still needs to be added for nurse operations:
stable person identity across role changes,
approved opening ingest and dedupe,
nurse credential rules, specialty and shift fit, pay-package logic, resume and consent collection, recruiter handoff, and healthcare audit outputs.

That distinction is important.
This is not a fake deck.
It is a real system with a clear adaptation path.

---

## Slide 12: What nurse acquisition likely costs

We also have enough research to budget this honestly.

The client already has demand.
So this budget is about nurse acquisition into existing openings, not a two-sided marketplace launch.

A focused working range is roughly six to twelve thousand dollars a month.
A broader signal-generating range is roughly twelve to twenty thousand.

That is grounded in candidate-side recruitment benchmarks:
Indeed and job-media clicks,
Google and LinkedIn specialty clicks,
and healthcare completed-application costs that rise fast for harder-to-fill roles.

---

## Slide 13: Recommended first 90 days

If we wanted to test the funnel instead of just describe it, the starting range is clear.

Focused working budget:
six to twelve thousand dollars per month.

Better signal-generating budget:
twelve to twenty thousand dollars per month.

Channel order is straightforward:
approved opening sources and job channels first,
search second,
Meta retargeting for completion and reactivation,
and LinkedIn only where specialty targeting matters.

Month one is source approval and message testing.
Month two is budget reallocation around nurse quality and eligibility gates.
Month three is scaling the best specialty and geography combinations while improving recruiter handoff.

---

## Slide 14: The client value

For nurses, less form fatigue.
For recruiters, less retyping.
For operators, fewer hidden blockers.
For leadership, a governed layer above existing demand instead of another disconnected tool.

The claim is simple:
Abundance becomes the intake, qualification, and matching layer above approved openings and recruiter workflows.

And now the nurse-acquisition path includes a research-backed budget range, not just a product story.
