# XRay depth and navigation validation — 2026-10-20

Validated on Micah-W4FJPH with Node 26 and isolated Chrome 155.0.8059.85. This revision responds to feedback that the first demo was too flat and lacked zoom.

- Default view has a ghosted faceted enclosure, volumetric assemblies at distinct depths, shaded/partly occluded surfaces, and rear-routed handoffs terminating at mounted ports. Model checks found 10 projected bounding overlaps and verify enclosure containment. These checks establish schematic spatial structure, not physical fidelity.
- Build, JavaScript syntax, stable IDs, all 16 view/mode combinations, finite in-frame geometry, routed endpoints, and bounded shared camera math passed.
- Browser assertions passed: all four synchronized views; selection detail and source mapping; 100–400% zoom; pan; Fit/Reset; keyboard arrow/zero navigation; normal wheel scroll (page moved 150 px); Alt+wheel zoom; touch pinch to 186%; touch drag; Escape restores page gestures.
- Labels are outside the zoom transform. The selected mobile label measures 15.26 px at 390 CSS px and 12.26 px at 320 CSS px. Controls have a minimum 44 px height. Neither width has horizontal overflow.
- JavaScript-disabled output retains four static SVG views and seven full text rows. Inactive controls are hidden. Reduced-motion media passes; no idle loop or animations. Print-to-PDF succeeds; printing fits a transparent system and afterward restores the prior 125% view.
- Final standalone HTML: 100,231 bytes. Browser count: 748 SVG descendants in the tested final state. Mode updates: 1.2–1.8 ms in this desktop run. No page exceptions or external runtime requests.
- Final desktop, mobile and mobile-zoom screenshots were visually inspected. No-JS image and print PDF are in the review package.
- Ruby Psych independently parsed frontmatter and checked required fields, name, description length and unfinished scaffolding.

The official skill-creator `quick_validate.py` remains unavailable because the available Python lacks PyYAML. No dependency was installed. Independent validation is not an official-validator pass.

Limits: centroid painter ordering is illustrative, not a full physical collision/occlusion solver. No real screen-reader session, physical mobile-device benchmark, or browser-UI 200% zoom test was performed; the latter uses a 640 CSS-pixel / device-scale-2 layout equivalent. Exception paths are explained in text, not simulated execution. Ports and routes are authored relationships, not observed telemetry.

Reproduce model checks with `node scripts/build-demo.mjs` and `node scripts/check-model.mjs` from the skill directory. The browser-check script and raw browser-results-v2.json are in the review ZIP; the script requires an isolated Chrome debugging session and uses the original local review path.
