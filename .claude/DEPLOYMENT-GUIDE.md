# Deployment Guide: The Circle Closes

> Applying the alignment work to close the hermeneutic circle.

---

## Overview

This guide documents the deployment steps to fully operationalize the CREATE SOMETHING canon. After completing these steps, the hermeneutic circle will close:

```
.ltd (Philosophy) → .io (Research) → .space (Practice) → .agency (Services) → .ltd
```

---

## Prerequisites

- Wrangler CLI installed and authenticated
- Access to Cloudflare dashboard
- D1 database `ltd-db` exists

---

## Step 1: Apply Canon Seed Migration

Populate the canon database with masters, principles, and quotes.

```bash
cd packages/ltd
wrangler d1 migrations apply ltd-db --remote
```

This applies `migrations/0002_seed_canon.sql` which creates:
- **6 Masters**: Rams, Mies, Tufte, Eames, Heidegger, The Canon
- **27 Principles**: 10 Rams + 5 Tufte + 5 Heidegger + 4 Mies + 4 Eames + 3 Canon
- **25 Quotes**: 5 per master

### Verify

```bash
wrangler d1 execute ltd-db --remote --command "SELECT name FROM masters"
```

Expected output: Dieter Rams, Ludwig Mies van der Rohe, Edward R. Tufte, Charles & Ray Eames, Martin Heidegger, The Canon

---

## Step 2: Seed Canon References

Link experiments to the principles they test.

```bash
cd packages/ltd

# Generate the SQL
pnpm exec tsx scripts/seed-canon-references.ts > canon-refs.sql

# Apply to database
wrangler d1 execute ltd-db --remote --file=canon-refs.sql

# Clean up
rm canon-refs.sql
```

This creates links between:
- 9 experiments (5 from .space, 4 from .io)
- 27 principles across 6 masters
- ~30 total canon_references entries

### Verify

```bash
wrangler d1 execute ltd-db --remote --command "SELECT COUNT(*) FROM canon_references"
```

---

## Step 3: Deploy .ltd

Deploy the updated .ltd property with the new evidence API.

```bash
cd packages/ltd
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-ltd
```

### Verify

1. Visit https://createsomething.ltd/masters — Should show all 6 masters
2. Visit https://createsomething.ltd/principles — Should show 27 principles
3. Test API: `curl https://createsomething.ltd/api/evidence`

---

## Step 4: Clear Caches

Force the circle state and evidence caches to refresh.

```bash
# Clear circle state cache
curl -X POST https://createsomething.ltd/api/circle

# Clear evidence cache
curl -X POST https://createsomething.ltd/api/evidence
```

---

## Step 5: Verify The Circle Closes

Visit: https://createsomething.ltd/experiments/the-circle-closes

The experiment should now show:
1. **Self-Audit**: TriadHealth scores from triad-audit
2. **Visibility**: Hermeneutic circle with node counts and edge strengths
3. **Evidence**: Grid showing which experiments validate which principles

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `packages/ltd/migrations/0002_seed_canon.sql` | Canon seed data |
| `packages/ltd/src/routes/api/evidence/+server.ts` | Evidence aggregation API |
| `.claude/skills/canon-maintenance.md` | Full Subtractive Triad skill |
| `.claude/skills/voice-validator.md` | Voice validation skill |
| `.claude/skills/subtractive-review.md` | Code review skill |
| `.claude/skills/experiment-scaffold.md` | Experiment structure skill |
| `.claude/alignment-audit-2025-12-02.md` | Audit results |

### Modified Files
| File | Change |
|------|--------|
| `packages/ltd/scripts/seed-canon-references.ts` | Added all experiments + new principles |
| `packages/space/src/lib/config/fileBasedExperiments.ts` | Added tests_principles to all experiments |
| `packages/io/src/lib/config/fileBasedExperiments.ts` | Added tests_principles to all experiments |
| `docs/guides/SKILLS.md` | Updated skill inventory |

### Deleted Files
| File | Reason |
|------|--------|
| `packages/space/.../TerminalExperienceSimple.svelte` | Orphaned (Rams: didn't earn existence) |
| `packages/agency/.../TerminalExperienceSimple.svelte` | Orphaned (Rams: didn't earn existence) |

---

## Expected Outcomes

After deployment:

| Metric | Before | After |
|--------|--------|-------|
| Masters in database | 3 | 6 |
| Principles in database | 0 | 27 |
| Quotes in database | 0 | 25 |
| Experiments with tests_principles | 0 | 9 |
| Canon references | 0 | ~30 |
| Evidence coverage | 0% | ~33% |

---

## Troubleshooting

### "Database not available"
Ensure the D1 binding is configured in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "ltd-db"
database_id = "your-database-id"
```

### "CIRCLE_DATA not available"
Ensure the KV binding is configured:
```toml
[[kv_namespaces]]
binding = "CIRCLE_DATA"
id = "your-kv-namespace-id"
```

### Migration fails
Check if tables exist:
```bash
wrangler d1 execute ltd-db --remote --command ".tables"
```

If tables don't exist, apply the first migration:
```bash
wrangler d1 migrations apply ltd-db --remote
```

---

## The Circle Closes

When all steps are complete:

1. **.ltd** has masters, principles, and quotes (the Canon)
2. **.io** experiments declare which principles they test
3. **.space** experiments declare which principles they test
4. **canon_references** link experiments to principles
5. **/api/evidence** aggregates the evidence
6. **/experiments/the-circle-closes** visualizes it all

The philosophy is no longer aspirational—it's operational.

> *"Nothing is canonical until it survives the full cycle."*
