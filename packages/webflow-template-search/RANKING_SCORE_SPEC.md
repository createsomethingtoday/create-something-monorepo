# Marketplace Recommended Score — Ranking Spec v0.1

`marketplace_recommended_score`: a **buyer-fit and corpus-quality** score, not a popularity score.

The diagnosed problem is **choice overload at browse→select** (the funnel leak), against an
**oversupplied, demand-declining** catalog (orders/template fell ~76%, 2.70→0.63, Jan-2024→May-2026).
The job of this score is to surface the *right* template fast and bury dead/weak/duplicate inventory —
**and** to double as the quality score for AI Site Builder grounding. Templates that rank well for humans
are the safest assets to retrieve for agents.

> Status: v0.1 spec. Weights are **priors to calibrate**, not truth. Ship in **shadow mode** first.

---

## 1. Score model

```
recommended_score =
  Σ ( context_weight[k] * component[k] )      # base, all components in [0,1]
  then apply TIER gate                         # hard filter / floor
  then apply MULTIPLICATIVE modifiers          # boosts & soft penalties
```

Components:

| component | search context | browse context | notes |
|---|---:|---:|---|
| `fit_score`            | **0.45** | 0.10 | dominates on query; near-constant on a category page |
| `verified_quality_score` | 0.20 | **0.35** | the key new Code Components input |
| `demand_velocity_score`  | 0.15 | 0.25 | **exposure-normalized** (see §2) |
| `engagement_score`       | 0.05 | 0.10 | low until reviews/comments ship |
| `creator_reliability_score` | 0.10 | 0.10 | capped (anti-incumbent) |
| `freshness_maintenance_score` | 0.05 | 0.10 | cold-start aid, quality-gated |

