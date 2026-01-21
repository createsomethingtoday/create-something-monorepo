# @create-something/simulation

Deterministic simulation engine for SaaS demos. Built in Rust, runs as WASM.

## Philosophy

A demo should feel alive. Same seed = same story, but the story unfolds naturally with time.

```
9:00 AM → Morning rush, 3 items needing attention
2:00 PM → Afternoon steady, different items
5:00 PM → End of day, most work completed
```

## Features

- **Deterministic**: Same seed + time = identical output
- **Time-aware**: Metrics and items vary by time of day
- **Scenario-based**: Different verticals (dental, writer, agency)
- **Fast**: Rust compiled to WASM

## Usage

```typescript
import init, { Simulation } from '@create-something/simulation';

// Initialize WASM
await init();

// Create simulation for today
const sim = Simulation.fromTimestamp(Date.now(), 'dental');

// Get current state
const state = sim.stateAt(Date.now());

console.log(state.metrics.appointmentsCompleted); // Changes through the day
console.log(state.items.length); // Different items at different times
```

## Building

Requires [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/):

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build for web
pnpm build

# Run tests
pnpm test
```

## API

### `Simulation`

```typescript
// Create with explicit seed
const sim = new Simulation(BigInt(12345), 'dental');

// Create from timestamp (same day = same seed)
const sim = Simulation.fromTimestamp(Date.now(), 'dental');

// Get complete state
const state: SimState = sim.stateAt(Date.now());

// Get just items
const items: SimItem[] = sim.itemsAt(Date.now());

// Get just metrics
const metrics: SimMetrics = sim.metricsAt(Date.now());

// Get activity log
const log: SimLogEntry[] = sim.activityLogAt(Date.now(), 10);
```

### Types

See `types.ts` for full type definitions.

## Scenarios

Currently implemented:
- `dental` - Dental practice simulation

Planned:
- `writer` - Writer/author workflow
- `agency` - Marketing agency

## How It Works

1. **Seeded PRNG**: xorshift64 for fast, reproducible randomness
2. **Time decomposition**: Extract hour, minute, day-of-week from timestamp
3. **Scenario generation**: Each scenario defines how metrics/items vary with time
4. **Deterministic output**: Same inputs = identical outputs, always

## Architecture

```
src/
├── lib.rs        # WASM exports, main types
├── rng.rs        # Deterministic random number generator
├── scenario.rs   # Scenario trait, time utilities
└── dental.rs     # Dental practice implementation
```
