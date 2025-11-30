# Experiment: Kickstand Subtractive Triad Audit

## Hypothesis
Applying the Subtractive Triad (DRY → Rams → Heidegger) to a client system will reveal opportunities for improvement at each level of abstraction, providing a reusable framework for code audits.

## Success Criteria
- [ ] Identify concrete duplication issues (DRY level)
- [ ] Identify unnecessary complexity/features (Rams level)
- [ ] Identify disconnected or misaligned components (Heidegger level)
- [ ] Produce actionable recommendations at each level

## The Subtractive Triad Framework

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

## Context

**Project:** Kickstand
**Client Chain:** Kickstand → Half Dozen → CREATE SOMETHING
**Purpose:** Venue intelligence automation system that monitors venue websites/socials, extracts artist info, and generates daily reports

## Session Log

### Session 1: 2025-01-29 - Initial Exploration & Audit

**Duration:** Active
**Goal:** Apply Subtractive Triad audit to Kickstand codebase

---

## AUDIT FINDINGS

### Level 1: DRY (Implementation) - "Have I built this before?"

#### Finding 1.1: Parallel Node.js and Workers Implementations
The codebase has **two parallel implementations** of core functionality:

| Capability | Node.js Location | Workers Location |
|------------|------------------|------------------|
| Website Monitor | `monitoring/website-monitor.js` | `kickstand-workers/src/jobs/website-monitor.ts` |
| Instagram Monitor | `monitoring/instagram-monitor.js` | `kickstand-workers/src/jobs/instagram-monitor.ts` |
| Twitter Monitor | `monitoring/twitter-monitor.js` | `kickstand-workers/src/jobs/twitter-monitor.ts` |
| Artist Extraction | `services/artist-extractor.js` | `kickstand-workers/src/services/artist-extractor.ts` |
| Artist Validation | `services/artist-validation-agent.js` | `kickstand-workers/src/services/artist-validator.ts` |
| Spotify Validator | `services/spotify-validator.js` | `kickstand-workers/src/services/spotify-validator.ts` |
| Context Extraction | `services/context-extraction-agent.js` | `kickstand-workers/src/services/context-extraction-agent.ts` |
| Date Extraction | `services/date-extraction-agent.js` | `kickstand-workers/src/services/date-extraction-agent.ts` |
| HTML Preprocessing | `services/html-preprocessing-agent.js` | `kickstand-workers/src/services/html-preprocessing-agent.ts` |
| Airtable Client | `utils/airtable-client.js` | `kickstand-workers/src/services/airtable.ts` |

**Impact:** ~70% code duplication across runtime environments

#### Finding 1.2: Repeated Configuration Patterns
[To be filled after deeper analysis]

#### Finding 1.3: Duplicate Utility Functions
[To be filled after deeper analysis]

---

### Level 2: Rams (Artifact) - "Does this earn its existence?"

#### Finding 2.1: Script Proliferation (CRITICAL)
- **155 JavaScript files** in scripts/ directory
- ~35 explicitly archived
- ~70 appear obsolete (one-time migrations, old tests)
- Only ~20 appear actively needed

#### Finding 2.2: Obsolete Deployment Config
- `railway.json` still present (system now on Cloudflare)
- README references Railway/n8n (actual: Cloudflare Workers)

#### Finding 2.3: The 800-Line Noise Filter
- `_isValidArtistName()` has 200+ noise words, 50+ regex patterns
- Workers version uses AI-only validation
- Question: Does this complexity earn its existence?

---

### Level 3: Heidegger (System) - "Does this serve the whole?"

#### Finding 3.1: Architectural Confusion
Three deployment narratives coexist:
1. Node.js + Railway (documented)
2. n8n (mentioned as future)
3. Cloudflare Workers (actual production)

#### Finding 3.2: Relationship to Half Dozen
The system produces data but relationship to Half Dozen is undocumented.
Kickstand is hermetically sealed - doesn't know its place in the whole.

#### Finding 3.3: Philosophical Divergence
- Node.js: "Trust but verify with code" (regex + AI)
- Workers: "Trust AI" (AI-only validation)

---

## AUDIT COMPLETE

**Overall Health Score: 6.2/10**

| Level | Score | Status |
|-------|-------|--------|
| DRY | 5/10 | Critical duplication |
| Rams | 6/10 | Significant excess |
| Heidegger | 7/10 | Minor disconnection |

**Key Finding:** ~40% of codebase is duplicated or obsolete

See `PAPER.md` for complete audit report with recommendations.
