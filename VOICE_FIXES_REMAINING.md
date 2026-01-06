# Voice Fixes: Remaining Work

**Status**: High-priority fixes complete (6 files, commit 7e6fc07a)
**Remaining**: Medium/low priority fixes across 24 files

---

## Quick Start

### Option 1: Batch "ship" Replacements (5 files, ~$0.10)

```bash
# Navigate to repo
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"

# Apply batch spec with Haiku
claude harness /tmp/voice-fix-batch-ship.yaml --model=haiku
```

**Expected**: 5 .space lesson files updated, "ship" → context-appropriate replacement

---

### Option 2: Individual .io Papers (14 papers, ~$1.50 total)

Use the template spec for each paper:

```bash
# 1. Copy template for specific paper
cp /tmp/voice-fix-io-jargon-template.yaml /tmp/voice-fix-hermeneutic-debugging.yaml

# 2. Edit spec: replace [PAPER_NAME] with actual paper name
#    packages/io/src/routes/papers/hermeneutic-debugging/+page.svelte

# 3. Run with Haiku
claude harness /tmp/voice-fix-hermeneutic-debugging.yaml --model=haiku

# 4. Repeat for each paper
```

---

## Remaining Files

### .space Lessons (5 files)

| File | Issue | Fix | Spec |
|------|-------|-----|------|
| `lessons/craft/sveltekit-philosophy.md` | "ship code", "ship a runtime" | → "send code", "include a runtime" | `/tmp/voice-fix-batch-ship.yaml` |
| `lessons/foundations/heidegger-system.md` | "ship" in workflow | → "fulfill" | ✓ |
| `lessons/foundations/triad-application.md` | "before they ship" | → "before release" | ✓ |
| `lessons/partnership/using-learn-mcp.md` | "ship a runtime" | → "include a runtime" | ✓ |

**Action**: Run `/tmp/voice-fix-batch-ship.yaml` once → fixes all 5 files

---

### .io Papers (14 files)

Papers needing jargon definitions:

1. ✅ `norvig-partnership` - DONE (commit 7e6fc07a)
2. `understanding-graphs` - Define: hermeneutic, ontological
3. `ethos-transfer-agentic-engineering` - Define: phenomenology, Dasein
4. `code-mode-hermeneutic-analysis` - Define: hermeneutic, phenomenology
5. `subtractive-form-design` - Define: ontological, Vorhandenheit
6. `harness-agent-sdk-migration` - Define: Zuhandenheit, hermeneutic
7. `subtractive-studio` - Define: phenomenology, ontological
8. `intellectual-genealogy` - Define: phenomenology, epistemological
9. `spec-driven-development` - Define: hermeneutic, ontological
10. `hermeneutic-triad-review` - Define: hermeneutic, phenomenology
11. `hermeneutic-debugging` - Define: hermeneutic, Dasein
12. `kickstand-triad-audit` - Define: phenomenology, ontological
13. `cumulative-state-antipattern` - Define: ontological, Vorhandenheit
14. `hermeneutic-spiral-ux` - Define: hermeneutic, phenomenology, Gelassenheit

**Action**: Apply `/tmp/voice-fix-io-jargon-template.yaml` to each paper individually

---

## Cost Estimates

### Haiku Optimization (Recommended)

| Task | Files | Tokens (est) | Cost |
|------|-------|--------------|------|
| Batch "ship" fixes | 5 | ~50k | $0.10 |
| Per .io paper | 1 | ~20k | $0.04 |
| All .io papers | 13 | ~260k | $0.52 |
| **Total** | **18** | **310k** | **$0.62** |

### Comparison: Sonnet (Previous Approach)

| Task | Files | Tokens (actual) | Cost |
|------|-------|-----------------|------|
| Previous run | 6 | 5.2M | $15.60 |
| If applied to 18 | 18 | ~15.6M | $46.80 |

**Savings**: $46.18 (98.7% reduction) by using Haiku + optimized specs

---

## How the Optimization Works

### Before (Sonnet, 5.2M tokens)
1. Read 970-line VOICE_TRANSFORMATIONS_COMPLETE.md repeatedly
2. Read each file multiple times
3. Figure out what transformations to apply
4. Make one edit, re-read file, repeat

### After (Haiku, ~20k tokens per file)
1. Spec provides exact before/after strings (no figuring out)
2. Read file once, apply all edits
3. Haiku follows directive specs perfectly
4. 10x cheaper model ($0.001 vs $0.01 per 1M tokens)

**Key insight**: When you know exactly what to change, use Haiku with directive specs.

---

## Validation

After running specs, verify:

```bash
# 1. No "ship" in learner content
grep -r "\bship\b" packages/lms/src/lib/content --include="*.md"
# Expected: 0 results

# 2. Check for undefined jargon in papers
grep -rn "phenomenology\|ontological\|hermeneutic" packages/io/src/routes/papers --include="*.svelte" | \
  grep -v "(" | head -20
# Expected: Only uses with inline definitions

# 3. Build check
cd packages/io && pnpm build
cd packages/lms && pnpm build
# Expected: No errors
```

---

## Progress Tracking

### Completed ✅

- [x] Norvig paper jargon (phenomenology, ontological, Vorhandenheit)
- [x] Partnership lesson (hermeneutic circle, ship→release)
- [x] What-is-creation lesson (hermeneutic circle)
- [x] Kickstand post (abstract outcomes grounded)
- [x] Norvig post (BUILD explicit)
- [x] Canon philosophy page (simply removed, why-this-matters added)

### In Progress 🔄

- [ ] Batch "ship" fixes (5 .space lessons)
- [ ] .io paper jargon definitions (13 papers)

### Not Started ⏸️

- [ ] Additional .ltd Canon pages (2 pages)
- [ ] Transformation examples in .space lessons
- [ ] Limitations sections for remaining .io papers

---

## Next Steps

1. **Run batch "ship" fix** (immediate, $0.10):
   ```bash
   cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
   claude harness /tmp/voice-fix-batch-ship.yaml --model=haiku
   ```

2. **Process .io papers** (1-2 per session, $0.04 each):
   - Start with papers that use jargon most frequently
   - Recommended order: hermeneutic-debugging, code-mode-hermeneutic-analysis, phenomenology-heavy papers

3. **Verify and commit** after each batch:
   ```bash
   git add <changed-files>
   git commit -m "fix(voice): [specific change]"
   git push
   ```

---

## Template Specs Location

- **Batch ship fix**: `/tmp/voice-fix-batch-ship.yaml` (ready to run)
- **IO jargon template**: `/tmp/voice-fix-io-jargon-template.yaml` (copy and customize per paper)
- **Original transformations**: `VOICE_TRANSFORMATIONS_COMPLETE.md` (reference)

---

**Updated**: 2026-01-05 (after commit 7e6fc07a)
**Target Completion**: End of January 2026
**Next Audit**: April 2026 (quarterly)
