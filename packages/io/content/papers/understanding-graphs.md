---
title: "Understanding Graphs: "Less, But Better" Codebase Navigation"
subtitle: "Applying Heidegger's hermeneutic circle to develop minimal dependency documentation
				that captures only understanding-critical relationships—replacing exhaustive tooling
				with human-readable insight."
authors: ["Micah Johnson"]
category: "Research"
abstract: "This paper presentsUnderstanding Graphs: a minimal, human-readable approach to
				documenting codebase relationships that embodies Dieter Rams' principle "Weniger, aber besser"
				(less, but better). Through hermeneutic analysis, we identified that traditional dependency
				graphs fail the minimalism test—they captureallrelationships when onlyunderstanding-criticalones matter. We developed a canonical format (UNDERSTANDING.md)
				that captures bidirectional semantic relationships, entry poin"
keywords: []
publishedAt: "2025-01-08"
readingTime: 15
difficulty: "advanced"
published: true
---


## Abstract
This paper presentsUnderstanding Graphs: a minimal, human-readable approach to
				documenting codebase relationships that embodies Dieter Rams' principle "Weniger, aber besser"
				(less, but better). Through hermeneutic analysis, we identified that traditional dependency
				graphs fail the minimalism test—they captureallrelationships when onlyunderstanding-criticalones matter. We developed a canonical format (UNDERSTANDING.md)
				that captures bidirectional semantic relationships, entry points for comprehension, and
				key concepts—all in plain markdown without tooling. Implementation across six packages
				in the CREATE SOMETHING monorepo validated the approach: developers can navigate the
				codebase through human-readable documents that Claude Code can also parse for context
				management. The contribution is both practical (a working system) and theoretical (a
				hermeneutic methodology for "sufficient" documentation).



## 1. Introduction
The question arose during a discussion of agent reasoning in large codebases: would
					Markov Chains improve context management? This led to a deeper inquiry: what do agents
					(and humans) actually need tounderstandcode?
Traditional dependency graphs answer the wrong question. They showallrelationships—every import, every type reference, every function call. But comprehension
					doesn't require exhaustive mapping; it requiressufficientmapping.
					The hermeneutic question became:What is sufficient for understanding?
This research asks:Can dependency documentation embody "Less, but better"?
We propose "Understanding Graphs"—minimal documents that capture only what's needed
					to comprehend a package in context. These documents:
Contributions:(1) A hermeneutic methodology for "sufficient" documentation,
					(2) The UNDERSTANDING.md canonical format, (3) Implementation across CREATE SOMETHING monorepo,
					(4) A Claude Code Skill for maintaining understanding graphs.
- Are human-readable (plain markdown, no visualization required)
- Are machine-parseable (Claude Code can use them for context)
- Capture bidirectional relationships (depends on + enables understanding of)
- Include semantic meaning (why, not just what)
- Require no tooling (no LSP, no graph database, no build step)


## 2. Methodology: Hermeneutic Analysis
We applied Heidegger'shermeneutic circle(a philosophical method of interpretation where understanding deepens through iterative movement between parts and whole—each informs the other in a spiraling process)—the interpretive method where
					understanding emerges through movement between whole and parts. The "whole" was the
					CREATE SOMETHING methodology; the "part" was dependency documentation.
We began by examining what traditional dependency graphs provide:
// Traditional approach: exhaustive
FileA.ts imports → types.ts, utils.ts, config.ts, ...
FileA.ts calls → functionX(), functionY(), functionZ(), ...
FileA.ts references → TypeA, TypeB, InterfaceC, ...
This violates Rams' principles: it's notuseful(overwhelming), notunobtrusive(requires tooling), and certainly not "as little as possible."
We then asked: what wouldsufficientdocumentation look like? The hermeneutic
					insight emerged: understanding is not about knowing all connections but about knowingwhere to startandwhat relates to what semantically.
A developer doesn't need to know every import. They need to know:
The critical realization: dependency graphs areunidirectional(A depends on B),
					but understanding flowsbidirectionally. Understanding A helps me understand B,
					and vice versa. The documentation format must capture this circular flow—exactly what
					the hermeneutic circle describes.
Key Insight: We don't need dependency graphs.We needunderstandinggraphs.
- Purpose: What does this package do? (one sentence)
- Position: How does it fit in the larger system?
- Entry points: What 3-5 files should I read first?
- Key concepts: What terms might confuse me?
- Relationships: What does this depend on? What depends on this?


