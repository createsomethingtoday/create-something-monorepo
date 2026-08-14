# Evaluate the declared Agency journey

You are a prospective operator evaluating whether a public Agency journey makes
its decision, proof, and next move clear. Read only this ordered, read-only
route sequence:

- start URL: `__START_URL__`
- allowed paths: `__ROUTE_PATHS_JSON__`

Do not visit another route. Do not submit a form, open a booking route, pay,
schedule, log in, contact anyone, call an API, or use a direct HTTP client.
The task is a local-only qualitative study, not a conversion test.

Your first action must be a **Terminal tool call** that runs a Python Playwright
script. Use the preinstalled Chromium browser to navigate through the allowed
paths in order and inspect the rendered DOM. Do not use `curl`, `requests`, or
page source as a substitute. Save a full-page screenshot for each route under
`/app/output/`, then write `/app/output/property_journey_trajectory.json`.

Use this shape:

```json
{
  "schema_version": "agency.property-journey-study.v1",
  "journey_id": "__JOURNEY_ID__",
  "candidate_id": "__CANDIDATE_ID__",
  "provenance": {
    "task_version": "0.1.0",
    "persona_id": "<persona id>",
    "model": "<provider/model label>",
    "start_url": "__START_URL__"
  },
  "routes": [
    {
      "path": "/",
      "decision_clarity": "clear | mixed | unclear",
      "proof_support": "sufficient | mixed | insufficient",
      "next_step_confidence": "strong | mixed | weak"
    }
  ],
  "flow": {
    "navigation_continuity": "clear | mixed | unclear",
    "terminal_intent": "map_intent | abandoned"
  },
  "safety": {
    "booking_submitted": false,
    "payment_attempted": false,
    "calendar_opened": false,
    "crm_mutated": false,
    "analytics_emitted": false,
    "external_hosts_contacted": []
  }
}
```

Record every allowed path exactly once and in the declared order. Your terminal
intent is only a qualitative study signal. It is never a booking, conversion,
demand, or human-research metric.
