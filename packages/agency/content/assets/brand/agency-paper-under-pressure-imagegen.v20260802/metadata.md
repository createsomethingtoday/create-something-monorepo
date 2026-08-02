# Agency Paper Under Pressure — Imagegen campaign studies

> Asset ID: `brand.agency-paper-under-pressure-imagegen.v20260802`
> Owner: CREATE SOMETHING
> Generated and inspected: 2026-08-02
> Tracking: `CRE-1588`
> Status: approved for page-context verification

## Direction

This family replaces procedural Three.js output as final still marketing art on
three Agency campaign openings. Three.js remains available for interactions in
which live state change carries meaning; authored HTML/SVG continues to own all
copy, controls, proof, and accessibility.

| Study | Workflow meaning | Target surface | Accent |
| --- | --- | --- | --- |
| Folded handoff | Work crosses a bounded transfer and settles | `/` | Signal cobalt |
| Clamped decision | Authority holds an unsafe continuation | `/services` | Review gold |
| Attached receipt | Proof remains physically attached after handoff | `/field-reports` | Growth green |

## Generation record

- The bundled CLI was configured for `gpt-image-1.5`, `quality=high`, and
  `size=1536x1024`, but all three jobs returned
  `billing_hard_limit_reached` before any output was written.
- Accepted desktop masters were generated with the session's first-party
  Imagegen capability at 1536 x 1024. That capability did not expose a model
  identifier in its result, so the record does not invent one.
- Each mobile study is a high-fidelity, composition-only edit of its accepted
  desktop master. The service returned phone-native portrait dimensions, which
  are retained because their framing passed the real target-surface brief.
- Exact authored prompts and edit invariants are preserved in
  `source/prompts.md`.

## Accepted masters

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `exports/folded-handoff-desktop.png` | 1536 x 1024 | `0645b853564ef4173ec256084f5106163974a124fa43edee2f85ac2a4f3bd1ef` |
| `exports/folded-handoff-mobile.png` | 852 x 1846 | `bdb16a629681c1ea4c6c2808e114b13a9f83c3f5a878b21cd74e6fa8307cb05a` |
| `exports/clamped-decision-desktop.png` | 1536 x 1024 | `427a1765f48b65545f034f2771a5f6a633c30613bd8e4fd8932442ee49c28b28` |
| `exports/clamped-decision-mobile.png` | 852 x 1846 | `cc97d399ed1224d5b6ba1cb86962c81dc4210d288b11b72a51531695a56b0b8e` |
| `exports/attached-receipt-desktop.png` | 1536 x 1024 | `21ee20ac0d2f1612fca8130aa9dde9b5971e1cdb3b75a6455bda4ab5dc43a60a` |
| `exports/attached-receipt-mobile.png` | 853 x 1844 | `c93c67ab6203726d9d8e656da2a12df2d3a932da744effaced307f2f4ebe723e` |

## Public exports

All public WebP exports use `cwebp -q 88 -m 6` without resizing.

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `static/images/performance-lab/paper-folded-handoff.webp` | 1536 x 1024 | `2773717a87eedb8e3048ae6543d566af19fd3e9917208bc2884e07eafcb09fe3` |
| `static/images/performance-lab/paper-folded-handoff-mobile.webp` | 852 x 1846 | `35c5751e4d7de554217fca410b83ce0b1c5db7d332da5e6a72636b7cbf9fe46a` |
| `static/images/performance-lab/paper-clamped-decision.webp` | 1536 x 1024 | `07185711b860934b22a8a3b398b8ce98424bd3b120388a961b72a1775818dd52` |
| `static/images/performance-lab/paper-clamped-decision-mobile.webp` | 852 x 1846 | `d4e71298be6891435259034b05e85b89a2bbfc1ec12b6faacedf67258c762927` |
| `static/images/performance-lab/paper-attached-receipt.webp` | 1536 x 1024 | `ec35f432a14b57f3ff5d0394b2e59e5dd742ce15e7c15572307fff6421386df5` |
| `static/images/performance-lab/paper-attached-receipt-mobile.webp` | 853 x 1844 | `ff662f6ad78146cf311f1f3094fc34786341c07801879c29f99d1ed305a70284` |

## Inspection and rejection record

- [x] All six accepted files inspected at original resolution.
- [x] Paper fiber, crisp edge thickness, hard folds, hardware, and controlled
  contact shadows remain legible.
- [x] Each composition communicates its named workflow state without copy.
- [x] No text, logo, watermark, interface, fake evidence, person, hand, water,
  glass, third-party mark, or recognizable trade dress appears.
- [x] Portrait edits preserve object identity and leave a quiet authored-copy
  field.
- [x] No first-pass visual output was rejected. The only rejected attempt was the
  three-job CLI request, which produced no image because of the billing limit.

## Rights and use

Original generated work from CREATE SOMETHING-authored prompts. No reference
image was copied into the desktop masters. The mobile edits use only the
accepted CREATE SOMETHING-owned desktop masters. These are illustrative campaign
material studies and must never be presented as proof of a real workflow run.

## Refresh condition

Replace a study only when its route's workflow meaning changes, its responsive
crop fails a current surface, or a later owned asset demonstrates a clearly
stronger page-context result. Do not refresh for novelty alone.
