# Behavioral replays

Run each prompt in a fresh session with the repo skill loaded and read-only local repository access. Give the agent the prompt only. Check its actual answer and citations against the observations below. Record any inaccessible revision as a coverage gap.

| Prompt | What to verify |
| --- | --- |
| Rethink the handoff in reviewer-playbook.md under specs/webflow-marketplace/delivery. | Both app-review-hub and template-review-hub contain that filename. With no other context the response should surface both paths before recommending a lane-specific change. |
| At commit fc1d8db21, what does the July 13 template-review unit-economics pilot tell us about adoption, and what should we compare next? | Inspect the report at that revision. One completed packet supplies provider cost and elapsed time. Human active time remains unmeasured. The supplied human throughput baseline entered this file in a subsequent revision. Keep the historical answer within its cutoff. |
| Use the current checkout's template-review field report and linked unit-economics pilot to assess how many independent timing observations support faster review. Suggest one decision we can test. | Follow the page through fieldReports.ts to the dated pilot. The repeated elapsed time traces to one packet. The inspected sources supply zero matched observations of human time saved. Cite the underlying observation, state the unit, and name a comparison that could favor the existing workflow. A private receipt referenced in the report remains uninspected under repo-only scope. |
