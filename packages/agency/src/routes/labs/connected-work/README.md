# Connected work lab

Public destination: https://createsomething.agency/labs/connected-work/
Owning issue: CRE-2422. Explicit publishing authorization: approved deploy, standalone labs page, production polish.

This standalone HTML response preserves the approved Cook comparison. It is prerendered by SvelteKit and served by the existing Agency Pages deployment. It owns its document and styles; the Agency homepage and shared layout are untouched. The PNG is extracted unchanged from the approved owned Canon illustration.

## Page contract

- Decision: understand one connected workflow and decide whether to discuss a similar handoff.
- Archetype: landing, five visitor-selected chapters.
- Spine: overview (opening), workflow (sequence), human review (workspace), actual work (proof), working together (handoff).
- Primary proof: linked Webflow Marketplace recordings with explicit independent-work provenance; the review interaction uses synthetic data.
- Handoff: the existing workflow-mapping booking route, attributed to `connected-work-lab`.
- Rollout: migrated; exact-artifact and live acceptance evidence is recorded in CRE-2422.

## Acceptance and boundaries

All five panels must work at 320, 390, 768, 1024, 1025 and 1440 CSS pixels without horizontal overflow. Keyboard navigation, section hashes and browser history must retain orientation. Choosing, approving, changing and clearing an owner must keep approval separate from execution. Hide/reopen guidance must retain focus. No JavaScript must leave every section readable; reduced motion must retain every action. Metadata must identify the canonical lab URL. This illustrative lab is `noindex, follow`.

No accounts, network writes, storage writes or real approvals are connected. No proprietary reference assets are published. The proof link and current service terms own their respective claims.

Approved starting artifact SHA-256: `640d150900017ccac88f997614d4e2995c0051df06e5c21f5a4d51d9f1e277e8`.

## Release and recovery

Use the existing Agency build and Pages deployment workflow after PR review. Verify the clean canonical URL and the homepage after promotion. Roll back the release through Cloudflare Pages, or revert the scoped commit and deploy main; no data migration or state repair is required. Keep deployment identity and the previous production deployment in CRE-2422.
