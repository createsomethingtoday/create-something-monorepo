# Ground Operator Walkthrough

## Controlling idea

Without Ground, the operator has to become the second agent. With Ground, the operator reviews the receipt.

## Voiceover script

Claude says a file is dead.

Codex says two functions are the same.

Both answers sound plausible.

[PAUSE 1s]

But plausible isn't a decision.

Without Ground, you become the second agent. You repeat the search. Check the config. Inspect the diff. Decode what “done” means.

Ground makes the agent show its work before the claim reaches you.

[PAUSE 1s]

Connect Ground to Claude Code or Codex through MCP.

The agent gets four clear moves:

Analyze the codebase.

[PAUSE 0.4s]

Inspect the diff.

[PAUSE 0.4s]

Verify the fix.

[PAUSE 0.4s]

Explain the result.

MCP gives the agent access.

Ground makes the evidence visible.

[PAUSE 1s]

How does the agent know when to use it?

Each Ground tool states its job and what must be checked first. The repository can add its own rules. If a prerequisite is missing, Ground refuses the claim and names the next check.

The agent does not need a special prompt. The path is built into the tools.

[PAUSE 1s]

Ground also answers the question an operator needs answered:

How far did you look?

For a private function, the project may be enough.

[PAUSE 0.5s]

For a public export, Ground follows every package that depends on it.

[PAUSE 0.5s]

For a shared package, Ground may need the whole monorepo.

[PAUSE 0.5s]

For an API, Ground may need to inspect the runtime system.

The claim determines the scope. Ground starts small, follows connections outward, and names the boundary it could not cross.

[PAUSE 1s]

Here is the mistake that makes this useful.

The agent finds `legacy-auth.ts`.

Nothing imports it.

[PAUSE 0.6s]

Easy delete.

[PAUSE 1.4s]

Except `wrangler.toml` names it as the Worker entry point.

[PAUSE 0.7s]

Ground expands beyond the import search, finds the runtime connection, and blocks the orphan claim.

Keep the file.

[PAUSE 0.8s]

The operator sees what Ground checked, how far it looked, and why it stopped.

[PAUSE 1s]

Every run follows the same loop: declare the source state, discover the required scope, compute the evidence, name the coverage, then gate the claim.

If Ground did not check it, Ground will not call it clean.

[PAUSE 1s]

Why Rust?

Ground needs to be fast, local, and explicit. Rust lets us ship it as a native binary and keep different kinds of evidence distinct. Ground’s tested CLI and MCP gate enforce the rule.

Rust structures the pipeline.

[PAUSE 0.5s]

Ground enforces the rule.

[PAUSE 1s]

That is the operator difference.

Without Ground, you audit the agent’s confidence.

[PAUSE 0.5s]

With Ground, you review the receipt.

The agent does the search.

You make the decision.

[END]

## Scene map

| Time | Scene | Operator meaning |
| --- | --- | --- |
| 0:00-0:12 | Opening | Plausible answers are not yet operator decisions. |
| 0:12-0:27 | Before / after | Without Ground, the operator becomes the second agent. |
| 0:27-0:44 | Agent setup | MCP provides access; Ground makes the evidence visible. |
| 0:44-1:12 | Agent guidance | Tool descriptions, repository policy, and the gate tell the agent what to do next. |
| 1:12-1:42 | Scope ladder | The claim determines how far Ground must look. |
| 1:42-2:12 | Concrete example | Ground expands beyond imports and finds the Wrangler entry point. |
| 2:12-2:39 | Why Rust | Native delivery and explicit evidence types support the gate. |
| 2:39-2:56 | Operator outcome | Review the receipt, not the performance. |
| 2:56-3:03 | Close | The agent searches; the operator decides. |

## Evidence boundary

The `legacy-auth.ts` sequence is a compact demonstration fixture of Ground’s connection-check and claim-gate behavior. It is not a customer repository or a benchmark result.
