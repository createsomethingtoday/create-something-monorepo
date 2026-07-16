# Agency Map Public Overlay Copy Rules

Use this file to define public Map language while preserving the internal Canon Atlas structure.

## Rules

- Name the workflow object before the action.
- Name the owner, evidence, receipt, and next action when a surface asks for trust.
- Keep state words stable across modalities: `ready`, `review`, `blocked`, `complete`.
- For Map, prefer the operational state words already visible in the canvas: `run`, `wait`, `stop`, `proof`, and `unknown`.
- Public copy must make the boundary explicit: the visitor edits a prospect map; production tools and private systems stay outside the surface.
- Booking copy must carry the readiness signal and next decision, not a generic consultation pitch.
- Keep reasoning and policy details off thin displays; summarize the decision and route to the full receipt.
- Do not rename Canon primitives to project-specific concepts when the primitive behavior is unchanged.

## Voice And Chat

- Prefer short declarative sentences.
- Make handoffs explicit: who owns the next step, what proof exists, and where the durable record lives.
- Agent replies can suggest map mutations, but they must not imply access to private customer systems.
- Do not put private chain-of-thought, hidden policy text, or speculative rationale in user-visible output.

## Web And App

- Put proof beside claims.
- Use action labels that describe the result, not the component.
- Keep local marketing tone in project copy files, not Canon primitives.
- On `/map`, connect story, editable map, readiness, and booking handoff in that order.
