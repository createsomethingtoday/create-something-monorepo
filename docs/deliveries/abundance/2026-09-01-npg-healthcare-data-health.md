# NPG Healthcare Provider Coverage and Data Health

**Client:** The NP Group / NPG

**Platform:** Abundance

**Evaluated:** 2026-09-01

**Discovery source:** CMS NPPES NPI Registry API v2.1

**Research review:** 44 Exa results across CMS, Missouri licensing, credentialing, and federal exclusion sources

## Answer

The current Abundance sourcing result of zero or one provider is a pipeline-coverage problem, not evidence that the NPG persona has no market. A live NPPES read found **385 Family Nurse Practitioner records with a Springfield, Missouri practice location** after excluding taxonomy and mailing-address false positives.

The persona is useful for market sizing, but it is **not up to date enough for direct recruiting without a second validation layer**:

- 60 of 385 records (15.6%) received an NPPES administrative update within one year.
- 137 of 385 (35.6%) were updated within three years.
- 248 of 385 (64.4%) have not received an administrative update in more than three years.
- All 385 have a primary taxonomy, practice location, practice telephone field, and taxonomy license field.
- Only 9 of 385 expose an endpoint record.

NPPES administrative freshness does not prove current employment, availability, license standing, or recruiting consent. The Springfield cohort is therefore `degraded` for market coverage and `blocked` for direct outreach until recruiter validation.

NPPES is the right identity and market-discovery backbone, but it is not a current recruiting database. “Updated daily” describes CMS publication latency after a submitted change. It does not mean every provider reviewed the record recently. Providers generally must report changes within 30 days, while periodic attestation is optional. An old `last_updated` or `certification_date` is therefore uncertainty, not proof that the record is wrong. See [CMS NPPES dissemination](https://www.cms.gov/medicare/regulations-guidance/administrative-simplification/data-dissemination) and the [CMS NPPES FAQ](https://www.cms.gov/files/document/nppes-frequently-asked-questions.pdf).

| Use case | NPPES suitability |
| --- | --- |
| Confirm a provider/NPI exists | Strong |
| Identify possible Family NPs by geography | Useful but noisy |
| Verify current practice location | Weak-to-moderate |
| Verify active license or discipline | Not sufficient |
| Establish current employment or availability | Not relevant |
| Obtain a valid recruiting contact or consent | Not relevant |

A historical HHS-OIG review found inaccuracies in 48% of sampled NPPES records, primarily addresses. The review dates to 2013 and is evidence of the structural limitation, not a current 2026 error rate. See the [HHS-OIG report](https://oig.hhs.gov/reports/all/2013/improvements-are-needed-to-ensure-provider-enumeration-and-medicare-enrollment-data-are-accurate-complete-and-consistent/).

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

Each stored record carries its NPI, normalized taxonomy and practice location, source fetch time, source payload hash, and administrative dates. Each ingestion run records records scanned, normalized, rejected, excluded, whether the public result bound was reached, and an immutable copy of every provider included in that snapshot. Later provider changes therefore cannot rewrite historical NPG evidence or inflate the latest cohort.

Coverage is also degraded when more than 5% of canonical source records fail normalization. This keeps a small surviving subset from appearing healthy when the upstream batch is materially malformed; the report exposes the normalized count, rejected count, and rejection rate as source-health evidence. The ingestion ledger separately records the included count, so `source result count = included + rejected + excluded`; the pre-filter normalized count remains a distinct, intentionally overlapping quality denominator.

## Pipeline states

The pipeline exposes two individual-provider states:

- `coverage_candidate`: discovered through NPPES and eligible for market analysis. This is the fail-closed default.
- `recruiter_ready`: every required verification gate has a current passing receipt from an allowed source.

The cohort report exposes separate `coverage_candidate_count` and `recruiter_ready_count` values. A provider cannot reach `recruiter_ready` because an NPPES field happens to contain a license number, practice telephone, or recent administrative date.

## Recruiter promotion gates

Before a record becomes a warm lead or enters Paylocity, NPG must retain a current passing receipt for every gate:

| Gate | Allowed evidence source | Current integration state |
| --- | --- | --- |
| License or practice privilege | Missouri Board/Nursys | Evidence contract implemented; source adapter not yet live |
| Discipline | Missouri Board/Nursys | Evidence contract implemented; source adapter not yet live |
| Federal exclusion | HHS-OIG LEIE | Evidence contract implemented; source adapter not yet live |
| Practice or employment corroboration | CMS Doctors & Clinicians or NPG first-party verification | Evidence contract implemented; source adapter not yet live |
| Validated recruiting contact route | NPG first-party verification | Evidence contract implemented; operator capture surface not yet live |
| Outreach authority or consent | NPG first-party verification | Evidence contract implemented; operator capture surface not yet live |
| Recruiter approval | NPG first-party verification | Evidence contract implemented; operator capture surface not yet live |

Each receipt records the NPI, gate, source system, pass/fail outcome, verification time, validity boundary, and optional source reference/hash. It does not store the underlying email, telephone number, address, or consent text. Missing, expired, future-dated, failed, or wrong-source evidence leaves the provider in `coverage_candidate`.

Practice telephone fields from NPPES are commonly organization-level routes. They should not be treated as personal recruiting contact information.

## Corroboration layers

1. **NPPES:** free discovery universe, stable NPI, taxonomy, and possible geography.
2. **Missouri Board/Nursys:** active RN/APRN license, practice privilege, and discipline. Missouri treats Nursys verification as primary-source equivalent, and e-Notify can monitor changes. See [Missouri Board of Nursing verification](https://pr.mo.gov/nursing-verification.asp).
3. **CMS Doctors & Clinicians:** monthly cross-check for Medicare-active specialty, group affiliation, practice location, and telephone using PECOS and claims evidence. It does not cover clinicians outside the publication criteria. See the [CMS national downloadable file](https://data.cms.gov/provider-data/dataset/mj5m-pzi6).
4. **HHS-OIG LEIE:** monthly federal exclusion screening. See [LEIE downloads](https://oig.hhs.gov/exclusions/leie-database-supplement-downloads/).
5. **NPG first-party verification:** recruiter-confirmed employment or availability, a validated contact route, outreach authority, and approval.

Commercial provider or claims data remains a later option only if these free layers leave a measured coverage gap.

## Reproduce

From `packages/agency`:

```bash
pnpm healthcare:coverage:npg
```

The command emits aggregate JSON only; it does not print individual provider names, NPIs, addresses, or telephone numbers.

## Evidence boundary

This is a point-in-time public-data assessment, not a candidate list, licensure verification, or completed sourcing pipeline. The evidence schema and fail-closed promotion policy are implemented; the Nursys, CMS Doctors & Clinicians, LEIE, and NPG operator adapters are not yet production integrations. The original NPG workshop transcript defined the target as Family Medicine Nurse Practitioners in Springfield, Missouri, with Missouri-wide expansion when local search was empty. No additional nursing roles were inferred into the client persona registry.
