# Cook repair rounds template

This is a blank evidence template. No repair, check, independent review, or production action is asserted by its presence. Copy it into the assigned evidence destination and fill each round from actual observations.

## Round `<native attempt/run ID>`

- Case / source SHA / resulting SHA: `<runtime values>`
- Assignment and scope references: `<durable references>`
- Failure receipt IDs addressed: `<exact IDs from planner input>`
- Dispatch receipt / completion receipt: `<native IDs; pending if absent>`
- Reproduction before change: `<command or actual behavior, failing output reference>`
- Changes within authorized paths: `<paths and purpose>`
- Verification after change: `<commands, results and evidence references>`
- Functional gate: `<passed / failed / untested / not-applicable; fixture versus live limits>`
- Product gate: `<passed / failed / untested / not-applicable; actual viewing/listening evidence>`
- Release gate: `<passed / failed / untested / not-applicable; authority and artifact limits>`
- Remaining findings or blockers: `<specific items>`
- Worktree disposition: `<removed / preserved at path and branch / retained until checkpoint>`
- Next owner and next action: `<coordinator reconciliation; independent reviewer; CI; or operator hold>`

## Resume checkpoint

Record the last reconciled native case revision, issue/run state, durable receipt IDs, exact checkout SHA, and outstanding evidence. The next receiver reads native state again and compares these bindings before continuing. Preserve historical dispatch and completion receipts across new SHAs so the three-attempt case budget remains bounded. A dispatch and completion for one source SHA count as one attempt. Do not treat this template or a locally filled round as a native receipt or publication permission.
