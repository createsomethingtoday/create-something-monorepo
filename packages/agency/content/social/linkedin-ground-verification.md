# LinkedIn Post: Ground — Turn Systems Thinking Into Practice

**Campaign:** Ground 0.3.6 public release
**Target:** LinkedIn (Personal — Micah)
**Type:** Longform post + verification instrument
**Asset:** `packages/agency/static/social/linkedin-ground-verification.png`
**Source Asset:** `packages/agency/content/assets/brand/agency-ground-linkedin-verification.v20260827/exports/linkedin-ground-verification-master.png`
**CTA:** createsomething.agency/products/ground

---

## Post

The people we build for at CREATE SOMETHING usually do not need to be convinced to think in systems.

They already ask the questions that matter:

- What is the source of truth?
- What is automated?
- Where does human judgment belong?
- What evidence would make this claim trustworthy?

What they need are better ways to turn those instincts into daily practice.

That is the job of the CREATE SOMETHING framework.

The practices help operators see the system clearly. The tools make those practices repeatable. The services help teams install and operate them inside real workflows.

Ground is one of those tools.

It gives a systems-minded operator a concrete way to enforce a simple rule:

You cannot claim something until you have checked it.

An AI agent should not call code dead before tracing its uses. It should not call two modules duplicates before comparing them. It should not turn missing coverage into “clean.”

Ground checks the source that is actually on disk, then returns explicit verification states: `PASS`, `FAIL`, `NOT_APPLICABLE`, `UNSUPPORTED`, or `TIMEOUT`.

That distinction matters. “No duplicates found” could mean the check passed. It could also mean no changed files needed the check, the language was unsupported, the scan timed out, or a file could not be parsed.

Only `PASS` means the relevant supported files were checked and no issue was found.

Ground can compare files, find duplicate functions, and trace orphaned modules and dead exports. It can also check environment boundaries or analyze only the files changed from a Git baseline. Version 0.3.6 has a declared analysis lane for TypeScript, JavaScript, and Svelte.

Ground is open source, available as a CLI and an MCP server, and built to work inside the agent loop.

It will not replace an operator's judgment. It gives that judgment better evidence.

That is the larger idea behind CREATE SOMETHING. Meet people who already think in systems. Give them practices, tools, and services that make that thinking operational.

---

## Comment (Post after publishing)

Ground 0.3.6 is available now:

`npm install -g @createsomething/ground-mcp`

Product and installation guide: createsomething.agency/products/ground

#OpenSource #AIEngineering #CodeAnalysis #MCP #DeveloperTools

---

## Visual Reading

- Two ivory artifacts enter the comparison ring.
- The black claim is held at the red stop until evidence exists.
- The green receipt leaves through the verified path.
- The artwork contains no baked text; the post owns the exact product claims.

---

## Evidence Anchors

- Public npm package: `@createsomething/ground-mcp@0.3.6`
- Public GitHub release: `ground-v0.3.6`
- Product contract: `packages/ground/README.md`
- Verification status implementation: `packages/ground/src/report.rs`
- TypeScript, JavaScript, and Svelte calibration: `packages/ground/tests/ga_calibration.rs`
- Release calibration and consumer smoke receipts: `ground-v0.3.6` release assets

---

## Publication Boundary

This file and its asset are approval-ready drafts. Creating them does not publish the post, add a comment, or imply third-party endorsement.
