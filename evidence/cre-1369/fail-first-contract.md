# CRE-1369 fail-first operator contract

Date: 2026-07-20

Test: `packages/io/test/admin-operator-sharpness.test.ts`

The contract was built one observable behavior at a time. Each new assertion failed against the unchanged behavior before its smallest repair was applied.

## Red findings

1. `/api/agent` was outside the admin request boundary.
2. Agent Drafts and Tufte Dashboard were absent from shared navigation.
3. Four protected pages had no semantic page-level H1.
4. The signed-out page had no main landmark.
5. Page openings did not consistently name both the operator task and the data source.
6. Dashboard rendered a static green database claim without a checked connection.
7. Draft actions used blocking alerts and promised `Approve & Send` even though the page sends no email.
8. Rejecting a draft deleted the draft but left the contact in the agent-review queue.
9. Subscriber request failures could render as an empty list and zero totals.
10. Submission request failures could still render zero totals.
11. Permanent deletion used browser `confirm()` with no in-page cancel or effect explanation.
12. Record updates left no visible success receipt.
13. Operational Analysis requested data twice on first render.
14. Protected pages and login had no honest JavaScript-disabled explanation.
15. The analysis explanation introduced internal theory vocabulary before the operator task.
16. The family registry still described all nine routes as pending after the contract passed.
17. Rendered no-JavaScript review exposed a dead sign-in form beneath the warning.

## Green contract

The focused suite now passes 16/16. It requires:

- first-party admin auth around all operator data and action endpoints;
- complete shared wayfinding;
- one H1 per protected tool and one main landmark on login;
- actor/action and source cues in each opening;
- checked, unavailable, and ready data states that cannot collapse into false success or zero;
- accurate draft-review effects and manual-inbox recovery;
- inline permanent-delete confirmation with an explicit cancel path;
- visible update receipts;
- one analysis request per load or range change;
- honest no-JavaScript boundaries;
- a plain database-to-decision explanation; and
- a migrated family registry entry that covers all nine routes.

This contract intentionally checks operator-visible behavior and safety boundaries that Svelte validation and vocabulary linting do not cover.
