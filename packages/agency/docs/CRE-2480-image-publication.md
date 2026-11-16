# CRE-2480 approved image publication

Based on origin/main 42ae9705084f73d859dddbd0be6da05f5612b264 in the registered T3 worktree. Database tier: approved illustration assets and provenance. Exact six PNG hashes verified against the human approval record; exports use cwebp -q 90 -m 6 without redraw. Originals retained at /Users/createsomething/Code/create-something-monorepo/output/agency-treatment-2026-11-16. Approval copied into static/images/agency-approved-20261116/provenance.json. Historical critic disagreement is retained in source records; human acceptance governs this set.

Maps 04 to hero and CTA CSS backgrounds, 01 to workshop, 05 to connected workflow, 06 to delivered system, 02 to checks, 03 to guidance. Image descriptions updated; documentary Webflow recording, controls, prices and service text preserved. Mobile backgrounds retain full landscape composition rather than cropping into portrait.

Validation: Agency build passed. Initial check reached zero Svelte errors/warnings, then failed the old image-reference assertion; assertion updated and check rerun. Ego local runtime sweep at 320,390,768,1024,1025,1440 found no overflow or broken images after eager decode. Captures /tmp/cre2480-final-{width}.png. Desktop and phone captures directly inspected; source/export pixel comparison and full keyboard/no-JS validation remain for parent review. No production evidence is claimed.

Release gate: parent independent acceptance, merge and deployment required. No merge/deploy/watch performed. Deploy after approval: pnpm --filter @create-something/agency deploy. Rollback: revert this commit, rebuild and redeploy the prior approved artifact. Worktree disposition: preserved at feat/cre-2480-approved-agency-images until parent release checkpoint.
