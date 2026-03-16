# Hub Agent Performance Checklist

Use this checklist when the goal is simple: make the Hub fast for clients and agents without over-engineering the stack.

This is not a rewrite plan. It is an operating checklist for improving first-turn success, reducing latency, and shrinking agent loop cost in the current TypeScript + Workers architecture.

## Core rule

Optimize agent turns before optimizing runtime internals.

If an agent takes fewer discovery attempts, fewer reconnect loops, and fewer follow-up prompts, the system feels faster even when CPU time is unchanged.

## What "fast" means here

For this stack, speed is mostly:

- fewer round trips to find the right tool
- fewer failed or empty discovery searches
- fewer auth retries
- fewer "needs_input" responses for common prompts
- lower time to first useful tool execution

It is only secondarily about:

- raw request throughput
- memory efficiency
- language/runtime performance

## Priority order

Work in this order.

1. Discovery quality
2. Routing quality
3. Transport latency
4. Tool-surface design
5. CPU and memory profiling

Do not invert this order without evidence.

## Checklist

### 1. Compact discovery must be correct

- Compact mode should expose the tools an agent actually needs for a lane.
- Avoid catalog starvation where one large server consumes the full `maxProxyTools` cap.
- Prefer stable, fair ordering across active servers.
- Verify through the real client path, not only local shell scripts.

Relevant docs:

- [MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)
- [REMOTE_MCP_IDENTITY_STANDARD.md](./REMOTE_MCP_IDENTITY_STANDARD.md)

### 2. First-turn routing should succeed on common prompts

- Treat natural-language routing as product logic, not best-effort glue.
- Add parser rules for real prompts seen in production.
- Add regression tests for every prompt shape that previously failed.
- Prefer deterministic extraction before model fallback when the pattern is stable.

Good target:

- the first user prompt becomes a valid tool call without a clarification turn

### 3. Keep the visible surface small

- Expose direct tools only for high-frequency, low-ambiguity workflows.
- Keep everything else behind brokered discovery.
- Avoid giant `tools/list` responses that force clients or agents to search a noisy catalog.
- If a lane only needs a handful of servers, do not expose the whole fleet.

### 4. Cache the expensive edges

Cache only where correctness is preserved.

- session resolution
- discovery catalog assembly
- downstream `tools/list` metadata
- partner/account/pin reads

Be explicit about TTLs and invalidation triggers.

### 5. Make auth failure recovery cheap

- Classify reconnect and missing-scope failures clearly.
- Return the next reconnect step in the tool result.
- Do not force the agent to infer whether it should reconnect, retry, or ask the user.
- Preserve the correlation id across retries.

### 6. Prefer config over code when lane behavior differs

Before adding new logic, check whether the problem is really:

- wrong discovery pack
- wrong active server set
- wrong compact cap
- wrong direct-tool allowlist
- wrong auth or identity mode
- wrong tenant-routing policy

Many "performance" complaints are really configuration mismatches.

### 7. Profile only after the above is stable

Only profile hot paths after discovery and routing are already correct.

Good profiling targets:

- session resolver latency
- downstream connect latency
- downstream tool execution latency
- hub-side discovery assembly time
- policy evaluation latency

## Telemetry KPIs

Track these consistently. They are better indicators of agent speed than generic CPU metrics.

### Discovery KPIs

- `discovery_empty_rate`
  - Percent of `hub_search_proxy_tools` calls that return `total = 0`.
- `discovery_miss_after_active_server`
  - Cases where a server is active in compact discovery but has `visibleProxyTools = 0`.
- `visible_proxy_tool_count`
  - Total visible tools for the caller.
- `visible_proxy_tool_count_by_server`
  - Visible tools per active server.

### Routing KPIs

- `first_turn_success_rate`
  - Percent of user requests that complete without follow-up clarification.
- `router_needs_input_rate`
  - Percent of router calls returning `status = needs_input`.
- `router_fallback_rate`
  - Percent of requests that require model-based routing instead of deterministic routing.
- `wrong_tool_retry_rate`
  - Requests that execute one tool, fail semantically, then switch tools.

### Auth KPIs

- `reconnect_prompt_rate`
  - Percent of downstream failures that require a connect-link or re-auth step.
- `auth_retry_success_rate`
  - Percent of reconnect flows that succeed on the next attempt.
- `missing_scope_rate`
  - Percent of failures classified as missing OAuth scopes.

### Latency KPIs

- `time_to_first_useful_tool_ms`
  - Request start to first successful downstream tool result.
- `hub_discovery_latency_ms`
  - Time to build visible discovery catalog for a caller.
- `session_resolution_latency_ms`
  - Resolver round-trip duration.
- `downstream_tool_latency_ms`
  - Per-tool execution duration, median and p95.

### Surface-quality KPIs

- `tools_list_size`
  - Number of tools returned to the client.
- `tool_searches_per_completed_task`
  - How many discovery searches an agent needs before success.
- `follow_up_questions_per_completed_task`
  - User-facing friction per successful task.

## Suggested thresholds

Use these as operating targets, not hard SLA promises.

- `discovery_empty_rate < 5%` for mature lanes
- `router_needs_input_rate < 15%` on common workflows
- `time_to_first_useful_tool_ms < 3000` for cached/common flows
- `tool_searches_per_completed_task <= 2` for common workflows
- `follow_up_questions_per_completed_task <= 1` for common workflows

If those targets are missed, inspect discovery and routing before touching runtime internals.

## Review cadence

When a lane feels slow, review in this order:

1. Is the right server active in compact discovery?
2. Is the visible tool count sensible for the lane?
3. Is the router missing a common prompt shape?
4. Is auth causing reconnect loops?
5. Is the downstream tool itself slow?
6. Only then ask whether the implementation language or runtime is the problem.

## When Rust would actually be justified

Rust becomes interesting only if one of these is true:

- policy evaluation becomes a real CPU bottleneck
- discovery assembly becomes too expensive under sustained load
- cold start or memory pressure is a measured production constraint
- a small critical core would benefit from stronger compiled guarantees

Even then, prefer a narrow boundary:

- keep Hub orchestration, MCP surfaces, and Workers integration in TypeScript
- move only a proven hot path into a smaller compiled component

## Current recommendation

Stay in TypeScript.

Spend engineering effort on:

- better compact discovery defaults
- better deterministic routing
- cleaner auth recovery
- tighter telemetry around agent friction
- fair and predictable visible-tool selection

That is the highest-leverage path for client and agent speed in this repository today.
