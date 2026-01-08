---
title: "The Hermeneutic Triad"
subtitle: "How Reviewers, Harness, and Agent Collaborate—a case study in parallel peer review
				revealing and resolving DRY violations."
authors: ["Micah Johnson"]
category: "Case Study"
abstract: "This paper documents a live case study from December 2025 where the CREATE SOMETHING harness
				orchestrated parallel peer reviews that identified critical DRY violations in newsletter
				subscription code. Three specialized reviewers—architecture, security, and quality—each
				analyzed the same codebase simultaneously, producing complementary findings. The architecture
				reviewer detected 4 pairs of nearly-identical files across packages; the security reviewer
				identified IDOR vulnerabi"
keywords: []
publishedAt: "2025-01-08"
readingTime: 12
difficulty: "intermediate"
published: true
---


## Abstract
This paper documents a live case study from December 2025 where the CREATE SOMETHING harness
				orchestrated parallel peer reviews that identified critical DRY violations in newsletter
				subscription code. Three specialized reviewers—architecture, security, and quality—each
				analyzed the same codebase simultaneously, producing complementary findings. The architecture
				reviewer detected 4 pairs of nearly-identical files across packages; the security reviewer
				identified IDOR vulnerabilities; the quality reviewer noted inconsistent error handling. This
				paper analyzes how thishermeneutic triad(a three-part interpretive system where different perspectives—reviewers, harness, agent—work together to reveal understanding that no single perspective could achieve alone)—the interplay between reviewers, harness, and
				agent—creates a self-correcting system that surfaces issues no single perspective would catch.



## I. The Incident: Taste Harness Pauses
On December 23, 2025, the CREATE SOMETHING harness was running the "Taste Collections &
					LLM Context" spec—a 6-feature project to enable users to curate design references and
					expose them to AI agents. After completing 2 of 6 features, the harness paused with
					an unexpected verdict:
The harness had been implementing features, creating code, and making commits. But
					when it reached a checkpoint, it invoked three parallel peer reviewers. The
					architecture reviewer's verdict—FAIL—triggered a pause. What had it found?


## II. The Three Reviewers: Parallel Perspectives
The harness employs three specialized reviewers, each analyzing the same codebase
					through a different philosophical lens:
Asks: "Does the structure serve the whole?"
Applies DRY at the system level. Detects duplicate modules, violated
							boundaries, excessive coupling.
Asks: "Can this be exploited?"
Scans for OWASP vulnerabilities, authentication gaps, authorization flaws,
							injection risks.
Asks: "Is this maintainable?"
Evaluates error handling, type safety, code clarity, test coverage,
							documentation.
These reviewers runin parallel—each receives the same git diff and file
					context but applies independent analysis. Their prompts are generated from the
					changed files, ensuring review focus matches implementation scope.
The three reviewers form ahermeneutic triad—three interpretive lenses that
					together reveal what no single lens would show. This mirrors the Subtractive Triad:


## III. What They Found: The DRY Violations
Each reviewer produced findings, but the architecture reviewer's were critical. It
					identified4 pairs of nearly-identical filesduplicated across packages:
The architecture reviewer had detected what the coding agent hadn't noticed: the agent,
					working feature-by-feature, had created identical implementations for different
					properties rather than extracting shared functionality.
Meanwhile, the security reviewer flagged a different issue in the same area:
The security and architecture reviewers saw different problems in overlapping code.
					Neither finding was wrong; both were necessary.


## IV. The Harness Response: Pause and Surface
When the architecture reviewer's verdict was FAIL, the harness entered a decision
					tree. Its configuration specified:
Becausearchitecturewas a blocking reviewer and it
					returned FAIL with critical findings, the harness:
Heidegger's concept of theclearing(Lichtung) is relevant here. The pause
					creates a space where what was hidden becomes visible. The agent was working—hammering
					away—and the code was ready-to-hand. The reviewer's FAIL verdict made the duplicationpresent-at-hand: visible as a problem rather than invisible as tool-use.

> "The clearing is not a bounded space but the opening in which beings can show
						themselves."


## V. The Resolution: Agent as Healer
With the findings surfaced, the agent (Claude Code) could address them. The resolution
					followed a pattern:
The resolution reduced ~900 lines of duplicated code to ~200 lines of shared code
					with property-specific configuration. Each consumer now imports from the shared
					module and passes its property identifier.
With the fix committed, the agent closed the finding issues:


## VI. Analysis: Why This Works
This case study reveals several properties of the hermeneutic triad approach:
The coding agent, focused on completing features, naturally creates local solutions.
					It wasn't "wrong" to create similar code in different packages—each implementation
					worked correctly. Only the architectural lens, examining cross-package structure,
					could see the duplication.
