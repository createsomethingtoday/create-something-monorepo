/**
 * Bitonic Sort Compute Shader
 * 
 * GPU-parallel sorting algorithm for sorting agents by cell index.
 * Bitonic sort has O(n log²n) comparisons but is highly parallelizable.
 * 
 * This shader performs one comparison step. The host must dispatch
 * multiple times with different stage/step parameters.
 */

struct SortUniforms {
    agentCount: u32,
    stage: u32,      // Current stage of bitonic sort (0 to log2(n))
    step: u32,       // Current step within stage
    _padding: u32,
}

struct AgentCell {
    cellAndAgent: u32,
}

@group(0) @binding(0) var<storage, read_write> agentCells: array<AgentCell>;
@group(0) @binding(1) var<uniform> sortUniforms: SortUniforms;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    let count = sortUniforms.agentCount;
    
    // Pad to power of 2 for bitonic sort
    let paddedCount = 1u << u32(ceil(log2(f32(count))));
    
    if (idx >= paddedCount / 2u) {
        return;
    }
    
    let stage = sortUniforms.stage;
    let step = sortUniforms.step;
    
    // Calculate partner index for comparison
    let blockSize = 2u << stage;
    let halfBlock = blockSize >> 1u;
    
    // Distance between elements being compared
    let distance = 1u << step;
    
    // Block index and position within block
    let blockIdx = idx / (blockSize >> 1u);
    let posInBlock = idx % (blockSize >> 1u);
    
    // Calculate the two indices to compare
    let groupSize = distance * 2u;
    let groupIdx = posInBlock / distance;
    let posInGroup = posInBlock % distance;
    
    let baseIdx = blockIdx * blockSize + groupIdx * groupSize + posInGroup;
    let i = baseIdx;
    let j = baseIdx + distance;
    
    // Bounds check
    if (j >= count) {
        return;
    }
    
    // Determine sort direction (ascending or descending for this block)
    let ascending = ((i / blockSize) % 2u) == 0u;
    
    let valI = agentCells[i].cellAndAgent;
    let valJ = agentCells[j].cellAndAgent;
    
    // Compare and swap if needed
    let shouldSwap = (ascending && valI > valJ) || (!ascending && valI < valJ);
    
    if (shouldSwap) {
        agentCells[i].cellAndAgent = valJ;
        agentCells[j].cellAndAgent = valI;
    }
}
