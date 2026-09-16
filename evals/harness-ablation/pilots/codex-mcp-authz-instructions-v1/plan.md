# Harness Ablation Plan

- Experiment: `codex-mcp-authz-instructions-v1`
- Environment: `isolated`
- Repetitions: 2
- Tasks: 1
- Expected runs: 8
- Randomization seed: `cre-1474-codex-mcp-authz-instructions-v1`
- Manifest SHA-256: `4364c23b69929ec4da5f4ab59a94773bf8eeb47d61c288b903f30decf0dfa710`
- Plan SHA-256: `569e8675171f057d49aceec48cb5490d945cf2eeccaea3ba6201460135934bf8`

## Arms

| Arm | Enabled | Disabled | Isolated required |
|---|---|---|---|
| `control` | none | root-instructions, package-instructions | yes |
| `full` | root-instructions, package-instructions | none | no |
| `without-root-instructions` | package-instructions | root-instructions | yes |
| `without-package-instructions` | root-instructions | package-instructions | no |

## Randomized schedule

| Sequence | Arm | Task | Repetition |
|---:|---|---|---:|
| 1 | `control` | `gmail-route-classification` | 1 |
| 2 | `without-root-instructions` | `gmail-route-classification` | 1 |
| 3 | `without-package-instructions` | `gmail-route-classification` | 2 |
| 4 | `without-package-instructions` | `gmail-route-classification` | 1 |
| 5 | `full` | `gmail-route-classification` | 2 |
| 6 | `control` | `gmail-route-classification` | 2 |
| 7 | `without-root-instructions` | `gmail-route-classification` | 2 |
| 8 | `full` | `gmail-route-classification` | 1 |

This plan does not launch agents or change any harness component. Execute the schedule through an owning isolated or shadow harness and return a versioned result receipt.
