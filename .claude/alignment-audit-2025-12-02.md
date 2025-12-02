# Hermeneutic Alignment Audit
**Date**: 2025-12-02
**Methodology**: Subtractive Triad applied across all properties

---

## Executive Summary

```
╔══════════════════════════════════════════════════════════════════╗
║  THE CIRCLE IS BROKEN                                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  .ltd (Canon)      → 65% embodied, 35% aspirational              ║
║  .io (Research)    → Mature platform, tracking gaps              ║
║  .space (Practice) → DRY violations, over-engineering            ║
║  .agency (Services)→ Minimal, all exports used                   ║
║                                                                  ║
║  Primary Issue: The Canon is empty.                              ║
║  No masters, no principles, no feedback loop.                    ║
║  Philosophy documented but not operationalized.                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Triad Scores by Package

| Package | Overall | DRY | Rams | Heidegger | Critical Issues |
|---------|---------|-----|------|-----------|-----------------|
| **components** | 8.5/10 ✓ | 8.8 | 7.5 | 9.0 | Design tokens flagged as dead |
| **ltd** | 6.8/10 ○ | 2.2 | 7.8 | 9.6 | DB unseeded, feedback loop broken |
| **agency** | 6.4/10 ○ | 1.9 | 7.0 | 9.4 | Low DRY, minimal content |
| **io** | 5.4/10 ○ | 1.1 | 4.5 | 9.2 | Large files, dead exports |
| **space** | 5.1/10 ○ | 3.0 | 3.4 | 8.0 | Terminal duplication, 814-line file |

**Pattern**: Heidegger (system) scores are strong (8.0-9.6). DRY (implementation) scores are universally poor (1.1-3.0 except components).

---

## Cross-Property Disconnections

### 1. The Canon Is Empty (Critical)

**.ltd** documents masters, principles, and the hermeneutic circle, but:
- `masters` table: Not seeded
- `principles` table: Not seeded
- `quotes` table: Not seeded
- `canon_references` table: No cross-property links

**Impact**: The entire feedback loop is architectural but not operational. No experiment can link to a principle because no principles exist in the database.

### 2. @create-something/components "Unused" (False Positive)

Flagged as unused dependency in: .space, .io, .ltd, .agency

**Reality**: Components ARE used via SvelteKit's `$lib` aliasing and package exports. The triad-audit tool doesn't trace through package.json exports correctly.

**Action**: Mark as expected in baseline; improve audit tool.

### 3. fileBasedExperiments.ts Orphaned (Both .space and .io)

The configuration exists but the import path isn't in the main dependency graph.

**Root Cause**: File is imported dynamically in `+page.server.ts` but the audit tool doesn't follow server-side imports.

**Action**: Acceptable pattern for server-only config; document as intentional.

### 4. Type Definitions Scattered (Heidegger Violation)

- `paper.ts` in .io and .agency: Orphaned
- `experiment.ts` types in .space: Mixed with paper types
- Component library types: Some in `/components/src/lib/types/`, some in packages

**Action**: Consolidate all shared types in `@create-something/components`.

### 5. Voice Standards Not Enforced

**.ltd/voice** documents:
- Five Principles of Communication
- Forbidden patterns (marketing jargon)
- Required experiment elements

**Reality**: No validation. No linter. No enforcement across .io or .space.

### 6. Experiments Don't Declare Principles

File-based experiments have optional `tests_principles?: string[]` but:
- Most experiments don't populate this field
- No UI displays which principles an experiment tests
- No aggregation of evidence (which experiments validate which principles)

---

## DRY Violations (Implementation Level)

### .space: Terminal Component Duplication

Three terminal implementations:
1. `Terminal.svelte` (122 lines) — Basic
2. `TerminalExperience.svelte` (447 lines) — Over-engineered
3. `TerminalExperienceSimple.svelte` (182 lines) — Minimal

**Action**:
- Keep `Terminal.svelte` as canonical
- Delete `TerminalExperienceSimple.svelte` if unused
- Reduce `TerminalExperience.svelte` by extracting animations

### .space: CodeMirror Configuration Duplication

Both `CodeEditor.svelte` and `ExperimentCodeEditor.svelte` configure CodeMirror independently.

**Action**: Extract `createEditorState()` utility.

### .io: Large API File (854 lines)

`api/tufte/dashboard/+server.ts` — Monolithic analytics handler.

**Action**: Split into focused handlers by metric type.

---

## Rams Violations (Artifact Level)

### Dead Exports (50+ total)

| Package | Dead Exports | Location |
|---------|--------------|----------|
| space | 18 | Motion analysis framework |
| space | 4 | fileBasedExperiments.ts |
| io | 15 | PM Agent Gmail tools |
| io | 4 | fileBasedExperiments.ts |
| components | 22 | Animation/breakpoint/color tokens |

**Action**:
- Remove truly dead exports
- Document intentional public API exports (components tokens)

### Over-Engineered Components

| Component | Lines | Issue |
|-----------|-------|-------|
| `TerminalExperience.svelte` | 447 | GSAP cursor, spinner, category colors |
| `praxis/exercises.ts` | 721 | Could be split by exercise |
| `threshold-dwelling/+page.svelte` | 673 | Inline floor plan data |
| `minimal-capture/+page.svelte` | 643 | Mixed concerns |

**Question**: Does GSAP smooth cursor tracking earn its existence in a learning terminal?

### Unused Dependencies (27 total)

| Dependency | Packages | Action |
|------------|----------|--------|
| `@cloudflare/sandbox` | space | Verify usage |
| `canvas-confetti` | io | Verify usage |
| `gsap` | agency | Remove if unused |
| `lucide-svelte` | io | Verify usage |

---

## Heidegger Violations (System Level)

### Orphaned Files (19 total)

**Scripts (Expected)**:
- `verify-bindings.ts` — All packages
- `migrate-papers.ts` — space
- `seed-canon-references.ts` — ltd

**Library Files (Unexpected)**:
- `mechanism-design.ts` — space (detectStruggle logic, never called)
- `motion-extractor.ts` — space (not imported)
- `architecture.ts` — space (orphaned types)
- `recommendations.ts` — io (getNextPaper not used)

**Action**: Remove or connect orphaned library files.

### Missing Hermeneutic Connections

1. **No principle → experiment links**: Experiments don't declare which principles they test
2. **No experiment → evidence aggregation**: Results don't feed back to canon
3. **No cross-property analytics**: .ltd can't see what .space is learning

---

## Alignment Actions

### Phase 1: Seed the Canon (Critical Path)

```bash
# 1. Create seed script for .ltd
pnpm --filter=ltd exec tsx scripts/seed-canon.ts

