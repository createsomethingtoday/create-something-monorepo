# Archived LinkedIn Post: Braintrust Trace Dashboard (CREATE SOMETHING)

Archived note: Braintrust was retired in favor of Langfuse. Keep this draft as
historical campaign context only; do not use it as current project or agent
observability guidance.

**Campaign:** Reliability Observability - Braintrust
**Target:** LinkedIn (CREATE SOMETHING company page)
**Type:** Dashboard highlight + research teaser
**Asset:** `docs/BRAINTRUST_CREATE_SOMETHING_TRACE_DASHBOARD_2026-03-04.png`
**CTA:** createsomething.io/papers/braintrust-trace-unsurfacing

---

## Post

This dashboard is a good example of why raw percentages can fool us.

At first look, things seemed fine: 929 of 1,000 rows had no errors.

Then Braintrust helped us **unsurface** what was hiding underneath:
- 71 rows were errors (7.1%)
- permission + intent routing made up 76.1% of all failures
- `hub_route_intent` failed on 22 of 36 calls (61.1%)
- one control-plane event (`hub_update_state`) took 252,517 ms

Simple takeaway: a high success rate can still hide repeated failure patterns.

So we turned this into 5 ranked experiments with clear pass/fail rules:
1. LinkedIn permission preflight
2. Intent cleanup + semantic fallback
3. Provider 429 circuit breaker
4. Control-plane cache + latency stabilization
5. Tool-argument auto-repair

That is the point of observability:
not just collecting logs, but making hidden system problems visible enough to fix.

Paper + experiment specs are now published from this snapshot.

---

## Comment (Post after publishing)

Paper: createsomething.io/papers/braintrust-trace-unsurfacing

Dashboard screenshot + experiment specs:
- `docs/BRAINTRUST_CREATE_SOMETHING_TRACE_DASHBOARD_2026-03-04.png`
- `docs/internal/braintrust-experiments/README.md`

#Braintrust #MCP #ReliabilityEngineering #Observability #AgentEngineering #CreateSomething

---

## Voice Compliance

- [x] Plain-language (high-school senior readable)
- [x] Includes concrete numbers from dashboard snapshot
- [x] "Nicely Said" style: clear, direct, no jargon-heavy phrasing
- [x] Emphasizes mechanism ("unsurfacing hidden structure"), not hype
- [x] Links insight to clear execution path (ranked experiments + pass/fail criteria)
- [x] Suitable for company page distribution
