# Hero full-column composition review

Local refinement after the release was paused. PR #1903 remains draft and unmerged. No hero prototype revision reached production; production remained at `9868098f297c110095f6f0d669d135f7a4fda70f` when checked.

The recommended composition centers the left copy against the complete collapsed right column, including the workflow story, Canon character and question list. Expanding an answer preserves that resting position. Desktop copy follows while scrolling only when it fits beneath the header with bottom clearance, and stops at the hero boundary. Mobile and short viewports scroll normally. Persistent questions permit direct answer switching; opening and returning focus the first question, and Escape closes from anywhere within the guide.

Actual browser comparisons favor centering. Bottom alignment puts the headline and booking button noticeably lower, leaving excessive blank space above the copy. The Canon character and motion strip remain included. Pricing, service obligations, ownership copy and workflow playback are unchanged.

Evidence captured at desktop 1440 × 1100, narrow desktop 1024 × 900, short desktop 1440 × 560, and mobile 390 pixels wide. All 18 layout assertions passed: resting alignment, stable expansion, header clearance, complete copy visibility, hero boundary, short viewport fallback and mobile overflow. No page errors. Independent source review found no blockers, including keyboard handling and font-scaled sticky fit.

Library previews:

- [Centered desktop](https://chatgpt.com/api/library/files/libfile_c830d698ce3c819183d607b1225c6814/download)
- [Expanded guide with bounded sticky](https://chatgpt.com/api/library/files/libfile_affe481843448191907b5abca65e7a00/download)
- [Mobile](https://chatgpt.com/api/library/files/libfile_e8f152385e8081919d94b5c48ff49e07/download)
- [Bottom-alignment comparison](https://chatgpt.com/api/library/files/libfile_6011bc5a929c81918a07511286881980/download)

Local browser receipt: `output/playwright/hero-guide/alignment-checks.json` (ignored evidence). Package check passed 171 tests and Svelte reported zero errors or warnings; SEO/marketing checks passed 13 tests. Workspace lint passed with the package's absent lint script explicitly allowed. Production build is recorded in `/tmp/agency-final-alignment-build.log`.

Publication remains paused for visual readback. This local revision has not been pushed, merged or deployed.
