# Independent NPG cold-CI review

Verdict: bounded cold-start/typechecking acceptance passed for the final three-file delta. No unresolved review findings in this delta. This is not a production release approval or a full fresh-install CI receipt.

Worktree: `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`
Branch: `t3/npg-custom-chat`
Base HEAD examined: `bebcfd0632c468f1e17db0a1480aaa412a05224b`

Only modified tracked files at review completion:
- `packages/agency/tsconfig.npg.json`
- `packages/agency/test/npg-document.test.ts`
- `packages/agency/package.json`

Acceptance evidence:
- Independently reran the final compiler-host cold regression: 1/1 passed. Generated SvelteKit reads are unavailable during config parse and program checking. Log: `/tmp/npg-cold-independent-regression.log`.
- Independently reran ordinary command after final flags: `bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency npg:typecheck`; exit 0. Log: `/tmp/npg-cold-independent-typecheck.log`.
- Stronger independent in-memory compiler probe also hides generated directories. Actual roots are `display.ts`, `astryx/types.ts`, `astryx/Workspace.tsx`, and `astryx/main.tsx`; cold parse and full pre-emit diagnostics pass. Injected invalid assignment and implicit-any into each real Workspace/main/display file produces TS2322 and TS7006. Actual main type-only import probe produces TS1484 with the final config. No temporary source files or generated directories were mutated. Log: `/tmp/npg-cold-independent-final-sanity.log`.
- Independently re-evaluated the previous config from HEAD in memory with generated files hidden; it fails TS5083 and TS5095, alongside target diagnostics. This confirms a meaningful regression check. Log: `/tmp/npg-cold-independent-sanity.log`; original builder red receipt independently read at `/tmp/npg-cold-config-red.log`.
- Review caught omitted inherited `verbatimModuleSyntax` and `isolatedModules`. Parent restored both explicitly; final positive compile and negative TS1484 check were rerun after that change. The original finding is resolved. Historical finding log: `/tmp/npg-cold-module-validation-sanity.log`.
- Independently reviewed prepare ordering: build directory -> local dependency preparation -> SvelteKit sync -> NPG build. The existing masked-failure fallback is unchanged. Read parent cold-prepare log `/tmp/npg-cold-prepare-green.log`; it contains actual Vite completion and `NPG React/Astryx assets built: /npg-chat/assets/main-qaMUh4q_.js`, plus original `main-Cn_sAb1H.css`. Regenerated Kit config exists. Parent performed that execution with only the owning Kit config absent; dependencies were otherwise warm. Reviewer did not execute a build.
- Earlier independent focused suite passed 49/49 across `npg-analyst`, `abundance-delivery-context`, `npg-display`, and `npg-document` before the final two validation flags were restored. Final cold test and ordinary compiler plus stronger probes above cover the subsequent flag change; parent owns final broader 62-test rerun.
- `git diff --check` passes. There is no diff under Agency `src`, `scripts`, or tracked `static/npg-chat`; Svelte/Agency API behavior and runtime client source are unchanged by this delta.

Final file SHA-256 snapshots:
- tsconfig.npg.json: `49f65cd3153cdb5383b77fd79fae14239c5021f7df18eea42cc1aaa4784fe453`
- npg-document.test.ts: `24328a2982fae902cffedb84faf6240f9e3b4ae9246dbd0486e0d0eedf54bbc0`
- package.json: `65644a87d57214b0f0e69ee14137c6af2795894175ecec20597afed1a5b6b2fa`

Read-back build artifact SHA-256 (prior-byte comparison remains parent's baseline evidence):
- main-qaMUh4q_.js: `e8cc10f082fed30fe64db24bff5d23bc5b8a67af21fab13548cbfc3b1c58062c`
- main-Cn_sAb1H.css: `ca14eb7b580354f63383d50eadbb4660818819f4cd51b4b4f8185ba79355d263`

Quality gates:
- Functional correctness: PASSED for this bounded fix using actual TypeScript compiler and offline fixtures. Cold generated-file absence and strict source coverage are independently verified. No paid/provider calls, live backend acceptance, or fully empty dependency install were performed.
- Perceptual/product quality: NOT-APPLICABLE to this configuration/test/lifecycle-only delta. Reviewer did not open a browser or re-evaluate aesthetics; parent retains prior product review and baseline artifact evidence.
- Release readiness: UNTESTED overall. Scoped diff and local checks pass, but full fresh-install CI, final broader Agency check, immutable release artifact, shipping authorization/destination, merge, deploy, and production readback remain parent-owned. No current release assertion is made.

Reviewer made no source, build, browser, fixture, Git, PR, Linear, or external mutations. Only requested temporary logs/report were written. Worktree disposition: preserved at the owning path/branch for parent integration.
