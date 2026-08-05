# Blocker remediation evidence checklist

Use this checklist for each issued blocker — P1 or `unassigned` (treat `unassigned` findings as P1 unless the reviewer states otherwise). Mark an item `N/A` with a reason; do not silently skip it.

## Handling

- [ ] The packet contains only this partner's authorized findings and evidence.
- [ ] Secrets, tokens, customer identifiers, exploit payloads, and unrelated personal data are absent.
- [ ] A live exposure or incident has an authorized containment owner before ordinary remediation proceeds.
- [ ] Any open policy or exception decision is separated from fixable code work.

## Finding contract

- [ ] Finding ID and issued priority are preserved verbatim.
- [ ] Acceptance criteria are explicit; missing criteria are routed back for clarification.
- [ ] Each claim is labeled `published requirement`, `issued finding`, `security control`, or `open decision`.
- [ ] The smallest responsible change and rollback/safe-disable path are named.

## Source and tests

- [ ] Real symbols, endpoints, scopes, and import paths were discovered from source.
- [ ] A positive test proves the intended operation.
- [ ] A negative test proves unauthorized, invalid, or cross-tenant input fails safely.
- [ ] Backend tests cover authentication and object ownership separately.
- [ ] Responses omit reusable credentials and unnecessary tenant data.
- [ ] Generated JavaScript, markup, and attributes use safe serialization and validation.
- [ ] Custom Code lifecycle tests cover apply, update, site/page removal, and publish prompting when applicable.

## Production artifact

- [ ] The exact production build command is recorded and passed.
- [ ] The final submitted directory and `bundle.zip` were inspected—not only source output.
- [ ] Development endpoints, tunnel hosts, stub identities, test data, and development framework code are absent from every submitted file, including source maps.
- [ ] The manifest, product title, installation URL, requested scopes, dependency manifest, and source-map relationship match the intended release.
- [ ] The artifact identifier or checksum is recorded.

## Runtime

- [ ] The intended artifact is installed on an authorized sandbox site.
- [ ] Runtime checks use dedicated test tenants, users, credentials, and records.
- [ ] No unauthorized write, tenant enumeration, or response-body retrieval was used as proof.
- [ ] GET and write-path authorization are tested separately when both exist.
- [ ] Runtime URL, version, child resources, integrity behavior, and readiness signal are recorded when applicable.
- [ ] App Review Preflight observations are labeled as evidence from the Webflow-controlled run, not reviewer acceptance — and any partner-supplied runtime test package is recorded as test input only, never as evidence.

## Resubmission

- [ ] Every P1 or unassigned finding maps to changed files/configuration, tests, artifact proof, and runtime proof or a justified `N/A`.
- [ ] Remaining limitations and open decisions are explicit.
- [ ] Source verified, artifact verified, installed, runtime observed, submitted, and reviewer accepted are reported separately.
- [ ] The packet ends with `READY TO RESUBMIT` or `NOT READY TO RESUBMIT`.
- [ ] No sentence claims or implies Webflow approval before an explicit reviewer decision.
