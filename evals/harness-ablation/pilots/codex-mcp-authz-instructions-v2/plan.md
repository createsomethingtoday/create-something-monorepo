# Harness Ablation Plan

- Experiment: `codex-mcp-authz-instructions-v2`
- Environment: `isolated`
- Repetitions: 2
- Tasks: 1
- Expected runs: 8
- Randomization seed: `cre-1474-codex-mcp-authz-instructions-v1`
- Manifest SHA-256: `ad83b5e62998e7695dae1ffa40aebef14d6b9ca778c8fdbf3f13320bb198db7e`
- Plan SHA-256: `2b2f97cb00800d03a8a1aecc7b9ab5f8de3b157e05f0e0525cf90d5a5b796260`

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
| 1 | `control` | `gmail-route-classification` | 2 |
| 2 | `full` | `gmail-route-classification` | 1 |
| 3 | `without-root-instructions` | `gmail-route-classification` | 2 |
| 4 | `full` | `gmail-route-classification` | 2 |
| 5 | `without-package-instructions` | `gmail-route-classification` | 1 |
| 6 | `control` | `gmail-route-classification` | 1 |
| 7 | `without-root-instructions` | `gmail-route-classification` | 1 |
| 8 | `without-package-instructions` | `gmail-route-classification` | 2 |

This plan does not launch agents or change any harness component. Execute the schedule through an owning isolated or shadow harness and return a versioned result receipt.
