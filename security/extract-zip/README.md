# extract-zip 2.0.1 local security backport — review candidate

This is not an upstream patched version or an advisory suppression. Both GHSA-jmr9-qjv8-65gv and GHSA-7pqw-9j4j-h8q3 remain visible to scanners. The package retains upstream version 2.0.1. Tracking: CRE-1634.

Upstream archive: npm extract-zip@2.0.1, SHA-512 `GDhU9ntwuKyGXdZBUgTIe+vXnWj0fppUEtMDL0+idd5Sta8TGpHssn/eusA9mrPr9qNDym6SxAYZjNvCn/9RBg==`. LICENSE and all files except index.js remain unchanged. Upstream PR162 informed the investigation but is not represented as merged or sufficient by itself.

The patch validates path components before directory creation, rejects escaping symlink targets, preserves component order when resolving links, and validates the final graph including pre-existing links. Failed extraction removes archive-created links. Regular files are written to exclusive temporary files and atomically renamed to avoid following destination symlinks or hard links. Normal duplicates, callbacks, executable modes and Chromium-style framework forward links are tested.

Extraction must use a private directory not concurrently writable by another process. Node pathname APIs do not provide dirfd/openat traversal isolation. This patch does not claim transactional rollback of ordinary files, resistance to a concurrent local filesystem attacker, ZIP bomb protection, or remediation of other packages' advisories. Rejected extraction may leave ordinary in-root files; consumers must discard failed installations.

Root pnpm uses `patchedDependencies` before lifecycle scripts. The standalone motion-ontology npm path uses a local tarball override, applied during resolution before any install lifecycle. Reproduce that tarball with `python3 security/extract-zip/build-vendor.py`; it validates the original archive and applies the same patch. No version renaming or postinstall-only patching.

Qualification is incomplete until independent review, clean pnpm and npm resolution checks, malicious archive tests and Linux/macOS/Windows CI pass. The expired risk exception is preserved as historical evidence; the current policy uses the byte-verified remediation contract described below. Do not release based on this README alone.

## Current local evidence

- Original dependency: initial suite 3 pass / 10 fail.
- First backport: review reproduced two additional link-graph defects; both corrected. A pre-existing forward-link mutation case was subsequently reproduced and corrected.
- Final source SHA-256 is recorded in provenance.json. Clean isolated pnpm (77 packages) and standalone npm ci (227 packages) verify installed bytes and pass 21 regression/compatibility tests on macOS. A patch hash in a lockfile was insufficient: verification caught stale unpatched bytes in the reused full workspace. Full-workspace reinstall/verification remains required.
- Standalone TypeScript compilation reports TS2322 in src/extractor.ts:42. A separate clean untouched-baseline install produces byte-identical diagnostics; this backport does not change that source or claim to fix the existing build error.
- Existing absolute links are accepted only when rooted in the canonical extraction path; alternate absolute spellings through filesystem aliases fail closed. Browser archive-created links must be relative. Windows/Linux qualification remains pending.
- Independent review validated the earlier 19-case macOS state and requested the Windows separator correction. The correction is present, but the subsequent final-review request was blocked by the agent service's cybersecurity filter. Final independent approval remains outstanding. No alternative agent was used to bypass that block.
- Earlier qualification preserved the active exception and failed on its expiry. The separately authorized policy commit below retires it without renewal, while retaining scanner findings and the independent human-review requirement. This branch must not be merged or released until review and all required gates pass.

## Local recovery and Windows checkout correction

The interrupted full-workspace install was preserved under `.cache/interrupted-node_modules-b69a5048c` and replaced with a fresh frozen install, scripts and side-effect caching disabled. It completed successfully; byte verification traversed 2,662 reachable packages and all 21 tests passed. This supersedes the earlier local-install failure, whose evidence remains retained.

Windows CI at b69a5048c failed before behavior tests because Git converted the patch to CRLF. A narrow `.gitattributes` rule pins only this patch to LF; an actual Git checkout with core.autocrlf=true now preserves the original expected hash. Hash checks were not relaxed. Exact-head cross-platform CI still determines qualification. Dependency-review triggers now include this patch, its verification files and the line-ending rule; existing security validation behavior remains unchanged.

Windows qualification after the LF correction reached all tests and exposed native readlink separator rejection in two valid-link cases. The checker now accepts native Windows separators when reading existing filesystem links, while retaining rejection of backslashes in untrusted ZIP entry/link text. All path components still undergo containment checks in original order. The patch, standalone tarball, lockfiles and provenance hashes were regenerated together; fresh local pnpm (2,662 reachable packages) and npm (227 packages) both pass 21 tests with index SHA-256 `25d3ab1dc8dd11ae3a41503f46bad9cd47c55f040ccc3371481708d372f0c3ea`.

An incremental pnpm update again produced unpatched installed bytes despite updated lock metadata. A fresh frozen install applied the patch successfully. Therefore incremental installation alone is not qualification: every release/build checkout must pass installed-byte verification before packaging. Root cause within pnpm's incremental installation remains unconfirmed; no broad package-manager or lifecycle-policy change is included.

Windows then passed all containment/link cases and failed only the POSIX executable-bit assertion (Windows reports no Unix execute bits). That assertion now applies on POSIX platforms; the full framework, content, callback, duplicate-file and security cases still run on Windows, with no skipped test or changed patch/provenance bytes.

## Local-remediation policy (separate review required)

The active policy now distinguishes the scoped local backport from a time-limited risk exception. The original exception JSON is retained byte-for-byte under `security/advisory-history/`, bound by SHA-256. Its expiry is not extended. The package remains version 2.0.1; no advisory allowlist, severity change, scanner suppression, or claim of upstream remediation is introduced.

`config/security-advisory-exceptions.v1.json` pins the backport source commit, both advisory identities, all provenance fields, regression-suite bytes, installation coverage and historical record. It explicitly requires human review; passing machine checks does not supply that review. `scripts/security-local-remediation.mjs` rejects changed/missing evidence, runs installed-byte verification and the complete regression suite on the workspace, creates a fresh isolated standalone npm install with lifecycle scripts disabled, and verifies that installation too. The CI gates use clean checkouts and frozen root installs with lifecycle scripts and side-effect caching disabled. Existing direct-import restrictions apply independently to remediations and active exceptions. Future active exceptions still retain all expiry/ownership/control validation.

Negative tests cover missing record fields, incomplete install coverage, suppression attempts, absent or mismatched files/receipts, absent installations, actual unpatched code, and direct-import exposure detection. Hashed text files are explicitly pinned to LF across platforms. Linux/macOS/Windows qualification remains required for every final candidate. Dependency Review still runs its unchanged HIGH-severity comparison after this verifier; Public Distribution GA still runs its remaining product checks. Any subsequent failure remains blocking. Local or CI success is not a claim that the standalone application compiles or that the repository has no other vulnerabilities.
