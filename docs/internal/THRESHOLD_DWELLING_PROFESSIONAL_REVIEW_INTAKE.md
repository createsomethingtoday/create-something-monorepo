# Threshold Dwelling Professional Review Intake

**Purpose:** provide the exact evidence register WorkWay Composer must maintain before it asks a qualified professional or the authority having jurisdiction for a construction-readiness determination.

**Current state:** all requirements are `missing`. The model remains `candidate-design-intent`; it is not a construction, code, permit, survey, or safety-certified package.

## Operating rule

Composer may ingest, organize, compare, and flag documents. It may propose a deterministic model change only after the governing human accepts it. It must never infer a stamp, clearance, egress attribute, engineering design, permit outcome, or construction readiness from a rendering or a text prompt.

## Intake register

| Requirement | Responsible role | Minimum artifacts | What it resolves |
| --- | --- | --- | --- |
| Licensed site survey | Registered professional land surveyor | Sealed boundary/easement survey; topographic grades and datum; utility/right-of-way context | Parcel, setbacks, access, grades, and site reference |
| Coordinated architectural package | Architect or qualified residential design professional | Dimensioned plan/section/elevation; door/window/fixture/finish/clearance schedules; threshold/weather details | Assemblies, room use, dimensions, circulation and egress intent |
| Structural and wind design | Licensed structural engineer | Foundation/framing/roof/connections; wind bracing and criteria; calculations | Load path, wind resistance, foundation, connections |
| MEP design | Licensed or jurisdiction-qualified MEP professionals | HVAC/ventilation/condensate; electrical/lighting/life-safety; plumbing supply/waste/vent | System coordination and required services |
| Energy compliance | Energy rater or qualified compliance professional | Compliance report; envelope/glazing/shading specification; HVAC efficiency/testing | Measurable envelope and systems performance |
| Jurisdictional determination | Authority having jurisdiction and project team | Zoning/plat/setback/access decision; permit path; conditions/review comments | Actual local project path and exceptions |

Grandview’s public guidance identifies a final plat, site plan, stamped engineering, MEP layouts, dimensioned architecture, wind bracing, and an energy letter for new residential construction. This register turns that guidance into an evidence request, not a local-code determination. [City of Grandview: Building & Construction Information](https://www.cityofgrandview.org/611/Building-Construction-Information)

## Evidence lifecycle

`missing → submitted → accepted`

“Accepted” means a designated reviewer is identified and has accepted a supplied artifact for the requirement; it does **not** mean WorkWay may set `constructionReady = true`. A document with no named reviewer remains `submitted`, even if its sender labels it accepted. Once every requirement is accepted, the product may request a human professional determination. Only that determination and the applicable authority process can govern construction readiness.

## Composer behavior

For each document, Composer should retain its identifier, source, author/submitter, discipline, date, revision, reviewer, acceptance status, and exact model deltas it supports. It should surface conflicts such as a survey setback that disagrees with a plan, or a structural wall condition that invalidates a proposed geometry edit. The default allowed uses remain visual walkthroughs, rough program comparisons, proposed-change previews, and decision capture.

Do not use this intake for field staking, procurement quantities, permit submission, or safety/compliance assertions until the completed professional package is attached and the responsible parties make their determinations.
