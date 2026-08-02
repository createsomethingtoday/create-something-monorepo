# Canon Performance Paper — v20260802

## Asset record

- Asset id: canon-performance-paper.v20260802
- Owner: CREATE SOMETHING / Canon
- Target surfaces: .ltd, .io, .space, .agency, and Learn homepages
- Visual family: material-prototype-study
- Source brief: promote working paper as the primary Performance Lab material identity
- Proof requirement: every crease, edge, trace, score, layer, or stamp must name source, transformation, boundary, evidence, or proof
- Creation method: original hand-authored SVG; no generative model or third-party asset used
- Generation date: 2026-08-02
- Review status: approved after five-property WebKit proof at 1440 x 1000 and 390 x 844
- Rights: original CREATE SOMETHING work; no supplied reference image or GLB was copied

## Reference translation

The user supplied crumpled-paper and 3D-model references as taste inputs. The
implementation does not reproduce those models. Mobbin evidence supported one
general convention only: give one tactile object a distinct lane from the live
proposition and proof. The resulting geometry, SVG paths, material states,
copy, and responsive crops are original.

## Files

| Property / state | File | ViewBox | SHA-256 |
| --- | --- | --- | --- |
| LTD / source | paper-canon-sheet.svg | 1600 x 1000 | 2a8d7f5c1c2052a7f7f03cd1d928057510f0c545eed260060bb9e20d2592d36a |
| LTD / source mobile | paper-canon-sheet-mobile.svg | 720 x 1200 | a71f39c448bd9b7f525a3c6a1aed578acc471732894df9ad719b8fb4f6cead64 |
| IO / trace | paper-research-trace.svg | 1600 x 1000 | c339fbfce50f3a83916d34331ffa9523efc500ed7e252911c3ab94c548fbbc1d |
| IO / trace mobile | paper-research-trace-mobile.svg | 720 x 1200 | 5628345310bba926e197a4747edb5a955267047a66f74fef72384eec7ccacdde |
| Space / score | paper-prototype-score.svg | 1600 x 1000 | f89c87f7fa60cdb406ac25efb3e763c690a1cf4824e188684a0f82b4236c1e1e |
| Space / score mobile | paper-prototype-score-mobile.svg | 720 x 1200 | 9bb371dfa4c3e92d580e8112193607269e78b7c2dd6dddccbd3c120703dd673a |
| Agency / pressure | paper-pressure-handoff.svg | 1600 x 1000 | 40c32a3304c8a2c4c813be061131fd68398ed02950106a2e9e72af940b462515 |
| Agency / pressure mobile | paper-pressure-handoff-mobile.svg | 720 x 1200 | 38519ec53c727e2126881487221e64f614bf5b7386ce64be7e8995ae5db81492 |
| Learn / sequence | paper-learning-sequence.svg | 1600 x 1000 | 5acf0319384e57e78f80f95c083403364f8fa2532dc3fb0d55361de34adbf1d7 |
| Learn / sequence mobile | paper-learning-sequence-mobile.svg | 720 x 1200 | 24bc1afcdd33c06e75d82c88bd8832ae60b2186bc5c0205aa3c05e3442952c5b |

Canonical file root:
packages/canon/src/lib/components/performance/media/.

## Crop and refresh conditions

- Desktop: keep the object in the right half and preserve a quiet live-copy lane.
- Mobile: move the object below the primary proposition while keeping the proof rail legible.
- Refresh if a fold, measurement rail, or object crosses essential live copy; if
  the paper state reads as decoration rather than an operating artifact; or if
  browser proof shows low contrast, overflow, or an empty media surface.

## Verification receipt

- Local production builds returned HTTP 200 for all five homepages.
- All ten desktop/mobile views reported `data-material="paper"`, Paper mode, a
  loaded semantic image, zero horizontal overflow, and no console, page, or
  failed-request errors.
- Agency's progressive renderer reported `ready` and `pass`; keyboard stage
  selection, reduced motion, and object clearance above the annotation rule
  passed at both breakpoints.