**Why two weight profiles (fix #2):** a single fixed vector is wrong in both contexts. On a search query,
semantic fit must dominate. On a generic browse page every result is already in-category, so `fit` does no
differentiating work and quality + velocity + diversity must carry the ranking. Select the profile by
request type (`queryMode` already exists in `search.ts`).

---

## 2. Component definitions

**`fit_score`** — match to the current browse/search context: category, subcategory, style, type,
free/paid intent, and **semantic query match once embeddings exist**. Pre-embeddings, this collapses to
category/style fit + diversity on browse pages (hence its low browse weight).

**`verified_quality_score`** — *measured*, never creator-claimed: responsive behavior, accessibility,
performance, component structure, variables/tokens, SEO basics, page completeness, image quality,
validator/review status. **Keep ≥2 inputs outcome-based and hard to game** (refund rate, support
responsiveness) so a fully-informed creator can't checklist their way up (anti-Goodhart). Define a
**recompute cadence** — quality regresses when platform updates break old templates (`computed_at` +
staleness trigger).

**`demand_velocity_score` — exposure-normalized (fix #1, most important).**
Raw `purchases / months_live` measures *what we showed*, not *what converts*: high-ranked templates get
more impressions → more sales → higher velocity → rank higher (rich-get-richer, entrenches incumbents —
exactly wrong for an oversupplied catalog). Use a **conversion rate given exposure**:

```
demand_velocity_score = normalize(
    0.6 * (cumulative_purchases / NULLIF(unique_viewers,0))   # conversion (exposure-normalized; fields exist today)
  + 0.4 * (cumulative_purchases / months_live)                # age-normalized recency, transitional
)
```

`unique_viewers` and `cumulative_purchases` already exist in `webflow-template-search`. Replace/augment
with **30/90-day Amplitude order + select data** once instrumentation is clean (§7). `months_live`
normalizes age but **not exposure** — conversion does.

**`engagement_score`** — low weight until purchased-template commenting ships. Then make it **structured**:
verified-purchase rating, helpfulness, unresolved-issue rate, creator response rate, update follow-through.
Apply **Bayesian shrinkage** (a 2-review 5.0 must not outrank a 200-review 4.6), verified-purchase only,
anti self-review / brigading. Free-text comments alone should barely move rank.

**`creator_reliability_score`** — multiple accepted templates, low refund/support risk, recent maintenance,
good review history, category expertise. **Capped** so large creators don't permanently crowd out newer
high-quality entrants (reinforced by the page-level diversity rule in §5).

**`freshness_maintenance_score`** — recently published/updated, **only if quality is good**. Aids cold-start
discovery; must not let weak templates jump the line (gated on `verified_quality_score`).

---

## 3. Tiers, penalties, boosts (fix #3 — not additive)

Additive `+boosts -penalties` on a 0–1 sum is fragile (magnitudes aren't commensurable). Use three stages:

**Stage A — hard tiers (gate before scoring):**

| tier | rule | effect |
|---|---|---|
| Excluded / bottom | `quality_failure` (fails validator) | removed from default discovery |
| Bottom | never-sold **& live >365d** *(unless high-quality in an underserved category)* | heavy floor |
| Low | never-sold **& live >180d** | meaningful down-rank |

> **Age-gate the dead-inventory rule.** "Never sold" alone is 837 templates (8%), but most are simply new.
> Age-gated, the rule hits far fewer: **174 (>365d)** and **302 (>180d)** — fair, and that's the right target.

**Stage B — score within tier** (§1).

**Stage C — multiplicative modifiers** (scale with the base, so they compose cleanly):

```
boosts:      underserved_category (×1.10) · cold_start_quality (×1.15, quality-gated) · editorial_certified (×1.25)
penalties:   low_velocity (<0.50 → ×0.85, <0.25 → ×0.7) · oversupplied_category (×0.85)
             · duplicate_cluster (suppress non-best, see §5)
```

**Oversupplied penalty must target weak templates, not whole categories (fix #3b).** Portfolio & Agency is
balanced (1.03×) *and* your largest demand pool; penalizing the category suppresses what buyers want.
**Interact it**: apply the oversupply modifier only when the template is *also* low-velocity
(`oversupplied AND velocity<0.5`). Never penalize a category's strong performers.

Velocity-tier populations (live templates, today): **<0.25/mo-live: 2,186 (20%)** · **<0.50/mo-live: 3,955 (36%)**.

---

## 4. `category_supply_ratio` seed (real values)

`ratio = catalog_share / demand_share`. Modifier applied **only to low-velocity templates** in the category.

| category_group (primary) | n | catalog% | demand% | ratio | modifier |
|---|---:|---:|---:|---:|---|
| Portfolio & Agency | 2315 | 21.3% | 20.7% | 1.03 | neutral |
| Technology | 1945 | 17.9% | 14.6% | 1.23 | neutral |
| Retail & E-Commerce | 233 | 2.1% | 1.6% | 1.37 | ×0.85 oversupplied |
| Health & Wellness | 194 | 1.8% | 1.2% | 1.49 | ×0.85 oversupplied |
| Architecture & Design | 164 | 1.5% | 1.1% | 1.33 | ×0.85 oversupplied |
| Environment | 77 | 0.7% | 0.3% | 2.17 | ×0.85 oversupplied |
| **UI Kit & Landing Page Components** | 42 | 0.4% | **2.0%** | **0.20** | **×1.10 underserved** |
| Education | 162 | 1.5% | 1.9% | 0.79 | ×1.10 underserved |
| Blog & Editorial | 205 | 1.9% | 2.2% | 0.84 | (near-neutral) |
| Weddings & Events | 95 | 0.9% | 1.3% | 0.66 | ×1.10 underserved |
| Community & Non-Profits | 87 | 0.8% | 1.1% | 0.72 | ×1.10 underserved |

Full per-category-group table computed from 10,871 live templates / 467,602 lifetime purchases (2026-06-03).
**Recompute periodically** — catalog and demand shares drift. (Source: Airtable Assets `📋 Cumulative Purchases`
× `ℹ️🪣Category Group(s) (Text)`; demand is lifetime purchases — Amplitude orders carry no category property.)

---

## 5. Page-level re-ranker (the actual fix for choice overload)

Raw scoring isn't enough — the leak is *too many similar choices*, not bad individual scores. After scoring,
re-rank the page:

1. **De-duplicate.** Cluster near-duplicates; rank the best, suppress the rest.
2. **Creator diversity.** Max 2 templates per creator in the first 12 results.
3. **Preserve category relevance.**
4. **Reserve 10–15% of slots for high-quality cold-start** templates (quality-gated).
5. **Keep explicit reasons** for every rank decision (`rank_reasons_json`) — this is also the transparency engine (§8).

> **Sequencing (fix #4):** true semantic dedup and `fit` both depend on **embeddings/Vectorize** (the same
> work as corpus prep — pull it forward). Pre-embeddings, dedup/diversity run on **coarse** signals only:
> same creator + near-identical title/preview hash + same primary category.

---

## 6. Implementation shape

**Side table** (don't bloat the template row). New migration `migrations/0005_template_rank_signals.sql`:

```sql
CREATE TABLE template_rank_signals (
  template_document_id        TEXT PRIMARY KEY,
  recommended_score           REAL,
  fit_score                   REAL,
  verified_quality_score      REAL,
  demand_velocity_score       REAL,
  engagement_score            REAL,
  creator_reliability_score   REAL,
  freshness_maintenance_score REAL,
  category_supply_ratio       REAL,
  tier                        TEXT,        -- 'normal' | 'low' | 'bottom' | 'excluded'
  penalties_json              TEXT,
  rank_reasons_json           TEXT,        -- creator-facing + audit
  computed_at                 TEXT
);
```

**`src/search.ts`:** add `recommended` to `TemplateSort` and a `sortClause` branch that `LEFT JOIN`s the
signals table and **falls back to the current relevance sort when no score exists**:

```sql
-- recommended (LEFT JOIN template_rank_signals rs ON rs.template_document_id = d.id)
COALESCE(rs.recommended_score, -1) DESC,
-- fallback = existing relevance ordering:
COALESCE(d.popularity_score,0) DESC, COALESCE(d.cumulative_purchases,0) DESC,
COALESCE(d.unique_viewers,0) DESC, COALESCE(d.published_date,'') DESC, d.id ASC
```

Apply the §5 re-ranker in the worker after the SQL result set (it's cross-row, not expressible in `ORDER BY`).

**Score computation:** a scheduled job (Workers cron) recomputes signals from D1 + Amplitude; writes the
side table. Embeddings (Vectorize) feed `fit_score` + dedup when ready.

---

## 7. Rollout & measurement

- **Shadow mode first:** compute scores, log what *would* rank differently, **don't change production order.**
- **Log at the impression level** (fix #5): `{template_id, position_shown, computed_score, outcome:select|purchase}`.
  A diff-of-orderings log is insufficient — impression-level data is what measures lift, feeds the
  exposure-normalized conversion in §2, and trains a later learning-to-rank model (signals = features,
  select/purchase = label).
- **Primary success metric: browse→select lift** (and *no-select session rate* — the literal leak), **not sales.**
- **Secondary:** select→purchase, orders per live template, revenue per session, creator revenue distribution,
  zero-result / short-click behavior.
- **Hard prerequisite:** clean select/impression instrumentation. The normalized analytics props are not
  currently landing in Amplitude and there is a live Safari/WebKit error regression — **fix instrumentation
  before judging shadow results**, or you're flying blind.
- **Calibration:** treat weights as v0 priors; tune against shadow-log outcomes; graduate toward
  learning-to-rank once enough labeled impressions accrue.

---

## 8. Transparency & governance (creator trust)

Suppression without transparency, on a visibly declining marketplace, while commoditizing creator work into
AI grounding, is a trust powder keg — and creators are exactly who the harvest/grounding strategy depends on.
**Transparency here is risk mitigation, not just ethics.** Be transparent at the right altitude:

| Expose (builds trust) | Don't expose (invites gaming/disputes) |
|---|---|
| The **principles** (rank for buyer fit + verified quality + real demand; down-rank dead/broken/duplicate) | The exact **weights & formula** |
| The **criteria/signals** that matter | The precise thresholds per competitor / others' scores |
| **Per-template feedback**: why *your* template ranks where it does + how to improve | Relative internals |

Three rules that make suppression safe:

1. **Down-rank ≠ delist.** Lowering discovery visibility is soft and always recoverable (low trust risk).
   *Hard delisting* is a separate, governed action: **advance notice + grace/improvement window + appeal/re-review.**
2. **Never touch purchased access.** Buyers own what they bought; ranking is a discovery decision, not revocation.
3. **Transparent criteria are safe *because* they're designed gaming-resistant** (outcome signals in §2) — an
   informed creator can only get better, not fake it. So you *can* publish the criteria.

Implementation: `rank_reasons_json` powers a **creator-facing template-health view** ("ranks lower: no sale in
365d + fails a11y check → here's how to recover visibility"). Publish the **ranking/curation policy as a
versioned, auditable artifact** (Three-Tier *Judgment* layer). Frame comms around **buyer value + recovery
path**, not pruning. Pro-creator fairness features to say out loud: exposure-normalized scoring (§2) gives new
work a fair shot vs. incumbents; cold-start reservation + creator cap (§5) protect smaller creators.

**Honest cost:** transparency raises support/appeals load and invites public criticism of the criteria, and
slows free iteration. For a strategy that runs on creator goodwill, that's the cheaper bill than a quiet-
suppression blowup.

---

## 9. Corpus dual-purpose

Every signal here is also **corpus metadata for AI Site Builder grounding**: `verified_quality_score` →
retrieval safety; exposure-normalized demand → "what actually works"; structured engagement → labeled
outcomes; `category_supply_ratio` → coverage gaps to fill. **The score that best lands the human marketplace
is the same score that ranks assets for agent grounding** — build it once, use it twice. This is why the
embedding/Vectorize work (§5) is worth pulling forward: it serves discovery now and the corpus later.
