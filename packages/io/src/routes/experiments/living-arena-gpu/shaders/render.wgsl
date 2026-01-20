/**
 * Crowd Rendering Shader
 *
 * Renders agents as colored circles using instanced drawing.
 * Color indicates agent state:
 * - Green: calm
 * - Yellow: crowded (high density)
 * - Red: panicked
 *
 * Size varies slightly by agent for visual interest.
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
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) localPos: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> agents: array<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// Agent state constants
const STATE_CALM: u32 = 0u;
const STATE_CROWDED: u32 = 1u;
const STATE_PANICKED: u32 = 2u;

// Colors for each state (using Canon-inspired palette)
const COLOR_CALM = vec4<f32>(0.2, 0.8, 0.4, 0.85);      // Green
const COLOR_CROWDED = vec4<f32>(0.9, 0.7, 0.2, 0.85);   // Yellow/gold
const COLOR_PANICKED = vec4<f32>(0.9, 0.2, 0.2, 0.9);   // Red

// Base agent size
const AGENT_SIZE: f32 = 4.0;

// Hash function for size variation
fn hash(n: u32) -> f32 {
    var x = n;
    x = ((x >> 16u) ^ x) * 0x45d9f3bu;
    x = ((x >> 16u) ^ x) * 0x45d9f3bu;
    x = (x >> 16u) ^ x;
    return f32(x) / f32(0xffffffffu);
}

@vertex
fn vertexMain(
    @location(0) vertexPos: vec2<f32>,
    @builtin(instance_index) instanceIdx: u32
) -> VertexOutput {
    var output: VertexOutput;
    
    // Get agent data
    let base = instanceIdx * 8u;
    let agentPos = vec2<f32>(agents[base], agents[base + 1u]);
    let velocity = vec2<f32>(agents[base + 2u], agents[base + 3u]);
    let state = u32(agents[base + 6u]);
    
    // Skip off-screen agents
    if (agentPos.x < -500.0) {
        output.position = vec4<f32>(-10.0, -10.0, 0.0, 1.0);
        output.color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        output.localPos = vec2<f32>(0.0, 0.0);
        return output;
    }
    
    // Size variation based on instance index
    let sizeVariation = 0.7 + hash(instanceIdx) * 0.6; // 0.7 to 1.3
    var size = AGENT_SIZE * sizeVariation;
    
    // Slightly larger when panicked
    if (state == STATE_PANICKED) {
        size *= 1.2;
    }
    
    // Calculate world position
    let worldPos = agentPos + vertexPos * size;
    
    // Convert to clip space (-1 to 1)
    let clipX = (worldPos.x / uniforms.arenaWidth) * 2.0 - 1.0;
    let clipY = 1.0 - (worldPos.y / uniforms.arenaHeight) * 2.0; // Flip Y
    
    output.position = vec4<f32>(clipX, clipY, 0.0, 1.0);
    
    // Color based on state
    if (state == STATE_PANICKED) {
        output.color = COLOR_PANICKED;
    } else if (state == STATE_CROWDED) {
        output.color = COLOR_CROWDED;
    } else {
        output.color = COLOR_CALM;
    }
    
    // Subtle color variation for visual interest
    let colorVariation = hash(instanceIdx + 1000u) * 0.1;
    output.color.r += colorVariation - 0.05;
    output.color.g += colorVariation - 0.05;
    output.color.b += colorVariation - 0.05;
    
    // Motion blur effect for fast agents
    let speed = length(velocity);
    if (speed > 2.0) {
        output.color.a *= 0.9; // Slightly transparent when moving fast
    }
    
    output.localPos = vertexPos;
    
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    // Circular shape with soft edge
    let dist = length(input.localPos);
    
    // Discard pixels outside circle
    if (dist > 1.0) {
        discard;
    }
    
    // Soft edge
    let alpha = input.color.a * smoothstep(1.0, 0.7, dist);
    
    // Slight gradient from center (brighter in center)
    let brightness = 1.0 + (1.0 - dist) * 0.2;
    
    return vec4<f32>(
        input.color.rgb * brightness,
        alpha
    );
}
