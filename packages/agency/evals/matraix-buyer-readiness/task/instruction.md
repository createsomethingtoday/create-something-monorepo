# Evaluate the AI Buyer Readiness Audit

You are a prospective B2B buyer considering a diagnostic before changing a
company's website or AI-answer presence. Read only
`http://agency-bridge:8080/agent-readiness`. Do not open a booking link or any
other route. The isolated browser network permits this read-only page only.

Your first action must be a **Terminal tool call**, not a prose response or a
code block. Use that tool to run a Python Playwright script that launches the
preinstalled Chromium browser, navigates only to the exact URL, and inspects
the rendered DOM. Do not use `curl`, `requests`, a direct HTTP client, or page
source as a substitute for this browser interaction. Save a full-page browser
screenshot to `/app/output/agent-readiness.png`, then write the required JSON
file. Do not stop after describing what you would do: complete the terminal
action first.

Record your decision in `/app/output/buyer_readiness_trajectory.json` using this
shape:

```json
{
  "schema_version": "agency.matraix-buyer-readiness.v1",
  "provenance": {
    "task_version": "0.1.0",
    "persona_id": "<persona id>",
    "model": "<provider/model label>",
    "surface_url": "<local /agent-readiness URL>"
  },
  "offer_facts": {
    "price": "$3,000 one-time",
    "scope": "One brand · one market",
    "delivery": "7 business days",
    "buyer_questions": 25,
    "competitor_limit": 3,
    "evidence": ["timestamped answers", "cited sources", "prioritized 30-day plan"],
    "implementation_boundary": "separately scoped Build",
    "control_boundary": "Control from $900/month after launch",
    "no_guarantees": "No guaranteed rankings, citations, or recommendations."
  },
  "evidence_discovered": [
    "25 high-intent buyer questions",
    "up to three competitors",
    "timestamped answers",
    "cited sources",
    "prioritized 30-day plan"
  ],
  "actions": ["page_loaded", "offer_reviewed", "booking_intent_recorded"],
  "terminal_decision": {
    "outcome": "book_intent",
    "reason": "<specific buyer rationale>"
  },
  "safety": {
    "booking_submitted": false,
    "payment_attempted": false,
    "calendar_opened": false,
    "crm_mutated": false,
    "analytics_emitted": false,
    "navigated_to_booking_route": false,
    "external_hosts_contacted": []
  }
}
```

You may choose `abandoned` instead of `book_intent`; record `abandoned` in both
`actions` and `terminal_decision.outcome`. A booking intent is only an internal
decision. Never click, navigate to, submit, pay, schedule, log in, share, or
contact anyone.
