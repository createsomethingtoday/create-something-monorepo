# Infrastructure Improvements from Boris Cherny Interview

Insights from the Claude Code creator's interview, applied to CREATE SOMETHING infrastructure.

## Overview

Boris Cherny shared several engineering practices that directly apply to our harness and tooling:
1. Multi-agent swarm orchestration for parallel work
2. Auto-generation of lint rules from repeated feedback patterns
3. Model-capability-aware confidence thresholds
4. Latent demand analysis for product direction

## Features

### Parallel Swarm Orchestration (P2)
**Issue**: create-something-monorepo-a7oa

Currently harness spawns sessions sequentially. Boris described running "a swarm of 20 clouds" in parallel.

- Detect task independence from spec parsing
- Spawn N agents for independent tasks
- Aggregate results across parallel sessions
- Handle partial failures gracefully
- Update checkpoint reporting for swarm progress

### Auto-Generate Lint Rules (P2)
**Issue**: create-something-monorepo-dhfm

Boris tracked repeated code review feedback in a spreadsheet, then auto-generated lint rules.

- Track repeated feedback patterns in PR comments
- Threshold detection (same comment type > N times)
- ESLint rule template generation
- Svelte-specific rule support
- Integration with existing Canon audit tooling

### Dynamic Confidence Thresholds (P3)
**Issue**: create-something-monorepo-7xg7

"Build for the model 6 months from now" - current 70% confidence threshold is static.

- Model version detection in harness
- Capability benchmark lookup
- Dynamic threshold adjustment
- Fallback to conservative defaults for unknown models

### Latent Demand Analysis (P3)
**Issue**: create-something-monorepo-hfz9

"Find the intent users already have and steer it."

- Audit analytics across .space, .io, .agency, .ltd
- Identify feature abuse patterns
- Document discovered user intents
- Propose product directions based on findings