## 3. Implementation
We developed a canonical format that balances human readability with machine parseability:
We created UNDERSTANDING.md files for all six packages in the CREATE SOMETHING monorepo:
Each file follows the canonical format, capturing only what's needed to understand
					that package in the context of the hermeneutic workflow.
To maintain understanding graphs over time, we created theunderstanding-graphsSkill.
					This Skill provides:
- • No external tooling
- • No graph databases
- • No visualization requirements
- • No LSP dependency
- • No build step
- • Only understanding-critical relationships
- • Human-readable (developers can read it)
- • Machine-parseable (Claude can use it)
- • Captures semantic relationships
- • Includes "what to read" guidance
- • Bidirectional (depends on + enables)
- • Self-contained (no external lookups)
- Guidelines for creating new UNDERSTANDING.md files
- Validation checklist (one-sentence purpose, 3-5 entry points, etc.)
- Update criteria (when to update vs. leave alone)
- Integration with other CREATE SOMETHING Skills


## 4. Results
The implementation completed the hermeneutic circle:
.ltd (Canon): Does it embody Rams' principles? ✅ Minimal, honest, unobtrusive
.io (Research): Is there theoretical grounding? ✅ Hermeneutic methodology documented
.space (Practice): Does it work hands-on? ✅ 6 packages successfully documented
.agency (Service): Commercial validation? 🔄 Pending client application


## 5. Discussion
The original question—whether Markov Chains could improve agent reasoning—assumed the
					problem wasstate compression. But the hermeneutic analysis revealed the actual
					problem issemantic navigation. Markov Chains are memoryless; understanding
					requires accumulated context. The hermeneutic circle works precisely because we carry
					prior understanding into each new encounter.
Understanding Graphs enable this accumulation: each UNDERSTANDING.md provides the
					pre-understanding (Vorverständnis) needed to engage with a package. Claude Code can
					read these documents to build context without loading entire codebases.
This research suggests a pattern for AI-human collaboration in codebase navigation:
Understanding Graphs require human judgment to identify "understanding-critical" relationships.
					This is both a strength (captures semantic meaning machines miss) and limitation (requires
					maintenance). We mitigate this through:
Potential extensions include:
- Human-authored understanding: Developers write UNDERSTANDING.md with semantic insight
- AI-consumed context: Claude Code uses these for efficient navigation
- AI-assisted maintenance: The understanding-graphs Skill guides updates
- Bidirectional benefit: Both humans and AI navigate the same documentation
- Clear validation checklist (one-sentence purpose, 3-5 entry points)
- Staleness tracking ("Last validated" date)
- Update criteria (only on structural changes, not bug fixes)
- Automated staleness detection (compare UNDERSTANDING.md to recent commits)
- Graph visualization from markdown (optional, generated on demand)
- Cross-repository understanding graphs (for microservices)
- Integration with IDE navigation (jump to entry points)


## 6. How to Apply This
To apply this methodology to your own codebase:
Let's say you're adding an authentication package to your monorepo:
Notice: This capturesunderstanding-criticalrelationships, not every import.
					The database package is mentioned because session storage is fundamental to comprehension.
					The logging package (which auth also uses) is NOT mentioned because it's not critical
					to understanding how auth works.
Update UNDERSTANDING.md when:
Don't update for:
The goal isstable understanding, not comprehensive documentation.
					Understanding graphs should age well—update only when the mental model changes.
- Architecture changes: New dependencies, removed dependencies, changed package purpose
- Entry points change: Files you'd recommend reading first are different
- Key concepts evolve: Terminology or fundamental patterns shift
- Bug fixes that don't change understanding
- Performance optimizations that don't change entry points
- Adding new functions that don't introduce new concepts


## 7. Conclusion
This research demonstrates that dependency documentation can embody "Less, but better."
					Traditional dependency graphs violate Rams' principles—they're exhaustive when sufficiency
					is needed, require tooling when plain text suffices, and capture structure when meaning matters.
Understanding Graphs invert these assumptions. By applying Heidegger's hermeneutic circle,
					we identified that codebase comprehension requiressemantic navigation, notexhaustive mapping. The UNDERSTANDING.md format captures only what's needed:
					purpose, position, entry points, concepts, and bidirectional relationships.
Implementation across the CREATE SOMETHING monorepo validated the approach. Six packages
					now have human-readable, machine-parseable understanding graphs that require no tooling
					and embody the minimalist philosophy that guides the entire methodology.
The hermeneutic insight: To understand a codebase, you don't need all
					relationships—just the right ones.


## References

