# Assessment A — independent design judgment

Reviewed live https://createsomething.agency/ and https://createsomething.io/papers on 2026-09-14. Own browser page: TaskSpace 1 / **p2**. Desktop 1440×1000; mobile 390×844 through CDP viewport emulation. Inspected fresh viewport screenshots, provided full-page PNGs, live semantic snapshots, search empty state, category filtering, and mobile menu. No detector output, baseline JSON, other assessments, prior reviews, or memory consulted. No source edits or external sends. This is a bounded design review, not a full assistive-technology or performance certification.

Sources: root and package AGENTS.md; agency/io README and UNDERSTANDING; both owning route +page.svelte files; Canon performance/page-contract.ts; docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md; docs/internal/MERIDIAN_LICENSED_PUBLIC_SYSTEM.md. These are Judgment-tier findings. Preserve CS Editorial display/Geist reading typography, warm casing, compact geometry, annotation, real evidence, and first-party Performance/Playbook meanings. Refinement, not redesign.

## Specificity verdict

**Agency: strong branded composition, with a weak semantic connection inside the opening image.** The engineered O/X material study, dramatic crop, editorial serif, orange action, and receipt-like proof strip are recognizably CREATE SOMETHING. The substantive example and 49/50 field receipt are difficult to transplant to an unrelated company. However, the unlabeled image could also advertise a design studio or premium object: it carries atmosphere more clearly than it communicates a bounded workflow. Add semantic context to the existing image rather than replacing the identity.

**Papers: credible editorial specificity; medium interaction specificity.** Paper color, editorial headings, quiet metadata, and evidence-led titles suit the research property. The index controls themselves are conventional, appropriately so. Long lists of keyword pills and generous empty space soften its promise of precise evidence retrieval. A tighter editorial index would be more specific than adding spectacle or more cards.

## Nielsen scores

Scores are 0–4, higher is better. Scores assess the complete scoped surface across both sizes; mobile differences appear in the notes.

| # | Heuristic | Agency | Papers |
|---|---|---|---|
| 1 | Visibility of system status | 3 — navigation/menu state is legible; no transaction in scope | 2 — visible count updates, but filter/sort selection is visual class only and count lacks live status semantics |
| 2 | Match with real world | 3 — clear task, ownership, launch language; unlabeled O/X needs interpretation | 3 — standard search/order vocabulary; domain titles are appropriate to builders |
| 3 | User control and freedom | 3 — ordinary links and menu exit; no irreversible flow | 3 — clear search, All, and empty-state Clear filters provide exits |
| 4 | Consistency and standards | 3 — cohesive shell; handoff uses two competing CTA emphases | 3 — cohesive typography and grouping; keywords look more actionable than they are |
| 5 | Error prevention | n/a — no input or consequential operation tested | 3 — constrained category/sort choices; no-results path retains the query |
| 6 | Recognition rather than recall | 3 — plain CTA labels; desktop five-item navigation is manageable | 3 — visible filters, metadata and search; selected state needs nonvisual support |
| 7 | Flexibility and efficiency | n/a — persuasion page, no expert editing workflow | 2 — search/category/order useful; excessive vertical travel between results and controls |
| 8 | Aesthetic and minimalist design | 3 — strong opening and receipt, somewhat repeated middle/end orientation | 2 — unnecessary control-to-result gap and keyword density weaken scan efficiency |
| 9 | Error recovery | n/a — no applicable error state encountered in scoped landing-page actions | 4 — tested zero results gives plain explanation, retained query, Clear search and Clear filters |
| 10 | Help and documentation | 3 — contextual example, bounded promises, useful four-question FAQ | 2 — controls understandable, but taxonomy/Quick Reads not further explained |
| | Total | **21/28 — 75%, Good** | **27/40 — 67.5%, Acceptable** |

## Cognitive load

Agency: **moderate, 2/8 checklist failures** (minimal choices and progressive disclosure over the whole page). Single focus, grouping, hierarchy, one-at-a-time, working memory and chunking generally pass. Five desktop navigation options exceed the reference's four-option threshold; the footer Services group has ten destinations. These are navigation choices rather than ten equally urgent CTAs, so do not treat the count as automatic severe failure. The larger burden is successive orientation: first project → technical review → first project example → Map/Build/Control → proof → ownership → FAQ → first project. The reader repeatedly re-evaluates fit. Keep the factual content, but subordinate the alternate review path and group the core story more tightly.

Papers: **moderate, 3/8 failures** (single focus, one thing at a time, progressive disclosure). Chunking, grouping, hierarchy, minimal choices per individual control group, and working memory pass. There are four category choices and three order choices; seven visible buttons are two grouped decisions, not seven interchangeable choices. The first article has eight keyword chips, the next nine; those are noninteractive metadata, not eight action choices, but still demand scanning effort. Search, category, order, and article selection all arrive before the first useful reading decision, especially on mobile.

## Emotional journey and strengths

Agency begins with confidence and a tangible engineered object. Plain promises then reduce AI uncertainty. The meeting-notes example makes the service comprehensible; the explicit missing owner/due date demonstrates restraint. The 49/50 evidence receipt is the strongest trust peak because it says what was measured and what was not. The ending offers a sensible bounded conversation, but the visible green “STATE ready” reads like an operator record despite no user action having occurred.

