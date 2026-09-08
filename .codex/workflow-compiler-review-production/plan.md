# Workflow Compiler review production plan

Goal: [goal.md](./goal.md).
Linear CRE-1960; worktree /tmp/cre-1960-workflow-compiler; branch codex/cre-1960-workflow-compiler.
Previous compiler/runtime goals are historical context and remain preserved. This is a distinct follow-up to CRE-1959.

## Phase 1: Closed-record validation
Status: complete

Implementation
- [x] Add public API/CLI negative test for every closed workflow/replay record; keep evidence maps open. Implement exact allowlists.

Verification
- [x] Run compiler check/test/acceptance plus downstream fixtures; every unknown field reports a stable path and stops.

Exit criteria
- [x] Parser contract holds without weakening existing tests.

## Phase 2: Builder readiness and complete example
Status: complete

Implementation
- [x] Add adapter readiness and missing-contract reasons to explain and console using versioned additive contracts; document complete read-only release-promotion example.

Verification
- [x] Public CLI/API tests and real browser overview, wait/stop/missing contract, reload/error checks.

Exit criteria
- [x] Builders can distinguish replay pass from invocation readiness.

## Phase 3: Versioned release candidate and registry gate
Status: in progress

Implementation
- [x] Prepare new version, changelog, lock/inventory/docs and registry-consumer verifier; include current runtime-manifest APIs with accurate build identity.

Verification
- [x] Run Node 22/24 package, acceptance, clean tarball and downstream gates; review exact diff.

Exit criteria
- [ ] Protected PR reviewed and merged with rollback and release evidence.

## Phase 4: Authenticated read-only runtime proof
Status: pending

Implementation
- [ ] Resolve existing runtime/Control owner boundary and source projection/activation; implement one bounded integration in owning host while keeping core zero-write.

Verification
- [ ] Verify trusted artifact -> authenticated read -> bound receipt -> durable restart; deny stale evidence/authority and duplicate dispatch; read back actual source/ledger.

Exit criteria
- [ ] Live proof complete, or preserve exact unresolved external gate without declaring completion.

## Phase 5: Publish and verify production
Status: pending

Implementation
- [ ] Stage fresh compiler release from reviewed main; inspect candidate; finish maintainer npm approval; deploy only reviewed owning-host changes required for read-only proof.

Verification
- [ ] Verify actual npm version/provenance/inventory and Node 22/24 clean consumers; browser check published console; production runtime readbacks.

Exit criteria
- [ ] Every primary verifier passes against actual released/deployed surfaces.

## Phase 6: Closeout
Status: pending

Implementation
- [ ] Record release, integration, browser and rollback receipts in Linear and durable result.

Verification
- [ ] Check every phase and primary verifier; preserve/close worktree with explicit disposition.

Exit criteria
- [ ] No required work remains; only then mark goal complete.

## Evidence and next action
- 2026-09-08: Refreshed registry 0.4.1 and protected main; claimed isolated CRE-1960 worktree. Bootstrap in progress.
- Capabilities: terminal/GitHub access verified; browser worked on the published console in this conversation. npm staged maintainer challenge and runtime source-owner gate remain explicit, not preclaimed as available.
- Next: strict parser red-first slice, then readiness/release while resolving live integration boundary.

- Phase 1 red: 3/3 new public/API/CLI cases failed on ignored unknown fields. Green: 3/3 passed; compiler 175 tests, check and deterministic acceptance passed; runtime 29 tests and four downstream extractor/reconciler suites passed. Exact closed-record allowlists preserve open evidence maps.

- Phase 2 readiness regression failed before implementation and passed after; browser showed simulation PASS with MISSING_TOOL_CONTRACT, authenticated approval wait and policy stop; reload had no warning/error logs. Required full gates and declared-contract browser case still pending.
- Asked optional source choice for phase 4: recommend the owned GitHub commit-read source using existing authenticated account; Marketplace alternative requires its named-owner/projection gate. Other work continues.

