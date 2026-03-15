/**
 * Cell Assignment Compute Shader
 * 
 * Assigns each agent to a spatial hash grid cell based on position.
 * Output is used for sorting agents by cell for efficient neighbor queries.
 */

struct Uniforms {
    deltaTime: f32,
    agentCount: f32,
    arenaWidth: f32,
    arenaHeight: f32,
    goalStrength: f32,
    separationStrength: f32,
    wallStrength: f32,
    maxSpeed: f32,
    panicSpreadRadius: f32,
    wallCount: f32,
    targetCount: f32,
    scenario: f32,
    arenaCenterX: f32,
    arenaCenterY: f32,
    arenaRx: f32,
    arenaRy: f32,
    canvasWidth: f32,
    canvasHeight: f32,
    gridSizeX: f32,
    gridSizeY: f32,
}

// Agent cell assignment: packed as (cellIndex << 16) | agentIndex for sorting
struct AgentCell {
    cellAndAgent: u32,  // High 16 bits: cell index, Low 16 bits: agent index
}

@group(0) @binding(0) var<storage, read> agents: array<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read_write> agentCells: array<AgentCell>;

const GRID_COLS: u32 = 32u;
const GRID_ROWS: u32 = 24u;
const CELL_SIZE: f32 = 25.0;
const INVALID_CELL: u32 = 0xffffu;

fn getCellIndex(pos: vec2<f32>) -> u32 {
    // Invalid position = invalid cell
    if (pos.x < -500.0) {
        return INVALID_CELL;
    }
    let cellX = clamp(u32(pos.x / CELL_SIZE), 0u, GRID_COLS - 1u);
    let cellY = clamp(u32(pos.y / CELL_SIZE), 0u, GRID_ROWS - 1u);
    return cellY * GRID_COLS + cellX;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    let agentCount = u32(uniforms.agentCount);
    
    if (idx >= agentCount) {
        return;
    }
    
    // Get agent position
    let base = idx * 8u;
    let pos = vec2<f32>(agents[base], agents[base + 1u]);
    
    // Compute cell index
    let cellIdx = getCellIndex(pos);
    
    // Pack cell index and agent index for sorting
    // After sorting by this value, agents will be grouped by cell
    agentCells[idx].cellAndAgent = (cellIdx << 16u) | (idx & 0xffffu);
}
