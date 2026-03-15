# HUB

## Slide 1: Title [0:00]

HUB.

The governed MCP surface.

Not another connector catalog.
Not another thin proxy.
The control layer between the MCP user, Codex, and the downstream systems that actually do work.

---

## Slide 2: The problem [0:40]

Codex MCP configuration is a flat list.

That works for a handful of tools.
It breaks down when the surface gets large, provider-variable, tenant-sensitive, or destructive.

The user should not have to reason about raw connector sprawl.
The model should not browse an unbounded catalog.

---

## Slide 3: The basic relationship [1:30]

There are three actors here.

The MCP user chooses the task and the acceptable operating posture.
Codex hosts the session, lists tools, and decides when to invoke them.
The Hub governs what is visible and what is allowed to execute.

That separation matters.

---

## Slide 4: Why the Hub exists [2:20]

The Hub turns a flat MCP inventory into a house surface.

It keeps CREATE SOMETHING naming, routing, and policy in front.
It keeps commodity provider plumbing behind the surface.
And it reduces the cognitive burden on both the user and the model.

---

## Slide 5: Discovery is governed [3:10]

The Hub does not expose every downstream tool equally.

Small bounded surfaces may be exposed directly.
Large or variable catalogs move behind brokered discovery.

Search.
Describe.
Execute.

That is not ceremony.
That is governance.

---

## Slide 6: Execution is governed [4:10]

Routing is only the beginning.

Before a protected downstream call runs, the Hub resolves actor context, classifies the route, evaluates authorization, enforces quotas, applies retry policy, and emits telemetry.

The point is not just to know where a call goes.
The point is to know whether it should happen at all.

---

## Slide 7: Tenant policy [5:20]

Visibility is tenant-scoped.

Servers can be allowed or denied.
Tool prefixes can be allowed or denied.
Alias routes can prefer one provider and fall back to another.
Pending OAuth candidates stay hidden unless policy says otherwise.

The visible tool surface is a policy result.

---

## Slide 8: What the user sees [6:25]

The user should see one CREATE SOMETHING surface.

A governed route.
A clear reason when access is blocked.
A standard recovery path when a connection needs repair.

Not internal provider labels.
Not raw operational leakage.

---

## Slide 9: What Codex gains [7:15]

Codex gets a smaller, cleaner tool surface.

That improves selection quality.
It reduces destructive ambiguity.
It keeps shared controls in one place instead of scattering them across many MCP entries.

The model works better when the surface is intentional.

---

## Slide 10: What operators gain [8:05]

Operators gain a control plane.

Registry.
Bundles.
State.
Tenant routing.
Discovery packs.
Trace lookup.

One gateway.
Many downstream MCPs.
Centralized control over exposure and execution.

---

## Slide 11: The framing [9:00]

In the CREATE SOMETHING model:

Database is the substrate.
Automation is the execution layer.
Judgment is the policy layer.

The Hub lives in automation.
But it is shaped by policy artifacts at every meaningful boundary.

---

## Slide 12: The claim [9:50]

The Hub is not a convenience wrapper.

It is the difference between having MCP access and having a governed MCP product.

Policy governs exposure.
Hub governs execution.
Codex gets a surface it can reason over.
The user gets outcomes without connector sprawl.