- Prepared release 0.5.0 (unpublished). Stable README pin reconciled to verified 0.4.1; candidate-only additions labeled. Added exact package-version export/CLI separate from compiler compatibility marker, plus Node 22/24 actual-registry verifier workflow. Release test initially failed on old hardcoded candidate version; expectation updated to 0.5.0 with built-export equality.
- Source-choice question has had time for response; absent steering, proceed with recommended owned GitHub commit-read integration. It is a terminal-operated production read through the existing runtime, not a customer Control deployment or Marketplace activation. The Marketplace ADR remains unchanged.

- Phase 2 complete: compiler 176 tests pass; browser declared-tool example shows TOOL_CONTRACT_DECLARED with current-evidence/host requirement, alongside prior missing-contract/wait/stop/reload proof.
- Release candidate passes Node 22 clean consumer with exact 85-file inventory. Node 24 checks running.
- Read-only proof helper drafted in owned-agent-runtime/scripts. First start stopped before network on package resolution; fixed public self-reference. Second start completed one live GitHub commit read and persisted wait; verifier incorrectly attempted to plan a persisted wait. Fixed verifier to inspect the verified wait state; replay recovered the same signed receipt with zero new network calls. This is a verifier repair, not a repeated dispatch. Third fresh run tests complete start/restart.

- Candidate gates: compiler check + 176 tests on Node 22 and 24; deterministic acceptance; exact 85-file tarball and clean consumers on both Node versions; runtime 29 tests; owned runtime 80 tests; four extractor/reconciler suites. Browser all readiness states and reload passed. Ground binary is unavailable (advisory only).
- Added a retained signed, public-metadata-only GitHub observation fixture and offline tamper/reopen regression. Policy tampering, response tampering, wrong trusted key and checkpoint corruption are rejected; repeated verify leaves checkpoint unchanged. No private key is persisted.
- Candidate live source proof: /tmp/cre-1960-github-proof-final-candidate; receipt sha256:3b3c62188cbd8ea9112cf99be64b6b587c2d9bb4ca4e37eb4a6422f311a34bd9. One source read and actual child-process verification pass. Must repeat using installed public 0.5.0 after release.
- Next: protected PR review/CI, then staged release. Source recommendation question remains open to user steering; default scoped GitHub proof is explicit.

- Explicit legibility check found missing contract section in the touched owned-runtime README. Added its entry/boot/smoke/verification/escalation table; both package README contracts now pass. No runtime behavior changed.

- Legibility follow-up: README contracts passed, but package metadata opt-in and package-local AGENTS were also required. Added both, preserving all existing Control/activation boundaries; full targeted legibility now passes. Earlier note referred only to the README checks.

- Prepublication review caught a documentation lifecycle issue: keeping the old quickstart in the packed README would permanently ship the old install instructions. Changed candidate README to explicitly document/pin 0.5.0 without claiming it is public; release runbook preserves 0.4.1 as the verified fallback until registry proof. The test now binds the documented pin to package.json, preventing future drift. This supersedes the earlier plan to update only after publication.

- PR #1623 review found the registry verifier checkout inherited the dispatch ref. Commit b9ae90e41 pins main and verifies origin/main equality; review thread resolved after the fix. Exact-head CI is rerunning. Package implementation remains unchanged.

- Second review finding: reopening a retained proof using a newer compiler reported the loaded version rather than the receipt-bound registration. Added a child-process alternate-consumer regression (red: 0.6.0 verifier mislabeled 0.5.0 fixture; green: explicit version mismatch), assert package version equals buildReleaseId, and report the bound version. Owning-runtime typecheck and 81 tests pass.

- Third review finding: an internally valid receipt chain could register a different contract. Red regression recreated valid chains with substituted contract/activation; green now binds registration.contractSha256 to signed manifest definitionHash, checks the fixed source workflow definition, and binds terminal activation/run ID to signed policy. Owning runtime check and 82 tests pass. No core runtime or compiler package changes.

- Fourth review finding: encoded module paths could silently skip direct CLI execution. Real spaced-path regression reproduced empty success output; fileURLToPath fixes CLI/restart paths, and realpathSync handles macOS /var aliases. Owning runtime 83 tests pass, typecheck and formatting pass.
