# Canon approachable showroom

This directory contains the internal `/next` sample journey and its layout. It is not a second public component library. The journey imports Canon's existing Button, Checkbox, TextArea and Alert. The supporting specimens use the shared TextField, Select and Card. Consumers continue using their canonical imports and explicit theme boundaries.

Database: fictional task records and canonical semantic tokens. Automation: the pure workflow reducer and local interactions. Judgment: scope before preparation, explicit review before approval, no external authority.

## Composition

`Workbench` is a deliberately fictional, per-instance composition. It resets on unmount and sends no data. Preparation advances only when the visitor clicks Continue simulation. Drafts vary by selected task. Review starts read-only; Edit draft opens and focuses that instance's TextArea. Empty approval is guarded, recovery preserves the prepared sample, and Discard sample resets draft and scope.

`theme.css` imports Canon's owning token stylesheet and locally bundled Geist. Its `--cn-*` names are layout aliases, not a parallel palette. Sky and apricot are illustrative composition colors only. Shared controls own their sizing, focus, error, loading, typography and appearance. The route adds no global control reset or compatibility bridge. Nested theme specimens exercise the actual canonical palette rebinding.

The original pilot Button, Field, Notice and Surface files, compatibility stylesheet and public `./vnext*` exports were removed during integration. Do not recreate them or ask consumers to migrate to a second set of primitive APIs. The initial handoff records an earlier implementation checkpoint; this document describes the current composition.

## Character provenance

The journey uses the r42 soft cuboid head at 96px. Smaller placements use plain Canon text. The head remains static as local state words change; consequential review relies on clear text and controls. The character guide separately shows the recommended r41 black-background body and six captioned r45 gestures at no more than 200px per cell. They do not drive runtime expressions. Earlier bodies and heads remain historical comparison evidence.

See [current character provenance and limits](../character/README.md) for exact assets, geometry and display-size acceptance. These are original generated local studies. The black-background body passes concept material review; the transparent head is accepted only at 96px. Larger cutout cleanup, user artwork approval and production release remain open.

## Validation

Focused workflow and multi-instance behavior checks: `pnpm exec vitest run src/lib/vnext`. These cover scope, distinct drafts, empty/early approval, reset, recovery, instance IDs, edit focus and heading focus. They passed after switching to shared controls. Actual browser, responsive, no-JS and reduced-motion evidence is recorded separately in Cook and `evidence/vnext`; a passing unit check does not establish visual acceptance.
