---
title: "The interface is becoming executable"
subject: "The interface is becoming executable"
preview: "WebMCP is one part of a larger shift: pages declare actions, packages carry capabilities, workspaces isolate execution, and proof closes the loop."
delivery_target: "2026-09-01T09:00:00-05:00"
timezone: "America/Chicago"
status: "production-candidate-test-delivered-awaiting-human-approval"
linear_issue: "CRE-1898"
hero: "/images/newsletters/the-interface-is-becoming-executable/hero.png"
audience: "confirmed subscribers only; exact audience requires operator approval"
---

# The interface is becoming executable

![Four connected layers turn a familiar website into a bounded agent system: declared actions, portable capabilities, isolated workspaces, and proof.](/images/newsletters/the-interface-is-becoming-executable/hero.png)

For years, software interfaces have explained the system to people. Agents have had to infer the rest.

They read button labels, inspect the DOM, trace a path through forms, and hope the path still means what it appears to mean. That can work. It is also a fragile way to operate a real system.

The more interesting shift now is not that agents can click more accurately. It is that the software can declare how it should be used.

OpenAI’s recent Site tools release makes that shift visible. A website can expose narrow actions to ChatGPT Work or Codex inside the built-in browser. The person and the agent share the live page and signed-in session. The page remains the interface, but it also becomes an execution contract.

WebMCP is only one layer. The same pattern is appearing in four places. Sites declare actions, capabilities travel as packages, agents work in isolated environments, and verification becomes a first-class output.

The interface is becoming executable. The operator’s job is to make it bounded.

## 1. Sites become tools

### WebMCP: declare the action instead of making the agent guess

OpenAI calls its implementation **Site tools**. It is based on the proposed WebMCP standard, which lets a page register structured tools for an agent visiting that page. The application can offer an action directly instead of asking the agent to find a control and reconstruct its meaning. Each action carries a name, description, input schema, and execution handler.

This is a meaningful change in where the contract lives. The application already knows what `set_date_range`, `find_section`, or `run_diagnostics` means. WebMCP lets the application say so directly.

The current OpenAI implementation is deliberately narrower than the full proposal. Site tools are page-scoped. ChatGPT’s built-in browser currently supports imperative JavaScript tools registered in the top-level page, not declarative form annotations or tools inside iframes. The browser reviews calls before the page executes them, and normal access and confirmation policies still apply.

That boundary is the feature. A tool definition does not grant authority. It makes a possible action legible. Authentication, authorization, validation, side-effect disclosure, confirmation, and result inspection still belong to the system around it.

We are already thinking about this for Atlas Studio and Workflow Map. A canvas should not expose “move pixels” as its operating model. It can expose the decisions underneath: inspect dependencies, propose a change, approve a bounded action, export a handoff, and read the receipt. The agent and operator can work on the same live object without pretending the visible interface is the whole system.

