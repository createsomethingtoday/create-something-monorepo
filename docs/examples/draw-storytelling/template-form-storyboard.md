# The little form that learned

Storyboard completed before drawing • 6 September 2026

A visual history of documented Webflow template submission form milestones, April–August 2026.

The reader is a curious colleague, not a developer. The one idea: a reliable form protects the creator's effort at every handoff. The recurring character is a small smiling sheet of paper, carrying a template toward review. Obstacles are visual metaphors, not literal incidents or user portraits.

## Visual direction

Eight comic panels, read left to right across two rows. Rough freehand ink on a dark canvas; cream for the character, amber for the journey, coral for friction, mint for repairs. At least 80% of each panel is illustration space. Short headings and a single caption occupy the remaining space. No paragraphs in the drawing. A pencil, ticket, bridge, anchor, and support beams teach the changes through objects.

Preserve the existing Draw artwork; add the story in a separate region. Keep source details here, outside the comic. Do not publish a view-only link.

## Storyboard

| Panel | Picture / action | Exact canvas copy | Historical grounding |
| --- | --- | --- | --- |
| 1 | A magic pencil fills blank fields on the paper character; stars reveal the helped fields. | 1 · APRIL 22 / A helping pencil. / Autofill. Clearer checks. | S1: rich-text autofill, surfaced fields, validation feedback and submission UX iterations. |
| 2 | Loose written lines tumble toward a hole; a repaired notebook cradles them. Character hugs its writing. | 2 · APRIL 23–24 / Keep my words! / Repair the editor. | S2: Quill updates moved to setContents to preserve editor state. |
| 3 | Paper approaches a guarded gate; a name tag and creator badge are checked against a ledger. | 3 · JULY 23 / Check the guest list. / Names need a trusted answer. | S3: Airtable authoritative for name availability; remote service can veto, not override missing authority. |
| 4 | Paper waits beside a sleepy snail wearing a clock; a shorter path bypasses a second crawl. | 4 · AUGUST 4–5 / Why crawl twice? / Shorten the final wait. | S4: P0 implementation removed submit-time multi-minute crawls and bounded polling; this checkpoint was a draft PR, not deployment proof. |
| 5 | Two islands: the first has a checkmark, the second a puzzled gatekeeper. A checkmark falls into the gap. | 5 · AUGUST 5 / Your check is over there. / One cache. Two places. | S5: successful validation on one edge could miss at another; deterministic reproduction identified PR #9 regression. |
| 6 | Paper carries a stamped ticket across the same islands; both ends recognize it. | 6 · AUGUST 5–6 / Carry the proof. / A signed validation receipt. | S6: PR #11 merged; later live receipt-capable client and validation confirmed. Ticket means validation proof, not Marketplace approval. |
| 7 | Paper stands on a platform secured by an anchor; completion flag stays at eye level. | 7 · AUGUST 5 / Stay right here. / Finish without the page jump. | S7: PR #12 preserved completion height and parent scroll position; deployed bundle and regression evidence. |
| 8 | A wind cloud blows away a borrowed roof; local beams hold a two-column little house upright. Paper waves from inside. | 8 · AUGUST 14 / Bring your own beams. / Keep the layout standing. | S8: stale external stylesheet returned 403; critical grid owned locally; PR #14 deployed and public embed inspected. |

Footer: “Small repairs. Less lost work.” Small source qualifier: “Documented milestones · Apr–Aug 2026 · CTX”.

## Source ledger

All sources below were retrieved with CTX and their focused events opened. They describe historical observations; this work does not re-verify today's live form. CTX reported partial refresh, semantic search disabled, and bounded search results. This is a selected chronology, not a claim about the first version or every release. Dates in headings use the documented work dates; the early Aug 5 UTC event falls on Aug 4 in Chicago.

| Source | Provider | CTX session / event | Provider session | Cursor | Evidence |
| --- | --- | --- | --- | --- | --- |
| S1 | codex | 905934d8 / e0cdcf6f | 019dbaa5-7712-70f1-843f-30bd282274b4 | seq 65 | April 22 commit history summarized April 23. |
| S2 | codex | 34c34b16 / fc423c6a | 019dbfdf-00dd-7222-9808-340cd982787d | seq 113 | April 23 commit 9138e63 and neighboring intake improvements. |
| S3 | codex | e25b7023 / 104dffa1 | 019f8f90-b7b2-77c2-9445-935bbe9a2973 | seq 1165 | Authoritative name-check repair; programmatic submission work remained draft. |
| S4 | codex | 8183893b / e73a56a5 | 019fcffd-caa9-7423-bfda-86cdeba787cb | seq 526 | P0 implementation and draft PR #9. |
| S5 | codex | 7b175caa / 25c1295c | 019fd227-5994-7f42-a636-84a93875b3f4 | seq 156 | Two-edge reproduction and signed-receipt recommendation. |
| S6 | codex | 029a2d22 / ce7917b0 | 019fd72a-7597-7d63-a999-aa2deb827b26 | seq 221 | PR #11 and subsequent production verification. |
| S7 | codex | 7b175caa / fed703a9 | 019fd227-5994-7f42-a636-84a93875b3f4 | seq 2475 | PR #12 completion viewport closeout. |
| S8 | codex | 80fa820f / 0e64ca4f | 01a00113-f713-7a91-b35d-5e12a68557f3 | seq 665 | PR #14 sidebar layout closeout. |

Retrieve any cited event with `ctx show event EVENT_ID --window 0`. This artifact intentionally excludes private account IDs and raw transcripts.

## Editorial pass — On Writing Well

One actor, one consequence per panel. Technical causes remain in the source ledger except “cache” and “signed validation receipt,” which the islands and ticket explain. Removed release-log detail from captions. The final scene closes the selected chronology; it does not claim the system can never fail again. The anchor and other comic objects are explicitly illustrative.
