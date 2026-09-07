# Abundance Healthcare MCP

Read-only NPG coverage and practitioner discovery over the nationwide NPPES Family Nurse Practitioner snapshot owned by the Agency database.

## Data contract

- A monthly full NPPES V2 dissemination file establishes a complete replacement snapshot.
- Weekly V2 incrementals copy and advance the last successful snapshot.
- Readers never observe a running or failed import.
- Springfield, Missouri and Arlington, Texas are derived filters over the national snapshot.
- NPPES records remain `coverage_candidate` unless all seven current evidence gates pass.
- Bulk search omits practice phone and street address. Exact-NPI contact lookup can return public NPPES fields with truthful individual/organization classification and their limitations.
- NPPES is the no-cost first lookup. NPIProfile is not queried because it republishes the same public NPPES source already stored in the owned nationwide mirror.
- Exa Agent is an optional one-person fallback. It requires explicit paid-call confirmation, uses fixed `minimal` effort, and requests at most one professional email and one professional phone (maximum estimated charge: $0.102 at the documented 2026-09-02 rates).
- Registry and enrichment contacts remain unverified. Neither tool establishes employment, availability, consent, advertising eligibility, or recruiting readiness.
- Daily locale monitoring is disabled unless NPG explicitly opts a locale in later.

## Tools

- `list_healthcare_markets`
- `get_healthcare_coverage`
- `search_coverage_candidates`
- `get_healthcare_practitioner`
- `get_provider_contact_information` — exact NPI, owned NPPES mirror, no per-lookup vendor charge
- `enrich_provider_professional_contact` — exact NPI, explicitly confirmed bounded Exa fallback

The client MCP exposes no refresh, evidence-write, outreach, advertising-activation, or schedule-mutation tool.

## Operator sequence

1. Use `search_coverage_candidates` to discover candidates without bulk contact fields.
2. Use `get_provider_contact_information` for one exact NPI and review whether the public registry route may be personal or residential.
3. Only when the registry route is absent or unsuitable, call `enrich_provider_professional_contact` with `confirm_paid_enrichment: true` and one or both supported `contact_types`.
4. Resolve identity and validate the professional route under the operator's outreach or advertising policy. Tool output does not itself authorize use.

`EXA_API_KEY` is a Worker secret. Never place it in Wrangler variables, client configuration, Dify prompts, logs, or repository files.
