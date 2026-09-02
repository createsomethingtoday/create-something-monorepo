# Abundance Healthcare MCP

Read-only NPG coverage and practitioner discovery over the nationwide NPPES Family Nurse Practitioner snapshot owned by the Agency database.

## Data contract

- A monthly full NPPES V2 dissemination file establishes a complete replacement snapshot.
- Weekly V2 incrementals copy and advance the last successful snapshot.
- Readers never observe a running or failed import.
- Springfield, Missouri and Arlington, Texas are derived filters over the national snapshot.
- NPPES records remain `coverage_candidate` unless all seven current evidence gates pass.
- Bulk search omits practice phone and street address. Individual NPI lookup can return public NPPES practice fields with their limitations.
- Daily locale monitoring is disabled unless NPG explicitly opts a locale in later.

## Tools

- `list_healthcare_markets`
- `get_healthcare_coverage`
- `search_coverage_candidates`
- `get_healthcare_practitioner`

The client MCP exposes no refresh, evidence-write, outreach, or schedule-mutation tool.

