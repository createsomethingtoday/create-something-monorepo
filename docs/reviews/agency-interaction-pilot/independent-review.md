# Independent source and design review

2026-10-12. Reviewer: independent_review, read-only source and viewport captures.

Decision: acceptable for the bounded local pilot; no remaining blocking source or design finding identified. This supports local review, not merge, deployment or stable Canon promotion.

Resolved findings:
- Prepare sample anchor now retains Handoff selection.
- Back to the initial fragment and Forward to the sample restore meaningful focus.
- Previous/Next progression places focus at the new panel heading.
- Delayed layout hash scrolling no longer overrides same-document pilot focus; browser tests wait past that delay and verify fixed-header clearance.
- Provisional exported composition has explicit documentation and experimental classification.

Evidence: browser-results.json records all seven groups passing with no page errors. Desktop detail and 1440/390/320 receipts retain accepted assets, legible hierarchy and truthful synthetic completion.

Follow-up source review: no new blocker. Homepage navigation bypasses the asynchronous snapshot delay implicated in early Back. Inline search reuses existing search/focus handling and cleans up its event listener; other routes retain the default mobile trigger. The refreshed browser receipt includes three early-Back repetitions and inline-search focus return.

Remaining limitations: physical-device and screen-reader testing are outstanding. Static reading preview uses fallback fonts and does not exercise live interaction.

2026-10-13 follow-up: independent reviewer verified the reproduced URL-fragment and modal-focus fixes. No additional source blocker found. Final-head checks, physical mobile and actual screen-reader acceptance remain release requirements.

Subsequent owner decision, 2026-10-13: the owner explicitly waived physical-mobile and actual screen-reader acceptance and authorized deployment with those limitations. The historical reviewer recommendation above is preserved; these manual checks remain unverified. Required exact-head GitHub CI, review resolution and live verification remain in force. See release-acceptance.md.
