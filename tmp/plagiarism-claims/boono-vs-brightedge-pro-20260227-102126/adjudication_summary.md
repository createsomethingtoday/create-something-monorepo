# Claim Adjudication Summary: Boono vs Brightedge-Pro

## Inputs
- Claim source: Airtable PDF export (Asset Operations Scratch: DMCA & Plagirism)
- Claimed original: https://brightedge-pro.webflow.io/
- Alleged copy: https://boono.webflow.io/

## Key Findings
- Pairwise compare endpoint (/api/compare) returns **high_similarity** with overall similarity **0.9382361080038405**.
- Dimension breakdown:
  - HTML: 0.9166609350827138
  - CSS: 0.9569627017394028
  - JS: 0.9482524348567268
  - Webflow: 0.9785664530691891
  - DOM: 0.8403090786899435
- Corpus scan is non-pairwise nearest-neighbor search:
  - Boono top match: Clickify (0.7578125)
  - Brightedge-Pro top match: Mono W (0.8125)
- Bayesian endpoint mismatch for URL-driven claims:
  - compute/confidence with IDs (brightedge-pro, boono): no_plagiarism (p=0.05975956220517754)
  - compute/confidence with URLs: no_plagiarism (p=0.037884186281700205)

## Provisional Conclusion
- This pair should be escalated for manual review with the pairwise compare evidence bundle.
- Current compute/confidence output is not reliable for URL claim adjudication in this case and requires fallback resolution.

## Evidence Files
- claim_source.txt
- health.json
- scan_boono.json
- scan_brightedge_pro.json
- frameworks_boono.json
- frameworks_brightedge_pro.json
- api_compare_brightedge_to_boono.json
- api_compare_boono_to_brightedge.json
- compute_confidence_ids.json
- compute_confidence_urls.json

## Bayesian Resolution (Patched webflow-mcp)
- IDs input (brightedge-pro, boono): likely (p=0.7309987949712444, source=vector_fallback)
- URLs input: likely (p=0.7309987949712444, source=vector_fallback)
- Resolution behavior: use compute/confidence first, then vector fallback via /api/compare when confidence is low-signal for URL-driven claims.
- Artifact: resolved_bayesian_confidence.json
- MCP E2E check: mcp_tool_call_plagiarism_confidence.json