By configuring architecture as a blocking reviewer, the harness ensured DRY violations
					couldn't accumulate silently. The pause forced attention to a structural issue that
					would otherwise compound.
Each finding became a Beads issue. This means:
The same agent that created the duplication could resolve it. This isn't a flaw—it's
					the system working as designed. The agent operates in two modes:
Working within the codebase, implementing features, tool-use is transparent.
							Duplication is invisible because each file works.
Examining the codebase as object, seeing structure rather than function.
							Duplication is visible because we're analyzing, not using.
- Findings can be prioritized alongside regular work
- Related findings can be grouped (same root cause)
- Resolution is tracked with commit references
- Similar findings from other harnesses can be closed together


## VII. The Broader Pattern: Self-Correcting Systems
The triad of harness, reviewers, and agent forms aself-correcting system—a
					hermeneutic circle at the scale of software development:
This is not a waterfall but a circle. Each iteration improves understanding:
The Subtractive Triad manifests at multiple levels:
- Agent understands codebase better through fixing revealed issues
- Reviewers calibrate detection based on what agent creates
- Harness learns pause thresholds from human overrides


## VIII. Implications: Reviewer Design
This case study suggests principles for designing effective review triads:
Reviewers should cover different concerns. Our triad—architecture, security, quality—
					has minimal overlap. Each can fail independently, and each provides unique signal.
Not all reviewers should block. In our configuration:
Running reviewers in parallel (not sequence) is essential. Total review time equals
					longest single reviewer, not sum of all. For large diffs, this saves significant
					time.
Findings become issues in the same tracker as features. This means:
- Architecture: Blocks (structural issues compound)
- Security: Blocks (vulnerabilities are critical)
- Quality: Advisory (minor issues can queue)
- Humans can reprioritize findings relative to features
- Multiple runs can reference the same underlying issue
- Resolution ties to commits in the same workflow


## IX. How to Apply This
This section shows how to configure parallel peer review in your own autonomous
					development workflows. The pattern works for any harness system that supports
					checkpoints and issue creation.
Let's say your agent builds three similar API routes across different packages:
The architecture reviewer detects:
Meanwhile, the security reviewer flags:
Harness creates issues for both findings, pauses, and alerts human. Agent then:
Use this pattern when:
Don't use for:
Over time, tune your reviewers based on false positive rates:
The goal is a self-correcting system, not a gate-keeping system. Reviewers should
					catch real issues while allowing good work to proceed. Calibrate continuously based
					on outcomes.
- Autonomous work:Agent-driven development with harness orchestration
- Multi-file changes:Checkpoints cover significant scope (3+ files)
- Quality gates matter:Structural or security issues can't accumulate silently
- Hermeneutic continuity:Work spans multiple sessions, understanding must persist
- Single-file changes or trivial fixes
- Exploratory prototyping (no established patterns yet)
- Emergency hotfixes (review adds latency)
- Human-driven development (peer review happens via PR)


## X. Conclusion: Collaboration, Not Control
The hermeneutic triad—reviewers, harness, and agent—demonstrates a form of AI
					collaboration that isn't about control but about complementary perspectives. Each
					element sees what others cannot:
Together, they form a system that is more capable than any element alone. The 3
					critical DRY violations were not bugs—the code worked—but architectural debt that
					would compound. The parallel review caught them before they spread further.
The duplication was resolved in a single commit. The harness resumed. The remaining
					features continue to be implemented—now with a shared newsletter module that prevents
					future duplication. The system learned, not through explicit training, but through
					architectural enforcement.
This is the promise of the hermeneutic triad: not AI that never errs, but AI that
					catches its own errors through structured self-reflection.
- The agent sees how to implement; it cannot see duplication it creates
- The reviewers see patterns across files; they cannot implement fixes
- The harness sees workflow; it cannot analyze or create

> "The hermeneutic circle is not a vicious circle but a virtuous one.
						Understanding advances through the interplay of parts and whole."


## Appendix: Incident Timeline
2025-12-23T03:34 — Harness started from taste-collections-llm.md
2025-12-23T03:35 — Session #1: Reading Insights Dashboard (complete)
2025-12-23T03:40 — Session #2: Agent Context API (complete)
2025-12-23T03:45 — Checkpoint triggered, peer review started
2025-12-23T03:46 — Parallel reviews: security, architecture, quality
2025-12-23T03:46 — Architecture: FAIL (6 findings, 3 critical)
2025-12-23T03:46 — Harness paused, findings created as issues
2025-12-23T03:52 — Agent addresses DRY violations
2025-12-23T03:55 — Creates @create-something/components/newsletter
2025-12-23T03:57 — Updates io, space, agency to use shared module
2025-12-23T03:58 — Type-check passes, commit created
2025-12-23T03:59 — Findings closed, harness resumed


## References

