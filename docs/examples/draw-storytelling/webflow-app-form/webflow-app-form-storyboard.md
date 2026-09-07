# The form that learned to land

Storyboard completed before drawing • 7 September 2026

A visual history of selected Webflow Marketplace App Form milestones, July–September 2026.

The reader is a curious teammate who uses the form but does not maintain it. The one idea: **a trustworthy form saves the creator's work, carries proof without pretending it is approval, and recovers only what policy says is safe.**

The recurring character is a small paper-plane form learning to land. The character, obstacles, and scenery are visual metaphors for documented system behavior; they are not customer portraits or invented incidents.

## Visual direction

Seven comic panels, read left to right across two rows. Rough freehand ink on Draw's dark canvas. Cream is the form character, amber is motion and guidance, coral is friction, mint is a verified repair, and blue is stored evidence.

Pictures should carry about 80% of the meaning and occupy about 80% of the useful canvas area. Each panel gets one short heading and one caption. The detailed evidence stays in this storyboard.

Preserve the existing Draw canvas. Add the comic in a separate empty region, save a backup first, and leave the result as a local editable draft rather than publishing it.

## Storyboard

| Panel | Picture / action | Exact canvas copy | Historical grounding |
| --- | --- | --- | --- |
| 1 | The paper-plane form drops a blue copy of itself into a checkpoint box before jumping toward an upload cloud. A safety rope connects the two. | **1 · JUL 21** / **SAVE BEFORE THE LEAP** / A checkpoint before upload. | S1: the form saved a submission intent before adding files, so a later multipart timeout could leave recoverable form data and the original reference. The observed recovery succeeded; the prevention branch was still draft then. |
| 2 | A small inspection robot stamps a ticket. The plane carries the ticket toward a human review gate while a cartoon crown stays behind a red boundary line. | **2 · JUL 24–AUG 5** / **PROOF, NOT A CROWN** / Preflight brings evidence. | S2: App Review Preflight and its operator loop produce static and runtime evidence. They do not approve or reject an app. |
| 3 | The plane reaches a sign that says “docs” but initially points nowhere. A hand draws the missing arrow to an open map. | **3 · AUG 4** / **SHOW THE MAP** / Guidance should be a link. | S3: the Documentation URL helper gained direct task-oriented copy and an exact Webflow guidance link. The source was tested and merged; this event did not include Webflow Cloud deployment. |
| 4 | The plane chooses between a light optional toolkit backpack and a stamped evidence ticket. It takes both but clips them to different hooks. | **4 · AUG 12** / **PACK THE RIGHT THING** / Toolkit helps. Receipt is evidence. | S4: the optional developer toolkit appeared at Review and success. It remained separate from source-map and Preflight receipt evidence and did not grant approval. |
| 5 | A fileless update is sinking in a sticky coral swamp labelled “multipart.” A compact blue ferry labelled “JSON” carries it across while file-bearing crates remain on the larger upload barge. | **5 · AUG 20** / **SKIP THE SWAMP** / No files? Take JSON. | S5: repeated metadata-only Update attempts timed out after intent save. The exact saved Update was recovered. The shipped transport rule sends zero-file Updates as JSON and retains multipart for submissions with files. |
| 6 | A lighthouse sweeps a narrow mint beam across small stranded update boats. A brand-new boat carrying image crates waits safely outside the beam. | **6 · AUG 20** / **A CAREFUL LIGHTHOUSE** / Recover only safe Updates. | S6: automatic reconciliation was constrained to eligible aged, latest-per-client, zero-file Updates with retry limits. New submissions without required assets stayed excluded. The fix was merged, deployed, and verified with health, browser, validation, D1, and scheduled-receipt evidence. |
| 7 | Three keys—Sites, CMS, Assets—turn three identical write locks in a bright browser window. Behind it, a shadow browser and a custom dropdown wear a question mark. The plane holds a small test checklist instead of guessing. | **7 · SEP 1** / **THREE KEYS TURNED** / Brave remained an open test. | S7: all three scopes supported read-write and worked in Chromium production. A Brave/iframe/native-select robustness theory remained unproven; browser regression coverage and creator confirmation were still open. |