[Read OpenAI’s Site tools documentation →](https://learn.chatgpt.com/docs/webmcp)

## 2. Capabilities become packages

### Agent Plugins: carry the operating pattern, not another client-specific wrapper

On August 6, Google announced support for Agent Plugins 1.0.0, a vendor-neutral format maintained with Amazon, Cursor, Microsoft, OpenAI, and Vercel. The format packages Agent Skills and MCP servers in one predictable directory.

This sounds like packaging work because it is packaging work. That is why it matters.

A useful agent capability is rarely just a prompt. It may need instructions, scripts, references, and an MCP connection. Without a common package shape, the same capability gets wrapped differently for every client and begins to drift. Agent Plugins gives those pieces fixed locations while leaving client-specific extensions in their own namespace.

The specification also names what it does not solve. Version 1 defines a package format, not installation, distribution, permissions, sandboxing, provenance, or trust. A portable plugin can make a capability easier to move. It cannot tell an operator whether that capability should run.

For us, this is the supply-chain layer of agentic engineering. Policy, tools, and operating knowledge can travel together, but acceptance still needs an owner, a version, explicit dependencies, and a reviewable authority surface.

[Read the Agent Plugins 1.0.0 specification →](https://github.com/agentplugins/agent-plugins-spec/blob/bd383552/spec/1.0.0.md)

## 3. Workspaces become runtimes

### Worktrees: isolate the work before you parallelize it

Parallel agents are becoming an ordinary feature across coding environments. The less glamorous development is more important: those sessions increasingly receive their own worktree, branch, files, conversation, and task state.

GitHub’s July Copilot update added worktree support across Copilot, Claude, and Codex harnesses. Its August CLI update added an experimental command for starting a separate conversation in an isolated worktree. Codex uses the same underlying idea in its desktop app. Local work stays in the foreground while a task runs in a separate checkout. The operator can then inspect it or hand it back to the local environment.

This changes the unit of agent work. A chat is not the workspace. The workspace is a bounded runtime with a starting state, dependencies, permissions, outputs, and a disposition when the task ends.

Isolation does not make the work correct. It prevents one session from casually colliding with another and makes ownership inspectable. The operating questions remain: Which commit did the work start from? Which local changes were included? What could the environment access? Which checks ran? What happens to the worktree after review?

We use isolated worktrees for the same reason we separate draft, approval, merge, deployment, and production proof. Parallelism is useful only when state is not ambient.

[Read the Codex worktree guide →](https://developers.openai.com/codex/app/worktrees)

## 4. Proof becomes part of the interface

### Verification: a green test file is not a receipt

As agents create more code, verification cannot remain a vague final instruction.

A recent empirical study examined 86,156 test-file patches from agent-authored pull requests across 2,807 repositories. Its syntactic classifier found that 80.2 percent contained weak or no explicit oracle signals—the assertions that distinguish expected behavior from code that merely ran. The paper does not prove that four out of five agent tests are useless; syntax alone cannot establish that. It does show why the presence of a test file or a green coverage report is too weak to serve as proof.

The same problem appears at the interface. A DOM node can exist while the product is visibly broken. Integral Engineering describes replacing brittle selector scripts with plain-language expectations and an agent that uses the product through a browser. The agent reports what it expected, what it observed, and a screenshot. Their account also names the unresolved costs: nondeterminism, relevance misses, ambiguous expectations, and review fatigue.

The operator pattern is stronger than either implementation. Define expected behavior independently of the code. Observe the real surface and preserve the evidence. Keep the author of the change separate from the decision that the change is done.

This is why we build receipts into our systems. A passing command is evidence. A browser observation is evidence. A provider readback is evidence. None of them becomes completion until the relevant owner and policy say what the evidence proves.

[Read “All Smoke, No Alarm” →](https://arxiv.org/html/2606.18168)

## Operator tools from this work

These links correspond to the operating problems in this issue, not to a popularity list:

- **[OpenAI Site tools](https://learn.chatgpt.com/docs/webmcp)** — add narrow page-native actions for ChatGPT Work and Codex. Current support is limited to eligible models and workspaces, imperative tools in the top-level page, and the built-in browser’s rollout.
- **[Chrome’s secure WebMCP tools guide](https://developer.chrome.com/docs/ai/webmcp/secure-tools)** — design schemas, descriptions, confirmations, and output boundaries before exposing a page action. WebMCP remains a proposed standard under active development.
- **[Agent Plugins 1.0.0](https://github.com/agentplugins/agent-plugins-spec/blob/bd383552/spec/1.0.0.md)** — package skills and MCP servers in a portable layout. The format does not supply installation trust, permissions, provenance, or sandboxing.
- **[Codex worktrees](https://developers.openai.com/codex/app/worktrees)** — run independent tasks without disturbing the foreground checkout. A worktree isolates file state; it does not replace review, testing, or cleanup ownership.
- **[Ground MCP](https://www.npmjs.com/package/@createsomething/ground-mcp)** — analyze changed code and carry verification evidence into review. We build and use it as one layer of proof, not as an autonomous merge decision.

## The operating model underneath

1. **Declare** — expose the operation the system actually supports, with narrow inputs and visible side effects.
2. **Package** — keep instructions, tools, dependencies, and policy together without confusing portability for trust.
3. **Isolate** — give each task an owned starting state, runtime boundary, and explicit disposition.
4. **Prove** — test expected behavior, observe the real surface, and retain a receipt that another operator can inspect.

The sequence matters. A tool without a boundary is just a faster way to create ambiguity. A plugin without a trust decision is a supply-chain question. A worktree without a disposition becomes abandoned state. A test without an oracle becomes theater.

The agent is getting closer to the work. The contract has to move with it.

## What this proves—and what it does not

The recent releases support a narrow conclusion: agentic engineering is moving away from agents inferring every action from prose and pixels. More of the operating contract is becoming explicit in pages, packages, workspaces, and verification artifacts.

It does not prove that WebMCP will become the final browser standard or that one plugin format will become universal. It does not show that agent-run verification can replace human judgment. OpenAI describes WebMCP as experimental. Chrome calls it a proposed standard. The Agent Plugins specification leaves trust and permission systems to clients. The verification evidence still contains method and ownership limits.

That uncertainty does not make the direction less useful. It tells us what to build now: narrow actions, portable operating knowledge, isolated execution, and inspectable proof.

The interface is becoming executable. We should make it legible before we make it powerful.

— CREATE SOMETHING

## Email edition

Use the opening through “The operator’s job is to make it bounded,” the four numbered section summaries, the operator-tool links, and one CTA:

**Read the full operator field note →**

Required footer: subscriber-specific unsubscribe URL.

## Source and delivery notes

- Research window: May 31–August 31, 2026. Older material may be used only to establish lineage, not current availability.
- Exa reviewed: 176 returned results across 17 searches, followed by 15 full-page reads. Primary and first-hand sources were favored; duplicate and derivative coverage was excluded from claims.
- OpenAI facts were rechecked against current official Site tools documentation and the August 25 WebMCP Challenge page.
- Current repository evidence: the published-site review snippet on `origin/main` still references the older `navigator.modelContext` path and suppresses registration failures. The draft therefore describes CREATE SOMETHING’s WebMCP direction, not a completed current implementation.
- “The interface is becoming executable” is our synthesis across the four categories, not a quoted industry term.
- The “All Smoke, No Alarm” result is based on a syntactic oracle taxonomy over patches. It is evidence that test presence is an insufficient proxy, not a direct execution study proving each test ineffective.
- Delivery remains blocked until final human read, hero approval, email render, desktop/mobile and image-blocked proof, test send/readback, exact audience approval, and schedule receipt.
