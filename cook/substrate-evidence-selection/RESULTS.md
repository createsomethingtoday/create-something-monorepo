## Operating-slice evidence pilot

On November 23, 2026, Jev selected the correct first source on four of the six answerable questions and abstained on the other two. It also abstained on both questions lacking evidence. All eight live provider calls returned valid decisions. The first-listed baseline chose correctly twice. Local word overlap yielded two correct selections and two correct abstentions.

The two missed sources covered database-layer UI design and reusable database primitives. Their filenames and generic topology summaries gave Jev limited context. This result supports offering Jev as an optional first suggestion. The pilot used one six-document slice, including an ownership question with six valid choices. Open the source to verify every suggestion.

The saved [case results](./jev-evaluation.json) record source IDs, expected paths, abstentions, elapsed ranker time, and provider failures. A separate live CLI run selected the MCP Hub Control Plane guide for the gateway question and preserved all six evidence paths.

## Timed operator study

Operator time is unmeasured. From the worktree root, a facilitator can start a local session:

```sh
node packages/database-layer/scripts/pilot-slice-evidence.mjs 0 cook/substrate-evidence-selection/jev-evaluation.json /tmp/substrate-pilot-participant-0.json
```

Assign each participant a distinct index. Consecutive pairs starting at an even index see the same question order with opposite assignments. Ask participants to open the sources and verify the answer before entering the displayed number. Record incorrect and skipped trials alongside time for correct trials. Recommendations are computed in advance, so the timer covers human inspection and excludes provider latency.