# 2. Populate masters (Rams, Mies, Eames, Tufte, Heidegger)
# 3. Populate principles (10 Rams principles + Heidegger concepts)
# 4. Populate quotes
# 5. Create canon_references linking experiments → principles
```

### Phase 2: Unify Duplicated Code (DRY)

1. **Terminal unification**
   - Keep `Terminal.svelte`
   - Extract shared terminal logic to `/lib/services/terminal.ts`
   - Delete redundant implementations

2. **CodeMirror extraction**
   - Create `/lib/utils/code-editor.ts`
   - Export `createEditorState()` with configurable options

3. **Type consolidation**
   - Move all shared types to `@create-something/components`
   - Remove package-local type definitions

### Phase 3: Remove What Doesn't Earn Existence (Rams)

1. **Delete dead exports**
   - `mechanism-design.ts` (space)
   - `recommendations.ts` (io)
   - Unused Gmail tools (io)

2. **Reduce over-engineered components**
   - `TerminalExperience.svelte`: Remove GSAP cursor animation
   - Split 700+ line files into focused modules

3. **Audit dependencies**
   - Remove confirmed unused dependencies
   - Document why kept dependencies are needed

### Phase 4: Reconnect the Circle (Heidegger)

1. **Add `tests_principles` to all experiments**
   ```typescript
   tests_principles: ['Rams.10', 'Heidegger.Zuhandenheit']
   ```

2. **Create evidence aggregation**
   - API endpoint: `/api/evidence` aggregates experiment results by principle
   - Display on .ltd: Which principles have been validated by practice

3. **Cross-property analytics**
   - .space tracks learning outcomes
   - .io displays research metrics
   - .ltd shows ecosystem health (TriadHealth component)

4. **Enforce voice standards**
   - Pre-commit hook validates forbidden patterns
   - Required sections check for experiments

---

## Immediate Next Actions

| Priority | Action | Package | Est. Impact |
|----------|--------|---------|-------------|
| 1 | Seed canon database | .ltd | Unblocks feedback loop |
| 2 | Delete `TerminalExperienceSimple.svelte` | .space | -182 lines |
| 3 | Add `tests_principles` to experiments | .space, .io | Enables evidence |
| 4 | Extract CodeMirror utility | .space | DRY score +1 |
| 5 | Split `exercises.ts` | .space | Rams compliance |
| 6 | Remove dead Gmail tools | .io | -15 dead exports |

---

## Success Metrics

After alignment:

| Metric | Current | Target |
|--------|---------|--------|
| DRY Score (avg) | 2.0 | 6.0+ |
| Rams Score (avg) | 5.6 | 7.5+ |
| Canon Seeded | No | Yes |
| Experiments with principles | 0% | 100% |
| Feedback loop operational | No | Yes |

---

*"The circle closes when practice informs philosophy."*

This audit is itself a test of the system. If we can't apply the Subtractive Triad to our own codebase, the canon is merely aspirational.
