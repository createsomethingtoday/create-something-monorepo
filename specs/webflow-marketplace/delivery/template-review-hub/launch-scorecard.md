# Launch Scorecard

**Status:** Working draft  
**Workflow:** `template_review_hub_lane`  
**Pilot start target:** `2026-03-16`

Use this scorecard during pilot, hardening, and launch review to decide whether the Hub lane is ready for broader adoption.

## 1. Adoption

| Metric | Why it matters | Target for rollout |
| --- | --- | --- |
| Reviewer usage rate | Confirms the team is actually using the lane in real work | Pilot reviewers use the lane on most eligible submissions |
| Team walkthrough completion | Confirms reviewer onboarding happened | 100% of pilot reviewers attend or receive the playbook |
| Reviewer-reported usefulness | Measures whether the lane saves time or adds friction | Majority of pilot reviewers say the lane is worth keeping |

## 2. Quality

| Metric | Why it matters | Target for rollout |
| --- | --- | --- |
| Reviewer packet usefulness | Measures whether the submission truth + automation brief is actually helpful | High enough that reviewers use it as the default first-pass brief |
| False-positive rate | Measures noisy or misleading findings | Low enough that reviewers are not slowed down by validation work |
| False-negative rate | Measures missed objective issues | Trending down during pilot hardening |
| Published-first evidence quality | Measures whether analyzer jobs return evidence reviewers can act on | Reviewers regularly cite page paths, check IDs, or metrics from the analyzer output |

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
| Successful packet-plus-analyzer completion rate | Confirms the lane works consistently | Stable enough for daily reviewer use |
| Analyzer job latency | Determines whether the lane fits reviewer workflow | Fast enough to use during normal review without major interruption |
| Trace coverage | Confirms evidence exists for debugging and signoff | Recommendation, write, and escalation traces visible |
| Tool failure trend | Measures operational stability during pilot | Failures understood and reducing over time |

## 5. Rollout recommendation

Use this summary after the current hardening window:

- `Proceed to broader rollout`
- `Stay in pilot and harden`
- `Reduce scope to rollback evidence mode`
- `Pause delivery and reassess`

## 6. Signoff

- workflow owner: `Marketplace review lead`
- technical owner: `Senior Systems Architect`
- review date: `TBD after hardening`
