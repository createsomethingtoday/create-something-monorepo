---
title: "The MCP Hub as Brokered Control Plane"
subtitle: "How CREATE SOMETHING turns flat MCP catalogs into a governed house surface"
authors: ["CREATE SOMETHING"]
category: "Architecture"
abstract: "This paper argues that the CREATE SOMETHING MCP Hub should be understood as a brokered control plane, not just a simple MCP gateway. The key shift is in the interaction pattern: instead of exposing a raw list of downstream tools and letting the model call them directly, the Hub moves the client through search, then describe, then execute. That creates one house surface where identity, authorization, route classification, quota and rate controls, and telemetry can be handled before any downstream tool call runs. As of March 16, 2026, the repo contains real evidence for this design: broker-only execution in the remote runtime, session-scoped visible-tool filtering, shared route classification, policy artifacts, policy-engine infrastructure, Hub resources and UI surfaces, tests for broker routing and execution behavior, Promptfoo checks for broker-only behavior, Braintrust fleet eval scaffolding, and rollout logs from March 5, 2026. The repo also makes the current limit clear: the Hub is a strong control-plane implementation, but it is not yet a fully finished fleet-scale governance system for hundreds of tools."
keywords: ["MCP", "Hub", "Control Plane", "Brokered Discovery", "Authorization", "Policy as Artifact", "Remote MCP", "CREATE SOMETHING"]
publishedAt: "2026-03-16"
readingTime: 19
difficulty: "advanced"
published: true
---

## Executive Thesis

An MCP Hub becomes important when it stops being a convenience layer and starts being the place where a tool call has to prove it should happen.

At small scale, flat MCP catalogs are fine. A client can connect to a few servers, expose a few tools, and let the model call them directly. That works for demos, personal automation, and low-risk experiments.

At larger scale, that same setup starts to feel weak.

The problem is not only that there are more tools. The deeper problem is that there is no strong middle layer where the system can answer the questions that matter most:

- who is making this call
- what kind of route is this
- should this route be allowed
- does it need review
- is there enough budget or quota left
- how will this be traced later

The CREATE SOMETHING Hub exists to make that middle layer real. Its job is not merely to aggregate downstream MCP servers. Its job is to become the **policy-bearing execution boundary** between a client such as Codex and the downstream tool providers behind it.

The architectural move is simple:

- stop treating the tool catalog as the product surface
- make the Hub the house surface
- move interaction to a brokered sequence:
  `search -> describe -> execute`

Once that shift happens, discovery, identity, authorization, route classification, quota and rate checks, and telemetry no longer have to be scattered across every provider integration. They can converge in one place before the downstream call runs.

That is why the right framing for the Hub is **brokered control plane**, not "single MCP endpoint" and not "gateway convenience layer."

## What This Paper Claims, and What It Does Not

This paper makes four claims.

1. A flat list of direct tools is a weak default once the tool fleet gets large, messy, or risky.
2. The Hub's biggest design move is the brokered pattern:
   `search -> describe -> execute`
3. That brokered pattern creates a real place for policy to enter the execution path before the downstream call runs.
4. The repo now has enough code, tests, and docs to support this claim without pretending the system is fully finished.

This paper does **not** claim that the Hub is already a complete fleet-scale governance layer for hundreds of tools. The repo's own readiness documents say that would be too strong, and that honesty is part of what makes the paper credible.

## I. The Problem: When the Tool List Becomes the Interface

The easiest way to set up MCP is also the weakest way to scale it.

You connect servers, expose their tools, and let the client list everything. That gets you fast results. It also creates long-term problems once the system grows.

### Tool count is only the obvious problem

The first issue is tool sprawl. A broad connector surface can expose dozens or hundreds of provider-specific tools. That creates:

- long tool lists
- repeated capabilities with slightly different names
- extra context for the model to sort through
- an interface that feels more like a vendor directory than a product

But tool count is only the visible problem. The deeper problem is that the tool list itself becomes the surface contract.

### Direct exposure leaks provider plumbing

When users and models see raw provider-shaped tools, they start thinking in provider internals instead of in workflow intent.

That creates a weak surface. The house does not feel like the product anymore. The providers do.

### Direct exposure also weakens control

If every route is already exposed as a ready-to-call tool, it becomes harder to handle the questions that matter before execution:

- what tenant is this for
- what prefixes are allowed
- is this read-only or write-intent
- does this need review
- what policy applies here

In other words, routing is easy. Deciding well is harder.

