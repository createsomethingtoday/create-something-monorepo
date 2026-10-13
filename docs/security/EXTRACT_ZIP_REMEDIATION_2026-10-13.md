# extract-zip containment candidate — CRE-1634

This draft mitigates the two symlink advisory patterns in extract-zip 2.0.1. It does not change the advisory exception or remove scanner findings. Both advisories still have no upstream fixed release. GHSA-7pqw-9j4j-h8q3 remains outside the allowlist and blocking for release. No deployment is part of this change.

The separately approved renewal is PR [1968](https://github.com/createsomethingtoday/create-something-monorepo/pull/1968), merged as `efa99af771290c8c7d2fc03bcd72b0f9ecbc8565`, with reviewBy October 20 (expiry October 21 00:00 UTC). It retains existing controls and accepts risk; it is not this remediation.

## Change and boundary

The root pnpm patch maps all six lockfile references (five @puppeteer/browsers versions and @remotion/renderer 4.0.410) to the same patched extract-zip 2.0.1. No dependency versions change. The patch checks existing parent components before recursive mkdir, rejects escaping symlink targets using the canonical parent, and refuses regular-file writes through symlinks, hardlinks, and special files. O_NOFOLLOW adds protection at file open. Internal relative symlinks, forward targets, directory links, executable modes, and ordinary file overwrites retain regression coverage.

The standalone motion-ontology Docker context has its own copy of the patch, which is also the root pnpm patch source. Its npm install disables all lifecycle scripts and applies the patch before TypeScript build. The installer requires version 2.0.1 and exact upstream SHA-256, verifies the patched SHA-256, covers nested npm copies, and fails closed if the extractor is missing or changes unexpectedly. System Chromium remains the browser. The image adds the OS patch utility; there is no application or browser version migration.

The standalone integration build exposed an existing TS2322 mismatch: KeyframeData declared string-only properties, although the unchanged DOM getKeyframes result includes numeric and nullable metadata. Its type now reflects those existing values; runtime extraction behavior is unchanged.

The extraction root must be controlled exclusively by the caller. This is not a sandbox against concurrent local filesystem mutation, untrusted onEntry callbacks, mount changes, resource exhaustion, or arbitrary pre-existing host state. Safe-looking internal links can still be changed after extraction by a separate host actor. Windows behavior is not validated. Ordinary standalone npm installs outside the documented Docker build do not inherit pnpm patches; use `npm install --ignore-scripts` followed by `node security/apply-extract-zip-patch.cjs` before building or running. Existing installations and deployed images are unchanged until explicitly rebuilt and promoted.

## Candidate evaluation

- [Cloudflare 1.5.0-rc.0](https://github.com/cloudflare/browser-run/releases/tag/cloudflare-puppeteer-v1.5.0-rc.0) was published as a GitHub prerelease on October 13 at 07:54 UTC. Its source manifest has no @puppeteer/browsers or extract-zip dependency. Its ESM exports expose `.` and `./internal/*`; the analyzer's current deep import is not exported. A Node resolver probe using that exact manifest returns ERR_PACKAGE_PATH_NOT_EXPORTED. The exact npm version endpoint returned HTTP 404 during this review. No installable/bundled runtime compatibility claim is made, and the prerelease would leave other Puppeteer/Remotion paths. It is not selected here.
- [Upstream PR 162](https://github.com/max-mapper/extract-zip/pull/162), head `e0c19dc9875f7d07c9a2fa33b03ae0c49504b4d2`, remains open/unmerged. The local candidate follows its containment approach but also checks ancestors before mkdir and canonicalizes the link parent. Unlike upstream's unlink-and-replace behavior, file writes to an existing link fail closed. The upstream MIT license is retained next to the patch. This is a local hardening patch, not an upstream fixed release or a claim that PR 162 was merged.
- Remotion 4.0.535's replacement extractor is not selected: removing a dependency name alone does not demonstrate containment.

## Evidence and review status

On the M5 Mac, Node 22.21.1 ran the synthetic ZIP suite: unpatched 2.0.1 fails 12 of 18 tests, including both advisories; the patched standalone extractor passes 18/18. The six installer/lockfile/Docker contract tests pass. Every ZIP, escaping target, canary, and test cleanup is confined to a fresh test-owned temporary directory. Fixtures are generated as readable stored ZIP records with Unix modes and duplicate names.

The GitHub workflow runs Node 20 and 22 on Linux, negative controls for both advisories, standalone patch tests, pnpm patch installation, and the actual motion-ontology standalone npm install/build. Check the exact PR head for results. A Docker image build has not run locally: the Docker daemon socket is absent. Browser binary download/launch and application end-to-end behavior remain unverified.

Independent renewal review passed. The separate independent remediation review was blocked by the platform's cybersecurity filter; it did not produce a completed review. This PR must remain draft until independent security review and integration evidence are satisfactory.

The production audit on base `a69f53a28f85d50d77475b94e54313ea4673ef4a` used pnpm 9.15.0 and exited 1: 3 critical, 27 high, 28 moderate, 10 low findings, including both extract-zip advisories. This local patch does not change the upstream version range, so scanner findings remain visible. No release clearance is claimed. Broader audit remediation is outside this narrow change.

## Reproduction

Install only the regression subject in an isolated temporary directory, with lifecycle scripts disabled. Save the pristine index.js, run the negative control, apply the standalone patch, then run the same tests:

```sh
npm install --prefix "$TEST_ROOT" --ignore-scripts --no-audit --no-fund --save-exact extract-zip@2.0.1
cp "$TEST_ROOT/node_modules/extract-zip/index.js" "$TEST_ROOT/original.js"
EXTRACT_ZIP_MODULE="$TEST_ROOT/node_modules/extract-zip/index.js" node --test scripts/test/extract-zip-security.test.mjs
# The unpatched negative control must fail.
EXTRACT_ZIP_ORIGINAL="$TEST_ROOT/original.js" node --test scripts/test/extract-zip-installation.test.mjs
node packages/huggingface-spaces/motion-ontology/security/apply-extract-zip-patch.cjs "$TEST_ROOT/node_modules"
EXTRACT_ZIP_MODULE="$TEST_ROOT/node_modules/extract-zip/index.js" node --test scripts/test/extract-zip-security.test.mjs
```

Rollback: revert this candidate commit and reinstall from the prior frozen lockfile/rebuild the prior image. That restores vulnerable extraction behavior; it does not remove the need for compensating controls or clear advisory failures.
