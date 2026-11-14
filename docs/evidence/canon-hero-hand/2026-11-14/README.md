# Canon hero sleeve repair — CRE-2457

The user reported that Canon’s paper-holding left hand looked disconnected in the Agency homepage hero. The original wide image lacked a readable forearm between shoulder and mitten. The portrait sibling already had a visible sleeve and cuff.

A targeted built-in image edit adds a short curved felt sleeve, forearm and stitched cuff, keeping the paper grip and surrounding scene. The original master and original approval remain intact; the new asset is recorded as a user-requested anatomical correction. Minor regenerated texture/contour differences are acknowledged. The portrait remains byte-identical.

The new `hero-wide-v2.webp` is used by the shared Agency welcome scene, homepage background, preload, fallback markup and OpenAI dots background. The static stylesheet query and existing internal HTML cache revision advance together so refreshed pages receive the correction. Copy, links, layout, cache eligibility and TTL remain unchanged.

- [Before/after comparison](comparison.jpg), original left / correction right.
- [Fresh independent art critique](art-critic.md): pass; connection9.5, anatomy/material9, identity9, composition/task9.5. These are subjective scores, not measurements.
- [Exact prompt and provenance](provenance.json): PNG/WebP SHA256 and portrait identity pin; native1672×941, delivered90,356bytes, cwebp q88/m6.
- [Package checks and build](checks.json): both passed; Svelte0errors/0warnings. Source and deployable-artifact retirement scans have zero findings.
- [Current production rollback](production-before.json): Agency deployment79da755b-b648-4df6-956a-b343029b7f40, sourcef41ed1c1e0685b63f6f6a183502aa84a09953686.

[Independent actual-output review](final-retest.md) passed all six homepage widths, two shared-scene routes at390/1440, keyboard focus/Enter, no-JS320/1440 and reduced motion1440. The reviewer viewed the native image and rendered captures; [phone](home-390.png) and [desktop](home-1440.png) show the result. Functional and product gates pass locally; production readiness remains pending promotion/live verification. Local review is distinct from production receipt and live acceptance; those final identities and checks belong in CRE-2457. No real inquiry, booking or external provider action is part of this repair.

PNG master and prompt are retained at `output/canon-hero-hand-repair/2026-11-14/` in the registered worktree. Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190` on `t3/canon-hero-hand-repair` through production verification.
