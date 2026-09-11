# Abundance Healthcare MCP

Read-only NPG coverage and practitioner discovery over the nationwide NPPES Family Nurse Practitioner snapshot owned by the Agency database.

## Data contract

- A monthly full NPPES V2 dissemination file establishes a complete replacement snapshot.
- Weekly V2 incrementals copy and advance the last successful snapshot.
- Readers never observe a running or failed import.
- Springfield, Missouri and Arlington, Texas are derived filters over the national snapshot.
- NPPES records remain `coverage_candidate` unless all seven current evidence gates pass.
- Bulk search includes available practice phone and full practice address, explicitly labeled unverified registry data. This does not establish personal ownership, employment or permission to contact.
- NPPES is the no-cost first lookup. NPIProfile is not queried because it republishes the same public NPPES source already stored in the owned nationwide mirror.
- Exa Agent is an optional one-person fallback. It requires explicit paid-call confirmation, uses fixed `minimal` effort, and requests at most one professional email and one professional phone (maximum estimated charge: $0.102 at the documented 2026-09-02 rates).
- Registry and enrichment contacts remain unverified. Neither tool establishes employment, availability, consent, advertising eligibility, or recruiting readiness.
- Daily locale monitoring is disabled unless NPG explicitly opts a locale in later.

## Tools

- `list_healthcare_markets`
- `get_healthcare_coverage`
- `search_registry_sourcing` — full registry fields, exact address-radius matches and complete protected CSV download
- `search_coverage_candidates`
- `get_healthcare_practitioner`
- `get_provider_contact_information` — exact NPI, owned NPPES mirror, no per-lookup vendor charge
- `enrich_provider_professional_contact` — exact NPI, explicitly confirmed bounded Exa fallback

The client MCP exposes no refresh, evidence-write, outreach, advertising-activation, or schedule-mutation tool.

## Operator sequence

1. Use `search_registry_sourcing` for a sourcing list and complete CSV. Use `search_coverage_candidates` for the existing named coverage views.
2. Use `get_provider_contact_information` for one exact NPI and review whether the public registry route may be personal or residential.
3. Only when the registry route is absent or unsuitable, call `enrich_provider_professional_contact` with `confirm_paid_enrichment: true` and one or both supported `contact_types`.
4. Resolve identity and validate the professional route under the operator's outreach or advertising policy. Tool output does not itself authorize use.

`EXA_API_KEY` is a Worker secret. Never place it in Wrangler variables, client configuration, Dify prompts, logs, or repository files.

## September 11 recruiter workflow

`search_registry_sourcing` supports state/city association search or a full
`center_address` with `radius_miles` (0.1–250). Radius search deliberately crosses
state/city borders. Do not combine the two modes. `location_mode: unresolved`
returns providers whose current practice address has no accepted geocode; their
in-radius status is unknown. All pages expose a snapshot `run_id`; pass it on
subsequent pages. The returned protected CSV link downloads the complete filtered
snapshot, including the NPG tracker columns, without pagination limits or bearer
tokens in the URL. NPG users sign in to download.

Geocodes use Census Public_AR_Current address-range interpolation. They are not
rooftop fixes or home locations. No mileage-to-minutes conversion is supported.
Clinical experience, board certification, Epic, availability, fit and commute
remain recruiter-verification fields. The current source is primary Family NP
only; unsupported taxonomy requests fail explicitly rather than claiming an
empty AGNP population.

Production prerequisites: apply Agency migrations 0048 then 0049 (both are required for the warmup composite key), deploy Agency and this
Worker, warm practice-address geocodes through the service-only sourcing endpoint,
and refresh the Dify tool inventory. The PDL key is separate and is not needed
for registry contact export or radius calculations.

### Practice travel estimates

`estimate_registry_travel` compares up to 50 selected snapshot NPIs with 1–3 clinic street addresses, with explicit `clinic_match` (`any`/`all`) and `max_minutes` (30/45). It reserves bounded Geocodio credits and stores an exportable report. It is an open-world write tool, not read-only. Results describe typical one-way registered-practice travel, not home commute, and retain unresolved records. The report CSV requires NPG sign-in. Population-wide sourcing still requires processing all relevant source pages.

Production requires Agency migrations 0050 and 0051, GEOCODIO_API_KEY in Agency (from Infisical prod /abundance), Agency deployment, and Healthcare MCP 1.4.0. See docs/deliveries/abundance/2026-09-11-practice-travel.md for prerequisites, limits, verification and rollback.
