# Workflow Film v1

`workflow-film/v1` is the machine-readable story contract for short CREATE
SOMETHING films about delegated work. It separates workflow meaning from
Remotion rendering so another application can author a run as data instead of
copying scene JSX.

## Authoring model

Each event declares:

- a minute and display clock within the represented run;
- an actor: `system`, `agent`, `function`, or `human`;
- an execution mode: `observe`, `mcp`, `programmatic`, or `judgment`;
- a run state: `signal`, `running`, `waiting`, `continued`, `stopped`, or
  `completed`;
- short operator-facing copy; and
- a unique receipt containing state, owner, and evidence.

An `agent` event represents bounded work through an MCP-connected capability.
It may expose a short rationale summary, but never hidden chain-of-thought. A
`function` event is deterministic programmatic work. A `human` event is a
declared judgment boundary, not routine supervision.

The workflow metadata declares `startMinuteOfDay` as an integer from `0` to
`1439` plus the represented `spanMinutes`. The renderer derives every clock and
rail label from those values; it does not assume an 08:00 start. Closing label,
line breaks, promise, call to action, and destination also belong to the spec so
another application does not need to fork the renderer.

## Blocking gate contract

A waiting event owns one blocking gate. The gate must name useful work that can
continue safely, an approval path that resumes the mutation, rejection and
timeout paths that stop it, an escalation deadline, and a resumable checkpoint.

The primary film may follow the approved branch, but stop and recovery semantics
remain part of the authored data and visible interface.

## Visual grammar

The shared renderer intentionally limits every frame to:

1. one persistent run-time rail;
2. one primary event card;
3. one actor/execution/state signature; and
4. a progressive receipt stream.

This keeps a broad system legible without turning it into a connector montage.
Required meaning is burned into the frame so the film remains sound-off safe.

## Reuse path

1. Copy the concrete `workflow-day-reel/spec.ts` as an authoring example.
2. Replace workflow metadata, scenes, events, receipts, gates, and closing copy.
3. Render the data with `<WorkflowFilm spec={yourSpec} />`.
4. Run the generic `validateWorkflowFilmSpec` contract, then add any
   campaign-specific policy checks alongside it.

The generic validator owns format integrity: frame/safe-area contract,
contiguous scenes, actor/mode compatibility, ordered events, receipt parity,
blocking-gate recovery, copy limits, time coverage, and beat-grid alignment.
`validate:workflow-film` adds the concrete policy for the 24-hour launch-change
proof, including its required actors, states, 60-second duration, promise, and
CTA. Film duration is authored per spec as a positive integer number of frames
that must end on its declared musical beat grid; the shared format does not
assume a 30-second cut.

Run `pnpm validate:workflow-film` from Motion Studio to validate the reference
film. Run `pnpm generate:workflow-day-score` to reproduce its purpose-composed
60-second score; `generate:workflow-score` continues to reproduce the preserved
30-second reel score.
