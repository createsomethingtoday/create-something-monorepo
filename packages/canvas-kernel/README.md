# `@create-something/canvas-kernel`

Shared CREATE SOMETHING canvas package for Atlas, Substrate, and Topology surfaces.

It owns two contracts:

- `CanvasKernel`: a WebGPU-first React renderer for large operational maps, with Canvas2D as the explicit compatibility fallback.
- `flow.shared-canvas-state.v1`: the substrate-to-canvas state packet used by API, MCP, agent, and UI consumers.
- `flow.substrate-compute-snapshot.v1`: the indexed, CPU-first compute packet used for future GPU impact, attention, simulation, and agent queue projections.

The package keeps render state separate from canonical record state. Stable IDs such as `substrateRecordId`, `topologyNodeId`, `atlasCanvasId`, and `atlasNodeId` remain data-layer joins; canvas position, viewport, selection, and level-of-detail are visual metadata.
