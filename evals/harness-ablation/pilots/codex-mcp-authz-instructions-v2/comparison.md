# Harness Ablation Comparison

- Experiment: `codex-mcp-authz-instructions-v2`
- Provenance: `codex-cli-0.146.0-alpha.3.1-gpt-5.6-terra-medium-isolated-historical-reconstruction-real-pilot-v2`
- Complete runs: 8/8
- Control to full utility: -0.002094

## Decisions

| Component | Decision | Contribution | Overhead | Reason |
|---|---|---:|---:|---|
| `root-instructions` | **unresolved** | 0.001103 | 0 | The observed marginal contribution is below the configured materiality thresholds. |
| `package-instructions` | **unresolved** | 0.00015 | 0 | The observed marginal contribution is below the configured materiality thresholds. |

Next decision: Run a sharper task corpus or more repetitions before changing unresolved components.
