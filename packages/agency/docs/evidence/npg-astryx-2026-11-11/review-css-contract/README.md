# CSS-contract review correction — CRE-2409 / PR2252

This folder supersedes the parent folder's initial candidate receipts. It records the correction for [P1 review 4543151736](https://github.com/createsomethingtoday/create-something-monorepo/pull/2252#discussion_r4543151736): remove custom workspace selector CSS and use actual Astryx component props and framework utilities. Required font loading remains a single local `@font-face` declaration. The Agency Tailwind configuration and public styles are unchanged.

Current exact assets:

- `/npg-chat/assets/main-qaMUh4q_.js`, SHA256 `e8cc10f082fed30fe64db24bff5d23bc5b8a67af21fab13548cbfc3b1c58062c`.
- `/npg-chat/assets/main-Cn_sAb1H.css`, SHA256 `ca14eb7b580354f63383d50eadbb4660818819f4cd51b4b4f8185ba79355d263`.

[Artifact inspection](artifact.json) contains hashes, finite framework utilities and the no-custom-selector check. [Independent Sol 6.1 review](independent-review.md) assessed the actual final output and found no remaining local acceptance issue; its original `/tmp` paths describe the review workspace. Durable receipts are mapped below.

| Gate | Status | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed locally | [61 focused tests](focused.txt), [explicit TSX check](typecheck.txt), [27 exact-client browser scenarios](browser-report.json), [15 supplemental checks](supplemental-report.json), [four wrapping/no-JS checks](wrap-report.json), [three pointer rejections](pointer-report.json). [Agency check](check.txt) passed after styling changes; [final production build](build.txt) includes the commit-aware focus fix. Local workerd/D1 and synthetic HTTP responses do not establish live provider behavior. |
| Perceptual/product quality | Passed for viewed final fixtures | Independent direct inspection at 320,390,768,1024,1025,1440 and short phones, including review, evidence, recovery and no-JS. Parent directly viewed the exact client in Ego at [390×844](parent-ego390.png) and [320×568](parent-ego320.png). Native software keyboards, other browser families and client acceptance remain untested. |
| Release readiness | Untested in production | Deployable local output checked. PR checks/review, merge/deployment, binding activation/readback, authenticated account/source/CSV acceptance remain parent-owned. Dify remains the rollback destination. |

Red/green regressions: [custom stylesheet contract before correction](contract-red.txt), [pending-review focus before correction](focus-red.txt), and [large saved-evidence focus before post-commit repair](commit-focus-red.txt). The final 27-case suite includes CPU throttling and large saved evidence, proving that focus waits for the returned review to exist. Pending decisions focus their heading; idle conversations focus the composer; initial restoration does not steal focus.

Selected final synthetic captures: [desktop review](review-1440.png), [short phone](short-320-568.png), [canonical evidence](canonical-evidence.png), [guarded Skip Trace evidence](skiptrace-evidence.png), [long source data](long-source-320.png), [no JavaScript](no-js.png). No real candidate or Mobbin media is retained. No model/MCP/vendor or paid call was made for these checks.

Astryx doctor has zero failures; retained [source](doctor-source.json) and [built](doctor-built.json) warnings are heuristic audit limits, not permission for custom selector CSS. The source regression parses local CSS with PostCSS, forbids selector rules, and permits only font-face setup. Final compiled CSS inspection confirms no NPG hook selectors.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`, branch `t3/npg-custom-chat`, for promotion and live acceptance.
