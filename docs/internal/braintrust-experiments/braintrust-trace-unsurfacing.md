---
title: "Archived Braintrust Trace Unsurfacing: Finding What Normal Aggregates Hide"
subtitle: "How a 1,000-row trace snapshot exposed clustered permission failures, routing misses, and latent control-plane stalls"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "This paper documents a CREATE SOMETHING Braintrust trace audit (project 8ca0d63b-d985-4373-9906-c253bf3f52d0) and explains why aggregate uptime metrics were insufficient to diagnose practical reliability risk. In a sample where 92.9% of rows were non-errors, Braintrust still surfaced concentrated failure clusters: LinkedIn permission denials, intent route misses, repeated 429 throttles, and extreme control-plane latency outliers. We convert these findings into ranked experiments with explicit acceptance criteria and dashboard contracts so operations can move from anecdotal debugging to measurable reliability governance."
keywords: ["Braintrust", "Observability", "MCP", "Reliability", "Experiment Design", "Dashboarding"]
publishedAt: "2026-03-04"
readingTime: 15
difficulty: "intermediate"
published: false
---

Archived note: Braintrust was retired in favor of Langfuse. Keep this document
as historical trace-audit evidence only; do not use it as current project or
agent observability guidance.

## Executive Thesis

Braintrust's practical advantage is not that it shows errors. It is that it **unsurfaces hidden operational structure** inside "mostly successful" traffic.

In this snapshot, only `71/1000` rows are errors (`7.1%`). A naive read says "system is mostly fine." The trace-level read says otherwise: two failure classes (`permission` and `intent_routing`) account for `76.1%` of all observed failures.

## Snapshot Evidence (Mar 4, 2026)

Project ID: `8ca0d63b-d985-4373-9906-c253bf3f52d0`  
Window: `Mar 1, 2026 9:55 AM` to `Mar 4, 2026 5:30 AM` (America/Chicago)  
Rows: `1,000`  
Error rows: `71`

### Error Composition

- `permission`: `30` (42.3%)
- `intent_routing`: `24` (33.8%)
- `rate_limit`: `4` (5.6%)
- `validation`: `4` (5.6%)

### Hidden Reliability Risks Unsurfaced

1. **Permission failure clustering**
   - Repeated forbidden signatures appeared in bursts (for example, "You don't have permission to access this post.").
2. **Intent-router brittleness**
   - `hub_route_intent` produced `22` errors out of `36` calls (`61.1%` error rate), concentrated around synonym variants for Sheets tasks.
3. **Throttle duplication**
   - 429 responses (`TOO_MANY_REQUESTS`, `serviceErrorCode=101`) appeared as repeatable patterns, indicating missing circuit-break behavior.
4. **Tail-latency instability**
   - `hub_update_state` reached `252,517 ms`, which is over 4 minutes for a control-plane path that should be predictable.

These are not independent bugs. They represent a reliability topology: permissions, routing, and control-plane latency interacting under real workload.

## From Trace to Ranked Experiments

We translated trace findings into five ranked experiments with exact acceptance criteria and dashboard specs:

1. EXP-01 LinkedIn permission preflight
2. EXP-02 Intent canonicalization + semantic fallback
3. EXP-03 Provider 429 circuit breaker
4. EXP-04 Control-plane cache + latency stabilization
5. EXP-05 Tool-argument auto-repair

Specification index: `docs/internal/braintrust-experiments/README.md`

## Why the Dashboard Design Matters

The dashboard uses Tufte-style high data density and direct labeling to reduce interpretive noise:

- Minimal chrome, maximal signal
- Error composition and tool reliability in one glance
- Repeated cluster table to expose recurrence rather than isolated incidents
- Latency outlier table to keep tails visible

This prevents the common failure mode where summary metrics hide operational recurrence.

## Operational Loop

Each experiment now has:

- exact acceptance criteria
- explicit metrics and formulas
- dashboard panel requirements
- baseline evidence from the March 4 snapshot

This makes reliability work executable: the team can ship, measure, and gate promotion decisions against objective thresholds instead of subjective confidence.

## Conclusion

Braintrust did not just report that errors existed. It unsurfaced where the system was structurally fragile despite high apparent throughput. That is the difference between observability as logging and observability as decision infrastructure.