Papers begins calmly and signals seriousness. Search works immediately: Case Study produced **13 of 50 papers**; an unmatched query produced **0 of 50** and a useful recovery. The emotional valley is scroll fatigue: the first item begins about y=630 desktop / y=619 mobile, then twelve detailed entries repeat before pagination. The evidence-to-agency handoff at the end is coherent, but comes after substantial catalog travel.

Keep these strengths:

1. Agency’s concrete example and properly bounded field result; never inflate these into time savings or autonomous approval claims.
2. Both properties’ serif/interface/mono hierarchy and warm editorial casing, with strong readable primary actions.
3. Papers’ immediate filtering and forgiving zero-results recovery; mobile controls wrap without clipping in inspected views.

## Agency priorities

1. **P2 — explain the opening field without changing its art direction.** Desktop screenshot `a-agency-desktop.png` shows large O-like disc, distant X and court lines without owner/condition/route labels. Mobile crops concentrate on the disc and obscure the larger relationship. Canon's visual grammar defines O as owner and X as opposition and requires readable labels and an actual Play. The existing proof strip explains deliverables, not the image. Add a small live-text caption/legend tied to the one-task example, naming the roles/condition and human decision; preserve the existing visual and crop unless labels require minor placement changes. Do not invent measured results for the illustration.
2. **P2 — reduce repeated fit decisions between hero and proof.** Full-page PNG and route order place Technical Review immediately after the Agent Foundation opening, before the concrete example; the original proposition returns in multiple later sections. Keep the review offering and factual copy, but make it a quieter alternate entry adjacent to the main fit guidance, and visually connect example → process → measured evidence. This can be grouping/spacing/hierarchy, not deletion or a new page narrative.
3. **P3 — make the final handoff’s primary action unambiguous.** Full-page desktop shows “Talk about your project” as a quiet action alongside a white filled “See what the first project includes”; a large green owner/authority/proof/state record competes with them. The route explicitly supplies this static record with state='ready'. Keep its true values, but reduce the record's emphasis and give the conversation action the primary button treatment if it is the desired handoff. Label the record as what to bring/agree so “ready” cannot be mistaken for project qualification.

## Papers priorities

1. **P1 — expose selected filters and result updates to nonvisual users.** Owning route lines 170–221 uses active classes on category and order buttons with no aria-pressed/current or equivalent selection semantics. The result count at lines 120–127 changes as plain paragraph text. Live Case Study changed to 13/50, but the semantic snapshot exposed ordinary buttons without selected states. Add appropriate pressed/radio semantics and a restrained polite result status; keep focus in the control and preserve all current visual design. This is a primary retrieval accessibility gap, not an aesthetic request. A screen-reader run is still needed to verify actual announcements.
2. **P2 — close the control-to-result gap.** Fresh screenshots show order controls ending around y=462 desktop / y=486 mobile, first article metadata around y=630 / y=619. At mobile 844px height, only the first item's heading and summary fit beneath the controls. Tighten adjoining hero/list spacing while retaining ample reading line-height; aim to reveal the first article promptly without compressing touch targets or removing the editorial opening.
3. **P2 — demote keyword decoration to supporting metadata.** Desktop first result exposes eight pills over two rows; the following article has nine. Source renders every keyword as a noninteractive span inside the whole-paper link. This produces many small affordance-like shapes with little distinguishing power across papers (MCP, Policy OS, Three-Tier Framework repeat). Retain all factual metadata in the article/search index; show a small editorial selection or quiet plain-text topic line on the listing, with complete topics available on the paper. Do not turn each keyword into a new filter unless that navigation is intentionally designed.

## Persona flags

- **Jordan, first-time buyer:** agency headline and example are strong; O/X meaning and static “ready” require avoidable interpretation. On Papers, domain jargon is expected for its builder audience, so do not flatten article titles merely for generic simplicity.
- **Sam, nonvisual/keyboard reader:** Papers selected control states and result announcements are the concrete red flag. Menu open/close is labeled. No claim of a complete keyboard, contrast, zoom or assistive-technology audit.
- **Casey, interrupted mobile reader:** Papers spends most of the initial viewport on introduction/control space; article recovery and page navigation require lengthy scrolling. Agency's primary action is reachable in the lower half of the first viewport; keep that strength. Persistence across page navigation/refresh was not tested and is not reported as a confirmed defect.

## Minor observations and questions for synthesis

Agency mobile role label wraps in a narrow, right-aligned block above the large headline; a steadier left-aligned metadata rhythm would feel more deliberate. Papers' category label is “Case Study” while card metadata says “CASE-STUDY”; minor vocabulary polish only. The bottom-left desktop property-switch dots are visually cryptic but have descriptive accessible labels; consider text on focus/hover, not removal of the property system.

Questions for the parent to select from: Is the agency homepage's first decision “build one task” or “choose between building and technical review”? Should the research index optimize for selecting a paper quickly or displaying the complete topic taxonomy? Can the opening image explain one actual governed task as clearly as the meeting-notes example?

Assessment A stops here. No implementation, detector execution, or TaskSpace finish performed. Browser page **p2** remains on Papers at mobile width with menu open and Case Study selected. Questions deferred to the parent’s combined critique, not asked independently.

Operational closeout: after completion, the parent reported that another assessment encountered an explicit TaskSpace user-control stop. No further browser calls or takeover attempts were made. The evidence above was already captured; further live validation must await returned user control.
