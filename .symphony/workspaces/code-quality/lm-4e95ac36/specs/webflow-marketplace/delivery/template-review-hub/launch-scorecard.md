# Launch Scorecard

**Status:** Working draft  
**Workflow:** `template_review_hub_lane`  
**Pilot start target:** `2026-03-16`

Use this scorecard during alpha, beta, and launch review to decide whether the Hub lane is ready for broader adoption.

## 1. Adoption

| Metric | Why it matters | Target for rollout |
| --- | --- | --- |
| Reviewer usage rate | Confirms the team is actually using the lane in real work | Pilot reviewers use the lane on most eligible submissions |
| Team walkthrough completion | Confirms reviewer onboarding happened | 100% of pilot reviewers attend or receive the playbook |
| Reviewer-reported usefulness | Measures whether the lane saves time or adds friction | Majority of pilot reviewers say the lane is worth keeping |

## 2. Quality

| Metric | Why it matters | Target for rollout |
| --- | --- | --- |
| Recommendation acceptance rate | Measures how often the Hub is directionally right | High enough that reviewers trust it as a first-pass aid |
| False-positive rate | Measures noisy or misleading findings | Low enough that reviewers are not slowed down by validation work |
| False-negative rate | Measures missed objective issues | Trending down during pilot hardening |
| Draft feedback usefulness | Measures whether drafted feedback reduces reviewer writing time | Reviewers regularly keep or lightly edit draft feedback |

## 3. Governance

| Metric | Why it matters | Target for rollout |
| --- | --- | --- |
| Unreviewed writes | Core safety metric | Zero |
| Blocked-action correctness | Confirms policy boundary is real | All tested blocked actions are blocked |
| Escalation clarity | Confirms reviewers can understand why the lane stopped | Reviewers can act on escalation without confusion |
| Manual fallback success | Confirms operations do not stall on tool failure | Fallback verified and usable |

## 4. Reliability

| Metric | Why it matters | Target for rollout |
| --- | --- | --- |
| Successful review-run completion rate | Confirms the lane works consistently | Stable enough for daily reviewer use |
| Analysis latency | Determines whether the lane fits reviewer workflow | Fast enough to use during normal review without major interruption |
| Trace coverage | Confirms evidence exists for debugging and signoff | Recommendation, write, and escalation traces visible |
| Tool failure trend | Measures operational stability during pilot | Failures understood and reducing over time |

## 5. Rollout recommendation

Use this summary after beta:

- `Proceed to broader rollout`
- `Stay in pilot and harden`
- `Reduce scope to read-only evidence lane`
- `Pause delivery and reassess`

## 6. Signoff

- workflow owner: `Marketplace review lead`
- technical owner: `Senior Systems Architect`
- review date: `TBD after beta`