Footer: **Save. Prove. Recover. Stay honest.** Small qualifier: **Selected documented milestones · Jul–Sep 2026 · CTX**

## Source ledger

CTX reported partial refresh, disabled semantic search, and bounded results. The focused sources below support a selected chronology, not the App Form's origin story or a claim about every current production behavior. Private creator identifiers and raw transcripts are excluded.

| Source | Provider | CTX session / event | Provider session | Cursor / date | Evidence state |
| --- | --- | --- | --- | --- | --- |
| S1 | codex | `62c23937` / `30392052` | `019f84a9-90c0-70d3-b79f-77feb8f40f71` | seq 91 · 2026-07-21 | Exact production recovery observed; automatic-prevention work remained draft PR #4. |
| S2 | codex | `cd20cba7` / `fdc5a5d5` | `019fd29e-14cc-7891-8c24-580dcbac00d4` | seq 2394 · 2026-08-05 | Current-source and runbook inspection established the evidence-not-approval boundary. |
| S3 | codex | `09320fa3` / `19bba266` | `01a002c1-7dab-7043-81f1-41ead210552b` | seq 2 · 2026-08-15 index context for 2026-08-04 work | Targeted test, full tests, builds, PR #9, and merge recorded; deployment explicitly absent. |
| S4 | codex | `5dc8fd26` / `ce36443f` | `019ff9a6-fab2-7df2-bf06-1b09f4b00e65` | seq 130 · 2026-08-13 | Live form and manifest observed; toolkit/evidence boundary confirmed. |
| S5 | codex | `9e3fccbd` / `f0a13fcc` | `01a01f85-ae45-7bf2-a120-2ae920cdddab` | seq 144 · 2026-08-20 | Code and saved-state diagnosis supported the zero-file transport rule and narrow recovery policy. |
| S6 | codex | `9e3fccbd` / `9e050503` | `01a01f85-ae45-7bf2-a120-2ae920cdddab` | seq 1057 · 2026-08-20 | Merged and deployed PR #15; production health, 13 browser checks, validator probe, D1 readback, and post-deploy scheduled receipt recorded. |
| S7 | codex | indexed rollout `01a05ec4-7f6a-77c2-ad56-c9a07f4f0566` | `01a05ec4-7f6a-77c2-ad56-c9a07f4f0566` | 2026-09-01 | Read-only code review and Chromium production reproduction succeeded; Brave/creator acceptance remained open. |

Retrieve the focused CTX events with `ctx show event EVENT_ID --window 0`. S7 was recovered from the indexed rollout summary because term search did not return a stable focused event under disabled semantic search.

## Uncertainty and metaphor limits

- The comic does not claim these are the first seven changes or the complete App Form history.
- A Preflight ticket means controlled evidence, never Marketplace approval.
- The toolkit is optional help. A served download does not prove installation, use, or review impact.
- The lighthouse illustrates policy-bounded reconciliation. It does not retry every stranded submission.
- The final panel records an unresolved compatibility hypothesis, not a confirmed Brave defect or a completed fix.
- Historical source evidence does not by itself re-verify today's production form.

## Editorial pass — On Writing Well

The initial draft tried to explain D1, R2, multipart parsing, cron selection, native select styling, and browser coverage inside the panels. Those details belong in the ledger. The final canvas copy gives each panel one actor, one action, and one consequence.

The language keeps the important boundaries. Saved is not submitted. Evidence is not approval. Merged is not deployed. A toolkit download is not adoption, and a Chromium reproduction is not Brave acceptance. Read aloud, the repeated verbs—save, show, pack, skip, recover—give the sequence momentum without turning the work into a victory lap.
