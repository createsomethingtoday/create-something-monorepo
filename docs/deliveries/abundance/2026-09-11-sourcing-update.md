# NPG sourcing update

Linear: CRE-1992. Source: September 11 email from Latasha Baxter and Linda Gomez,
plus Albany NY Nurse Practitioner Sourcing Workflow Full Guide and NPG Branded
Udify NP Sourcing Guide. These are requirements and workflow examples, not
recorded candidate qualifications or authority to send outreach.

## Implemented behavior

- Existing bulk coverage search includes full available NPPES practice address
  and telephone, labeled public_registry_unverified.
- search_registry_sourcing returns paginated records and a complete snapshot-pinned
  CSV download behind NPG access control. CSV includes all requested tracker
  columns, with clinical qualifications, fit and commute left unverified.
- Address-radius search uses Census address-range geocodes and spherical distance.
  It includes cross-border matches and separates unresolved addresses. Source hash
  changes invalidate cached coordinates. City/state searches remain association
  searches, explicitly distinct from radius membership.
- Repeated-digit telephone placeholders remain visible as source evidence in CSV
  with invalid_placeholder status. They must not be used as contact routes.

## Remaining requirements

- The current national mirror contains primary Family NP only. AGNP and other
  specialty searches must not be described as complete. A broader full NPPES
  import and taxonomy membership model are needed before supporting those filters.
  Adult Health and Gerontology taxonomy membership does not itself prove AGNP
  board certification.
- The supplied guides name Albany, Troy and Schenectady but contain no clinic
  street addresses. The existing approved NPG directory has no matching entries.
  Confirm the requisition clinic addresses before running clinic-centered searches.
- Thirty/forty-five-minute commute filtering needs a routing service, departure
  assumptions, and a candidate-provided origin for an actual home commute. Google
  Routes computeRouteMatrix can calculate duration, but no routing credential or
  requisition centers have been configured. Practice-to-clinic mileage is not a
  candidate commute estimate.
- PDL_API_KEY is saved in Infisical prod /abundance. No PDL enrichment call or
  private-contact ingestion has been performed as part of this registry update.
- No outreach sequence or ATS write is triggered by search/export. Recruiters
  validate qualifications and contact authority before moving records onward.

## Promotion and operational verification

1. Run Agency checks and abundance tests; MCP tests and typecheck.
2. Merge through repository PR checks; deploy Agency through Agency Pages Deploy.
3. Apply packages/agency/migrations/0048_abundance_sourcing_geocodes.sql to the
   Agency D1 database, then apply 0049_abundance_sourcing_geocode_versions.sql
   before accepting radius or warmup requests; deploy Healthcare MCP. Both
   migrations are required: 0049 creates the composite key used by warmup writes.
4. Warm selected states using the service-authorized POST sourcing endpoint with
   action geocode_batch and state. Each invocation processes at most ten records;
   continue until processed is zero. Network failures remain retryable and are
   never persisted as unmatched addresses.
5. Refresh the Dify healthcare tool inventory and use search_registry_sourcing.
   Verify bulk fields, complete CSV download after NPG sign-in, radius matches and
   unresolved counts in the rendered client. Do not mark live completion from
   local source or tests alone.

Rollback: deploy the prior Agency and Healthcare MCP versions. The additive
geocode table may remain; no source provider or recruiting evidence is overwritten.
Worktree disposition: preserved at /Users/micahjohnson/Code/worktrees/cre-1992-npg-sourcing
on codex/CRE-1992-agent-worktree until production verification.

## Sources

- https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
- https://www.census.gov/data/developers/data-sets/Geocoding-services.html
- https://developers.google.com/maps/documentation/routes/compute_route_matrix
- https://taxonomy.nucc.org/

### Routing provider recommendation

Retain Census geocodes and add Geocodio Distance for typical driving duration from registered practice to confirmed clinic. This is not the candidate's home commute. Geocodio offers 2,500 free daily credits; driving pairs cost two credits, then $1/1,000 credits. Enable Distance API permission and store `GEOCODIO_API_KEY` in Infisical. Use existing coordinates, per-clinic results, and explicit any-clinic versus all-required-clinics semantics. No routing account or secret has been connected. Confirm clinic addresses first; the secondary Albany listing is not sufficient evidence.

Sources checked September 11, 2026: https://www.geocod.io/pricing ; https://www.geocod.io/docs/ ; https://www.geocod.io/terms-of-use . Geocodio supports retained results subject to underlying sources. Typical traffic only; scheduled traffic would need a different routing contract such as Google Routes, whose storage restrictions need separate consideration.

Review fixes: additive migration 0049 preserves geocodes keyed by NPI plus source hash across retained snapshots. The sourcing MCP tool declares its external geocoder via `openWorldHint: true`. Regression checks: 86 Agency tests and 28 MCP tests pass.
