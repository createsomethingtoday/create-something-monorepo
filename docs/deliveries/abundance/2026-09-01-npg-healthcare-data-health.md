# NPG Healthcare Provider Coverage and Data Health

**Client:** The NP Group / NPG

**Platform:** Abundance

**Evaluated:** 2026-09-01

**Source:** CMS NPPES NPI Registry API v2.1

## Answer

The current Abundance sourcing result of zero or one provider is a pipeline-coverage problem, not evidence that the NPG persona has no market. A live NPPES read found **385 Family Nurse Practitioner records with a Springfield, Missouri practice location** after excluding taxonomy and mailing-address false positives.

The persona is useful for market sizing, but it is **not up to date enough for direct recruiting without a second validation layer**:

- 60 of 385 records (15.6%) received an NPPES administrative update within one year.
- 137 of 385 (35.6%) were updated within three years.
- 248 of 385 (64.4%) have not received an administrative update in more than three years.
- All 385 have a primary taxonomy, practice location, practice telephone field, and taxonomy license field.
- Only 9 of 385 expose an endpoint record.

NPPES administrative freshness does not prove current employment, availability, license standing, or recruiting consent. The Springfield cohort is therefore `degraded` for market coverage and `blocked` for direct outreach until recruiter validation.

## Coverage comparison

| NPG persona scope | Source records scanned | Matching practice-location records | Health | Why |
| --- | ---: | ---: | --- | --- |
| Family NP — Springfield, MO | 754 | 385 | degraded | 64.4% are older than three years by NPPES administrative update date. |
| Family NP — Missouri | 1,200 | 616 | degraded lower bound | The public source cap was reached and 56.7% are older than three years. |

The Missouri count is a lower bound, not a complete state census. The bounded adapter stopped at 1,200 source records and reports that limit explicitly.

## What the diagnostic now measures

The NPG persona remains human-readable as “Nurse Practitioner, Family.” The source adapter translates it to NPPES-compatible search syntax, then reapplies exact taxonomy and practice-location checks. This prevents two false results discovered during validation:

1. Sending the canonical taxonomy label directly to NPPES returns zero records.
2. NPPES geography search can match a mailing address even when the practice location is elsewhere.

Each stored record carries its NPI, normalized taxonomy and practice location, source fetch time, source payload hash, and administrative dates. Each ingestion run records records scanned, normalized, rejected, excluded, whether the public result bound was reached, and the exact providers included in that snapshot. Historical upserts therefore cannot inflate the latest cohort.

## Recruiter promotion gates

Before a record becomes a warm lead or enters Paylocity, NPG should verify:

1. The named person and intended Family NP role match.
2. Current license and standing through the appropriate primary-source verification path.
3. Current employment/availability and the correct individual contact route.
4. Lawful outreach authority or opt-in consent.
5. Recruiter approval and source/provenance retention.

Practice telephone fields from NPPES are commonly organization-level routes. They should not be treated as personal recruiting contact information.

## Reproduce

From `packages/agency`:

```bash
pnpm healthcare:coverage:npg
```

The command emits aggregate JSON only; it does not print individual provider names, NPIs, addresses, or telephone numbers.

## Evidence boundary

This is a point-in-time public-data assessment, not a candidate list, licensure verification, or completed sourcing pipeline. The original NPG workshop transcript defined the target as Family Medicine Nurse Practitioners in Springfield, Missouri, with Missouri-wide expansion when local search was empty. No additional nursing roles were inferred into the client persona registry.
