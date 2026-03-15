/**
 * Cell Bounds Compute Shader
 * 
 * After agents are sorted by cell, this shader determines the start/end
 * index for each cell in the sorted array. This enables O(1) lookup of
 * all agents in a given cell.
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

struct AgentCell {
    cellAndAgent: u32,
}

struct CellBounds {
    start: u32,
    end: u32,
}

@group(0) @binding(0) var<storage, read> sortedAgentCells: array<AgentCell>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read_write> cellBounds: array<CellBounds>;
@group(0) @binding(3) var<storage, read_write> sortedAgentIndices: array<u32>;

const GRID_COLS: u32 = 32u;
const GRID_ROWS: u32 = 24u;
const TOTAL_CELLS: u32 = 768u;
const INVALID_CELL: u32 = 0xffffu;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    let agentCount = u32(uniforms.agentCount);
    
    if (idx >= agentCount) {
        return;
    }
    
    // Extract cell index and agent index from sorted data
    let packed = sortedAgentCells[idx].cellAndAgent;
    let cellIdx = packed >> 16u;
    let agentIdx = packed & 0xffffu;
    
    // Store the agent index for the main simulation to use
    sortedAgentIndices[idx] = agentIdx;
    
    // Skip invalid cells (inactive agents)
    if (cellIdx == INVALID_CELL) {
        return;
    }
    
    // Determine if this is the start of a new cell
    if (idx == 0u) {
        // First agent starts its cell
        cellBounds[cellIdx].start = 0u;
    } else {
        let prevPacked = sortedAgentCells[idx - 1u].cellAndAgent;
        let prevCellIdx = prevPacked >> 16u;
        
        if (cellIdx != prevCellIdx) {
            // This agent starts a new cell
            cellBounds[cellIdx].start = idx;
            
            // Previous cell ends here (if it was valid)
            if (prevCellIdx != INVALID_CELL) {
                cellBounds[prevCellIdx].end = idx;
            }
        }
    }
    
    // Determine if this is the end of a cell
    if (idx == agentCount - 1u) {
        // Last agent ends its cell
        if (cellIdx != INVALID_CELL) {
            cellBounds[cellIdx].end = agentCount;
        }
    }
}

// Separate kernel to reset cell bounds before each frame
@compute @workgroup_size(64)
fn resetCells(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let cellIdx = global_id.x;
    
    if (cellIdx >= TOTAL_CELLS) {
        return;
    }
    
    cellBounds[cellIdx].start = 0u;
    cellBounds[cellIdx].end = 0u;
}