| Failure mode | What direct exposure tends to do |
|--------------|----------------------------------|
| Surface leakage | The user sees provider terms instead of one house surface |
| Identity ambiguity | Actor context is harder to normalize before execution |
| Policy drift | Rules end up split across docs, habits, and connector quirks |
| Weak traceability | Calls can be seen after the fact, but not always explained clearly |

That is the real reason the Hub matters. It is not just about simplifying configuration. It is about giving the system a stronger middle layer.

![Brokered control plane overview](/images/papers/mcp-hub-brokered-control-plane-overview.svg)

*Figure 1. The key difference is not one endpoint versus many. The key difference is whether the client sees a raw provider catalog or a governed house surface in the middle.*

## II. The Main Design Move: Local Control Plane and Remote Broker

The repo implements the Hub in two related forms.

### The local Hub

The local Hub, described in `docs/MCP_HUB_CONTROL_PLANE.md` and implemented in `packages/cs-mcp-hub`, solves the workspace problem.

It adds:

- a registry of known servers
- enable and disable state
- bundle grouping
- routing configuration
- one house MCP entry in Codex config

This matters because it changes the way the repo thinks about MCP. Instead of treating MCP servers as a flat list, it treats them as something that can be organized, grouped, and controlled.

That is the first step toward a real control plane.

### The remote Hub

The remote runtime in `packages/cs-mcp-hub-remote` is where the architecture becomes stronger.

Its job is not just to proxy calls. Its job is to stage them.

The remote Hub:

- exposes one public `/mcp` endpoint
- runs in broker-only mode by default
- returns management tools instead of direct proxy tools as the main catalog shape
- exposes inspectable resources and UI surfaces

That means the Hub is not only executable. It is also visible and explainable.

### Why the split matters

The local Hub answers:

> How do we manage a lot of MCP servers inside one workspace without chaos?

The remote Hub answers:

> How do we present one governed client-facing surface while keeping downstream catalogs, auth states, and policy checks behind it?

Those are different questions, and the second one is the more important one for this paper.

## III. Brokered Discovery: Search, Describe, Execute

The center of the remote Hub design is the broker-only interaction pattern.

The default path is:

1. `hub_search_proxy_tools`
2. `hub_describe_proxy_tool`
3. `hub_execute_proxy_tool`

This is the biggest reason the Hub deserves to be called a control plane instead of a simple gateway.

### Search changes what the caller can even see

`hub_search_proxy_tools` is not just a nicer way to find tools. It creates a first filter boundary.

The search results can already reflect:

- discovery mode
- allowed servers
- session scope
- allowed tool prefixes
- max visible proxy count

That means the caller is not choosing from the full downstream universe. The caller is choosing from a smaller, already-governed slice of it.

### Describe makes the route concrete

`hub_describe_proxy_tool` gives the caller the shape of the route before execution:

- the exact proxy tool name
- the argument schema
- downstream route metadata

That matters because policy works better when it is being applied to a real route object instead of a vague idea of "some connector action."

### Execute becomes the last step, not the first

In a flat tool model, execution is often the first meaningful step.

In a brokered model, execution becomes the last step. By the time `hub_execute_proxy_tool` runs, the route has already been:

- found through a visibility boundary
- narrowed by search
- named explicitly
- described with schema and metadata

That makes the final call cleaner and easier to govern.

### Intent shortcuts still preserve the design

The Hub also exposes:

- `hub_route_intent`
- `hub_run_intent`

These are helpful for narrow workflows, but they do not break the architecture. They still sit above the brokered surface. They do not bring the system back to raw direct provider calls as the main contract.

## IV. Policy in the Execution Path

The Hub becomes a true control plane only when policy enters before downstream execution, not after the fact in docs, dashboards, or operator memory.

The execution plan in `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md` lays out the intended order:

1. resolve actor context
2. classify route
3. evaluate authorization
4. enforce quota and rate limits
5. apply retry and backoff policy
6. execute downstream call
7. emit telemetry and trace records

Not every part of that list is equally mature yet. But enough of it is real in the runtime that the paper can make a strong case.

![Execution policy path](/images/papers/mcp-hub-execution-policy-path.svg)

*Figure 2. The Hub becomes more than a gateway when it decides before it invokes.*

### Actor context comes first

The remote runtime defines a `ResolvedAccountContext` type with fields such as:

- `accountId`
- `tenantId`
- `userId`
- `sessionId`
- `toolMode`
- `allowedToolPrefixes`
- `boundHost`
- `serviceTier`
- `identitySource`

