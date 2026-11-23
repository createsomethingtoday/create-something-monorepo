# New social draft: evidence before approval

Stage: local draft, November 22, 2026. Assumed channel/account: CREATE SOMETHING company LinkedIn. No external writes or scheduling.

Acceptance: a reader understands what evidence preparation achieved and who retains the decision; the selected sample is named; no time-saving claim; readable portrait graphic with concept artwork explicitly labeled; editable source and alt text retained.

## Caption

An evidence packet can be complete while a review decision still needs a person.

In our template-review field report, 49 of 50 selected cases produced a usable evidence packet in a balanced shadow sample. Automated judgment did not earn promotion. Reviewer time savings remain unmeasured.

That gives us a useful place to start: prepare what the reviewer needs to inspect, then keep the decision with the reviewer.

Where does evidence preparation end and judgment begin in your workflow?

Read the sample and its limits: https://createsomething.agency/field-reports/template-review

The accompanying workshop scene is a concept illustration.

## Alt text

Warm paper card headed “Prepare the evidence. Keep the decision.” It reports usable evidence packets for 49 of 50 selected cases in a balanced shadow sample. A charcoal felt character with cream stitched eyes offers a paper card while a human hand inspects a folded sample on an oak table. The scene is labeled concept illustration. Human review was retained; reviewer time savings remain unmeasured.

## Sources and decisions

- Started at repository AGENTS.md, then docs/COMPANY_OPERATING_WIKI.md → Socials → Make the visual. Yes, the wiki covers asset selection, new image generation, exact typesetting, source retention, feed review and approval boundaries.
- Applied create-something-brand-materials skill and its brand-direction, formats-and-delivery, and renderer references. Chose a portrait draft as its default for unspecified format.
- Read packages/agency/src/routes/field-reports/template-review/+page.svelte; independently checked the public field report on November 22. Both support the sample result and its limits. The post makes no current runtime or business-impact claim.
- Compared the older local measured-whimsy foundation with the wiki's later adopted editorial revision 18eb4c2ed89e0fe181a292dc76ec232c89e049a3, reading its editorial-runtime.css through git. Used that revision's warm paper, ink, serif and mono treatment. Live field-report text was checked; live visual styling was not independently viewed.
- The operator corrected the first replay’s use of a retired graphite character. The revised composition uses the reusable teach.png scene from the felt-collage-lessons skill (November 2026). The source is bundled here as felt-handoff.png. Its wool character offers material for a person to inspect. The manifest records the source hash.
- Read docs/examples/social-gigi/README.md and render.py as the wiki's worked handoff and reproducible typography example. Created a different field-note story, artwork and layout.

## Reproduce

From the repository root, create a temporary environment with Python 3.9 or later:

```sh
social_env=$(mktemp -d)
python3 -m venv "$social_env"
"$social_env/bin/python" -m pip install Pillow==11.3.0 'fonttools[woff]==4.60.1'
"$social_env/bin/python" cook-code/wiki-maintainer/evidence/r01/social/render.py
```

The renderer reads the bundled felt artwork and the fonts from their pinned Git revision. It exports evidence-before-approval.png (1080 × 1350), feed-preview.png (360 × 450), and manifest.json.

## Review status

Functional: renderer asserts text stays within the card and produces the requested dimensions. Claim wording checked against local source and public field report.

Perceptual: passed builder inspection of the actual 1080 × 1350 export and 360 × 450 feed preview. Headline and sample wording are readable; the felt character, offered card and human hand remain visible; the concept label and time-saving limit are present without covering artwork. Compared against the pinned editorial colors/type and the owned source scene. Independent release review is recorded in the Cook rounds. Human approval of the draft remains pending.

Release: local draft only. Account identity, native upload requirements, final copy/media approval and scheduling time must be settled before publication. No publication permission inferred.
