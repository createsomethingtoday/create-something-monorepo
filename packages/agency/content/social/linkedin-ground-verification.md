# LinkedIn Post: Ground — Check Before You Claim

**Campaign:** Ground 0.3.6 public release
**Target:** LinkedIn (Personal — Micah)
**Type:** Longform post + verification instrument
**Asset:** `packages/agency/static/social/linkedin-ground-verification.png`
**Source Asset:** `packages/agency/content/assets/brand/agency-ground-linkedin-verification.v20260827/exports/linkedin-ground-verification-master.png`
**CTA:** createsomething.agency/products/ground

---

## Post

The dangerous part of AI code analysis is not that the agent lacks an answer.

It is that an incomplete check can look exactly like a clean result.

“No duplicates found” might mean there were no duplicates.

It might also mean:

- no changed files needed the check
- the language was unsupported
- the scan timed out
- a file could not be read or parsed

Those are not the same result.

We built Ground to keep them separate.

Ground checks the source that is actually on disk, then returns explicit verification states: `PASS`, `FAIL`, `NOT_APPLICABLE`, `UNSUPPORTED`, or `TIMEOUT`.

Only `PASS` means the check completed for the relevant supported files and found no issue.

Ground can compare files, find duplicate functions, and trace orphaned modules and dead exports. It can also check environment boundaries or analyze only the files changed from a Git baseline. It now has a declared analysis lane for TypeScript, JavaScript, and Svelte.

The operating rule is simple:

You cannot claim something until you have checked it.

That means an agent should not call code dead before tracing its uses. It should not call two modules duplicates before comparing them. And it should never turn missing coverage into “clean.”

Ground is open source, available as a CLI and an MCP server, and built to work inside the agent loop.

The goal is not another confident opinion about your code.

It is a receipt for what was actually checked.

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
