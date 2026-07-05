# Space Workbench Overlay Copy Rules

Use this file to define Space-local workbench language while preserving Canon structure.

## Rules

- Name the workflow object before the action.
- Name the owner, evidence, receipt, and next action when a surface asks for trust.
- Keep state words stable across modalities: `ready`, `review`, `blocked`, `complete`.
- Keep reasoning and policy details off thin displays; summarize the decision and route to the full receipt.
- Do not rename Canon primitives to project-specific concepts when the primitive behavior is unchanged.
- Start tool handoffs with the tool, state, required input, proof, and next action.
- Keep experiment, playground, and dataset copy local to Space until repeated use proves a Canon primitive need.
- Use Canon terms for structure: `decision`, `proof`, `receipt`, `template`, `overlay`, and `extension intake`.

## Voice And Chat

- Prefer short declarative sentences.
- Make handoffs explicit: who owns the next step, what proof exists, and where the durable record lives.
- Do not put private chain-of-thought, hidden policy text, or speculative rationale in user-visible output.
- Summarize workbench state as tool, owner, state, blocker if any, proof, and next action.
- For voice, do not enumerate large datasets or controls. Route the operator to the workbench or receipt.
- For chat, use structured routing and experiment data before inferred summaries.

## Web And App

- Put proof beside claims.
- Use action labels that describe the result, not the component.
- Keep local marketing tone in project copy files, not Canon primitives.
- Web and app surfaces can show live controls, data tables, playgrounds, and detailed receipts.
- Keep destructive or production-affecting actions behind the owning workflow; this overlay only defines UI/UX structure.
- Do not promote Space-specific tool copy into Canon unless another property proves the same workbench primitive need.
