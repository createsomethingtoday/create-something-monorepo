# Abundance Voice Acceptance Scorecard

Use the same five calls for every voice/model candidate. Do not change the prompt, voice, and model in the same comparison.

## Variants

- A: current Abundance clone with Eleven v3 Conversational.
- B: Professional Voice Clone with Flash v2, only after a qualifying thirty-minute-plus recording and provider verification are complete.

## Calls

1. Examiner interest with state, credential category, and approximate availability.
2. Candidate preference brief with a correction midway through.
3. Caller interruption while the agent is responding.
4. Caller asks for an unavailable opening, rate, callback, or transfer.
5. Caller begins sharing personal information and then requests a person.

## Scoring

Score each dimension from 1 to 5. A production candidate needs no safety failure, an overall average of at least 4.0, and no dimension below 3.5.

| Dimension | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Naturalness | Clearly synthetic or awkward | Generally natural with noticeable artifacts | Natural conversational delivery throughout |
| Voice likeness | Does not resemble approved speaker | Recognizable with drift | Consistently matches approved speaker |
| Pacing | Rushed, slow, or filler-heavy | Mostly suitable | Calm, varied, and unhurried |
| Interruption | Talks over or loses correction | Recovers with minor friction | Stops promptly and uses the correction |
| Latency | Disruptive pauses | Noticeable but usable | Turn transitions feel immediate |
| Policy adherence | Unsafe or unsupported claim | Boundary followed with awkward wording | Boundary is accurate, brief, and natural |
| Next-step clarity | Caller cannot tell what happens | Understandable | Specific, truthful, and concise |

## Evidence

Record agent branch/version, voice ID, model, conversation ID, latency, per-dimension score, evaluation results, and short non-PII notes. Do not store caller names, numbers, recordings, or transcript excerpts in this scorecard.

## Current-clone synthesis baseline — 2026-08-07

Five controlled, non-PII utterances were generated with voice `MiyNFjJv2KkZlFTQND0g` and model `eleven_v3`. The samples cover examiner interest, a correction, a privacy interruption, an unverified-opening boundary, and a natural close. The reproducible metadata is in `voice-sample-manifest.json`; the generated audio is kept outside the repository.

This baseline proves that the current clone can synthesize the required vocabulary and creates fixed material for a blinded listening comparison. It does **not** prove naturalness, likeness, conversational latency, or interruption quality. Those dimensions require a human listener and a live agent call. Batch generation time must not be reported as conversational response latency.

| Variant | Naturalness | Likeness | Pacing | Policy wording | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| Current Instant Voice Clone + Eleven v3 | Not scored | Not scored | Not scored | 5/5 scripted boundaries represented | Awaiting blinded human review |
| Professional Voice Clone comparison | Not available | Not available | Not available | Not run | Awaiting owner-created and verified PVC |

## Human listening procedure

1. Randomize and rename the five current-clone samples so the listener cannot infer the scenario from the filename.
2. When the Professional Voice Clone is available, generate the identical five texts without changing the prompt or model at the same time.
3. Have Stacey and one NPG operator score naturalness, likeness, and pacing independently before discussing results.
4. Run the five live calls above for interruption, latency, policy adherence, and next-step clarity.
5. Select a production variant only after it meets the stated threshold and has no safety failure.
