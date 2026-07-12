# `.agency` Commercial Proof Inventory v1

Linear: `CRE-1222`  
Reviewed: 2026-07-12  
Purpose: separate what CREATE SOMETHING can truthfully show now from claims that
need fresh verification, client approval, or quarantine

## Evidence classes

- **Prototype:** representative fixtures or shadow behavior; no production or
  customer outcome is implied.
- **Operational:** a real owned runtime, workflow, check, or receipt has passed.
- **Customer:** an attributable client delivery or outcome exists.
- **Economic:** verified time, revenue, cost, risk, or conversion impact exists.

An item may occupy more than one class, but a stronger class must never be
inferred from a weaker one.

## Inventory

| Candidate | Class | What the evidence supports | What it does not support | Publication state | Owning evidence |
| --- | --- | --- | --- | --- | --- |
| Marketplace workflow compiler | Prototype | One versioned Marketplace workflow compiles into 15 content-hashed artifacts; five representative cases cover pass, approval-required, blocked, insufficient-evidence, and unknown-action behavior; two clean outputs are compared byte for byte. | Production review decisions, Webflow writes, customer ROI, reduced review time, or autonomous publishing. | Public-safe with the existing `Prototype`, `Shadow only`, and `Writes: None` labels. | `packages/workflow-compiler/README.md`, `packages/workflow-compiler/scripts/acceptance.mjs`, `packages/agency/src/routes/proof/marketplace-workflow/+page.svelte`, CRE-1191. |
| First-party scheduler and commercial funnel | Operational candidate | The scheduler owns verified availability, fail-closed booking preparation/commit, receipts, and the `/book` handoff. CRE-1222 locally proves privacy-safe lifecycle messages and traffic classification. | A production booking-completion funnel until the scheduler and `.agency` bridge are promoted and live-read back; no lead volume or revenue lift. | Repo-owned; publish as operational proof only after coordinated deployment and a controlled non-customer verifier. | `apps/create-something-scheduler`, `packages/agency/src/routes/book/+page.svelte`, `packages/agency/scripts/report-commercial-funnel.mjs`, CRE-1213, CRE-1222. |
| Abundance nurse staffing delivery | Operational + customer candidate | A client-safe delivery record documents a live concierge shape, production-smoked Staff and Jobs MCPs, NPG-scoped hub checks, read-only job discovery, Dify tool use, and human recruiter boundaries. It explicitly records that Jotform, Mailchimp, and WhatsApp authorization remained incomplete. | Customer ROI, autonomous staffing decisions, fully connected write automation, or a completed commercial outcome. | Existing client-summary artifacts may remain; promotion into a flagship public case requires explicit client-safe publication approval and a fresh smoke/readback. | `docs/deliveries/abundance/2026-05-14-project-update.md`, `packages/agency/src/routes/delivery/abundance`, `evals/langfuse/dify/abundance-hub.eval.ts`. |
| Kickstand Subtractive Triad audit | Operational + customer | The published paper documents a production codebase audit, 155 scripts reduced to 13 active scripts, 30 TypeScript errors reduced to zero, and a health score change from 6.2 to 9.2. | Evidence that CREATE SOMETHING's current workflow-delegation offer improves a buyer's operational handoff; general claims that every deletion was safe without the underlying audit receipt. | Already public as a paper/product example. New homepage promotion or broader client attribution should receive an evidence and relationship review. | `packages/io/content/papers/kickstand-triad-audit.md`, `packages/agency/src/routes/products/ground/+page.svelte`. |
| CREATE SOMETHING development infrastructure | Operational, repo-owned | Agent-legibility, policy-artifact, Canon overlay, codification, and component-depth checks provide inspectable internal operating proof without client attribution. | External customer value, revenue impact, or a domain workflow result. | Safe fallback when customer publication approval is unavailable; lower commercial relevance than a client delivery. | `docs/CREATE_SOMETHING_SYSTEMS_THESIS.md`, `scripts/agent-legibility-check.mjs`, `scripts/policy-artifact-check.mjs`, current check receipts. |
| Public Atlas canvas | Prototype + product demonstration | A visitor can map owners, systems, handoffs, approval points, stop conditions, and evidence without touching production systems. | A completed pilot, saved production state, or customer outcome. | Public-safe when described as a read-only/prospect mapping surface. | `packages/agency/src/routes/services/+page.svelte`, `packages/agency/src/lib/atlas/public.ts`, `packages/agency/test/public-atlas-route.test.ts`. |
| Dify Template Marketplace route | Plan / implementation guide | Repo checks, DSL/export expectations, client-safe boundaries, and manual Creator Center gates are documented. | A submitted, approved, or adopted Marketplace template. | Do not present as completed proof until live Dify import/run/export and Creator Center state are verified. | `packages/agency/src/routes/dify/template-marketplace-proof/+page.svelte`. |
| Arc manual-review metrics | Claimed economic outcome, unverified | Marketing artifacts repeat 4.2 hours to 1.1 hours and a 73% reduction. | Any public economic or customer claim without the owning source data, dated measurement method, client approval, and current case artifact. | Quarantined from new public proof. Existing scheduled/generated copies require a separate audit before reuse. | `packages/agency/content/social/linkedin-arc.md`, `packages/agency/scripts/schedule-posts.sql`; no current owning delivery receipt found in this review. |

## Recommended proof sequence

1. Keep the Marketplace compiler as clearly labeled prototype proof.
2. After approved coordinated deployment, add the first-party scheduler/funnel
   as owned operational proof with a real receipt and explicit non-customer test
   classification.
3. Seek client-safe approval for Abundance as the first flagship customer case,
   then rerun the public surface, MCP/API, Dify, and unresolved-connection checks
   before writing the case.
4. If Abundance approval is unavailable, use CREATE SOMETHING development
   infrastructure as the repo-owned operational case and state that it is an
   internal operating proof, not customer ROI.
5. Keep Kickstand as supporting verification/subtraction evidence rather than
   making it carry the current workflow-delegation offer.
6. Do not use Arc metrics until their source and approval chain are restored.

## Claim contract for a future case

Every case must separate:

- **Before:** a sourced operating condition, not a generalized pain claim.
- **Boundary:** what could run, what waited, what stopped, and who owned it.
- **Change:** the actual implemented system or artifact.
- **Result:** a directly measured operational or customer outcome.
- **Receipt:** the command, runtime readback, dated artifact, or approved customer
  source that supports the result.
- **Recovery:** what remained manual, incomplete, reversible, or approval-gated.

If `Result` lacks a receipt, label the item prototype or operational evidence;
do not write economic or customer outcome language.

## Approval handoff for Abundance

Before using Abundance as the flagship public case, obtain explicit approval for:

- client name and relationship attribution;
- which system details and screenshots are client-safe;
- the exact current-status and unresolved-connection language;
- any quote or economic result; and
- the publication route and review owner.

After approval, refresh the existing May 2026 evidence. Do not assume an older
production smoke or connection state is still current.