This is more than bookkeeping. It gives the system a stable answer to the question, "who is making this call?" before route authorization runs.

Without that, a large broker surface usually drifts toward either permissiveness or one-off exceptions.

### Route classification turns names into decisions

In `packages/mcp-authz/src/hub.ts`, `classifyHubRoute(...)` maps routes into access types like:

- `read`
- `write`
- `destructive`
- `auth_admin`
- `control_plane`

That step matters because it turns a raw route name into something policy can reason about.

From there, `buildHubAuthorizationRequest(...)` creates a structured `AuthorizationRequest` that includes actor, action, resource, and context.

That is the moment where the Hub stops acting like a simple router and starts acting like a judging middle layer.

### Policy artifacts are part of the runtime story

The paper would be much weaker if policy lived only in prose. It does not.

Two policy artifacts matter most here:

- `policy.hub-route-authorization.v1`
- `policy.service-tier-entitlement.v1`

The compiler and evaluator surfaces in `packages/policy-os-engine` also matter. The types `ConstraintPolicy`, `ConstraintEvaluationInput`, and `ConstraintEvaluationResult` show that policy is being treated as something executable, inspectable, and versioned.

That is what "policy as artifact" looks like once it leaves strategy language and enters real runtime work.

### Visible-tool filtering and execution blocking

The Hub's tests show concrete policy behavior, not just type definitions.

In `packages/cs-mcp-hub-remote/test/broker-routing.test.ts`, visible routes are filtered by session scope and discovery preferences. In `packages/cs-mcp-hub-remote/test/broker-execution.test.ts`, execution is blocked when:

- a session lacks prefix scope for the route
- a read-only session attempts a write-intent route
- a destructive route requires human review

These are exactly the kinds of decisions that prove the Hub is a policy-bearing surface rather than a direct proxy relay.

### Rate limits, quota, and policy status

The remote runtime also exposes `hub_policy_status` and the `hub://policy` resource.

That is important for two reasons.

First, it means rate and quota posture is inspectable by the caller rather than hidden in operator memory.

Second, it shows that policy is not just allow or deny logic. It includes runtime budget posture:

- rate-limit scope
- window sizing
- exempt servers
- quota posture

Those controls are still maturing, but they already exist as first-class control-plane concepts.

## V. Evidence in the Repo as of March 16, 2026

The paper is strongest when it stays close to recorded evidence.

### February 21, 2026: readiness is explicitly not overstated

`docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md` is one of the most useful source anchors because it makes the limit case explicit.

Its verdict is not "the Hub is done." Its verdict is:

- the Hub is a usable foundation
- it is **not yet** production-ready for the documented target of one gateway fronting hundreds of tools

That document is not a weakness in the paper. It is what keeps the paper credible.

### March 5, 2026: there is an operational rollout loop

The log file `logs/cs-hub-ops-20260305.jsonl` records an actual Hub rollout cycle:

- dry run success
- failed production rotate attempts
- failed fleet verification
- post-rollout validation success
- successful production rotate
- successful fleet deploy and fleet verify later the same day

This matters because it proves the Hub is not only a code artifact. It is already being operated, checked, and corrected through a deployment loop.

### March 7, 2026: repo-wide comparison keeps the framing honest

`docs/MCP_IMPLEMENTATION_COMPARISON_2026-03-07.md` gives the cleanest high-level positioning:

- ahead on architectural framing
- ahead on primitive separation
- mixed on centralized gateway governance

That is almost the paper's argument in compressed form. The Hub has the right surface area. The remaining question is how completely the governance layer closes around it.

### Promptfoo and Braintrust show the control plane is being tested as a control plane

The Promptfoo Hub harness is intentionally scoped to control-plane behavior:

- strict identity enforcement
- broker-only tool catalog shape
- direct proxy denial
- discovery envelope

The Braintrust `hub_coverage_matrix` eval adds a different layer:

- fleet reachability
- tool availability
- latency scoring

Together, they do not prove complete production maturity. They do prove that the Hub is being validated as a governed broker surface rather than just as a raw connector.

## VI. What Is Implemented Now, and What Is Still Open

The most important discipline in this paper is to separate **implemented architecture** from **unfinished hardening**.

### Implemented now

As of March 16, 2026, the repo supports the following claims with code and tests:

- broker-only execution is the default remote model
- direct proxy calls can be denied at the surface
- visible proxy tools are filtered by session and account context
- route classification exists as shared authz logic
- read-only and destructive restrictions are enforced in tests
- policy artifacts exist as versioned documents
- policy-engine compilation and evaluation infrastructure exists
- rate and quota posture is exposed as a Hub policy surface
- trace and correlation lookup exist as explicit Hub tools and resources
- remote Hub resources and UI surfaces make the control plane inspectable

That is enough to support a serious architecture paper.

### Still open

It is equally important to state what is not yet closed.

First, the repo's own readiness assessment still says the Hub is not yet production-ready for the full target of a single gateway fronting hundreds of tools.

Second, the execution-governance plan still names work that should become more uniformly enforced across the execution path, especially:

- retry and backoff standardization
- richer review hooks
- broader budget policy closure
- more complete operational hardening for large catalogs

Third, the Promptfoo README itself says that some validation areas are still not covered in the current harness, including stable success-path execution against a known downstream proxy tool and broader service-tier and cross-account validation scenarios.

Fourth, the local Hub still documents restart requirements for some proxy inventory refresh behavior after state changes. That is a sign of an effective control plane that is not yet fully frictionless.

The right claim, therefore, is not "finished governance plane." It is:

**strong broker/control-plane implementation with remaining execution-governance closure underway.**

## VII. Why This Architecture Matters

The market temptation around MCP is to count connectors. That is the wrong measure of strategic value.

Connector surfaces are increasingly commoditized. The harder and more defensible problem is:

**who owns the governed boundary between the model-facing surface and the tool-facing fleet?**

The Hub is the beginning of CREATE SOMETHING's answer to that question.

### For builders

The builder lesson is that a good MCP surface should not start with maximal exposure. It should start with a governed path to legitimacy.

That means:

- a registry
- visibility control
- route classification
- policy artifacts
- traceability

Without those, the model may get more power, but the system gets weaker discipline.

### For operators

The operator lesson is that a Hub is useful only if it can explain itself.

An operator does not only need to know that a tool exists. They need to know:

- why it was visible
- who could call it
- what policy allowed or blocked it
- what happened after it ran

Flat catalogs optimize for exposure. Control planes optimize for understanding and control.

### For product strategy

The broader point is that the real value is not in owning a giant connector list. The real value is in owning the **house surface** that turns connectors into governed capability.

That is why the low-cost Hub creation standard in the repo makes sense:

- config-first
- broker-first
- spend-light by default

Those rules only make sense if the Hub is understood as the boundary that matters.

## VIII. Conclusion

The CREATE SOMETHING Hub matters because it tries to turn MCP from flat tool exposure into a governed execution surface.

The biggest move is not that it uses one endpoint.

The biggest move is that it inserts brokerage before invocation:

`hub_search_proxy_tools -> hub_describe_proxy_tool -> hub_execute_proxy_tool`

That sequence gives the system a place to perform identity resolution, route classification, authorization, review logic, budget checks, and telemetry correlation before the provider call becomes real.

The repo now contains enough evidence to explain that seriously:

- broker-only execution
- session-scoped visibility
- route classification
- policy artifacts
- policy-engine infrastructure
- Hub resources and trace tooling
- tests and eval scaffolding
- operational rollout records

The repo also makes the limit clear. The Hub should not yet be described as a complete fleet-scale governance layer for hundreds of tools. It is a strong control-plane implementation with more governance work still in progress.

That is why this paper is timely.

The architecture is now concrete enough to explain clearly, and the remaining gaps are visible enough to keep the explanation honest.

## Source Anchors

- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
- `docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md`
- `docs/MCP_IMPLEMENTATION_COMPARISON_2026-03-07.md`
- `docs/LOW_COST_HUB_CREATION_STANDARD_2026-03-09.md`
- `packages/cs-mcp-hub/README.md`
- `packages/cs-mcp-hub-remote/README.md`
- `packages/cs-mcp-hub-remote/index.ts`
- `packages/cs-mcp-hub-remote/test/broker-routing.test.ts`
- `packages/cs-mcp-hub-remote/test/broker-execution.test.ts`
- `packages/mcp-authz/src/hub.ts`
- `packages/policy-os-engine/src/types.ts`
- `packages/policy-os-engine/src/hybrid.ts`
- `evals/promptfoo/hub/README.md`
- `evals/braintrust/mcp/hub-coverage-matrix.eval.ts`
- `logs/cs-hub-ops-20260305.jsonl`
