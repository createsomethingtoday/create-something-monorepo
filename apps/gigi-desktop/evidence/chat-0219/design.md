# Design evidence and decisions

Product surface: local Ask GiGi drawer. Task: read observed agent output, review changes and keep working without losing draft/position. Retain Studio/Paper/Midnight, existing typography, semantic tokens and record-source controls. No global navigation or palette changes.

Private screenshot inspected in-session only. Installed 0.2.15 visibly has literal Markdown and overlapping conversation chrome; current 0.2.18 has a safe basic renderer already. Tests reproduce current-source limitations separately.

CTX searched early: search ready, 1,318 records skipped, blame stale. Bounded results did not establish runtime behavior; canonical app, adapter, protocol and rendered checks own conclusions.

TASTE retrieved read-only via `/api/taste/context?intent=minimalism&include=references&limit=18`; actual images downloaded to /private/tmp and visually inspected. No third-party media committed.

| Reference | Why | Adapt | Avoid | Source |
| --- | --- | --- | --- | --- |
| alex burdin · designer, Clean | Charging UI separates observed state, principal value and supporting rows | Quiet observed-state row; exact factual labels | Timer/progress visual without measured progress; product typography/color | https://www.are.na/block/40249020 |
| Home / X, Clean | Clear section boundaries and typographic hierarchy | Separate history/control rail and readable response hierarchy | Campaign columns, diagrams and copy; image is composition evidence only | https://www.are.na/block/39778673 |
| table item style, Clean | Compact label/value rows keep detailed data legible | Bounded response tables with header contrast and horizontal overflow | Product pictures, currency claims, large circular action controls | https://www.are.na/block/36795688 |

Canonical inputs: GiGi canon-overlay/surface-policy.md, current app/styles/preferences, Canon performance-contract.ts/performance.css, PERFORMANCE_LAB design language; canon-design-review and canon-motion-craft Canon application. UI uses existing GiGi tokens per owning surface policy. No external motion engine. State indicator and action color transitions clarify actual state in 200 ms, no perpetual/pulsing progress or token replay. Reduced motion keeps final labels and state visible without transition.

Official protocol reference: https://learn.chatgpt.com/docs/app-server, fetched in-session; installed Codex 0.166.0 generated JSON schema at /private/tmp/gigi-chat-codex-schema confirms agentMessage delta threadId/turnId/itemId/delta and turn/completed schema. No new provider wire frames, authentication, model selection or billing fallback. Parent streaming researcher independently confirmed existing delta and terminal reconciliation paths.
