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
    // Ellipse parameters
    arenaCenterX: f32,
    arenaCenterY: f32,
    arenaRx: f32,
    arenaRy: f32,
    // Canvas dimensions for aspect ratio correction
    canvasWidth: f32,
    canvasHeight: f32,
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

// Role constants (encoded in group_id bits 0-1)
const ROLE_FAN: u32 = 0u;
const ROLE_PLAYER: u32 = 1u;
const ROLE_STAFF: u32 = 2u;

// Team constants (encoded in group_id bits 2-3)
const TEAM_HOME: u32 = 0u;
const TEAM_AWAY: u32 = 1u;

// Colors for fans by state
const COLOR_CALM = vec4<f32>(0.2, 0.8, 0.4, 0.85);      // Green
const COLOR_CROWDED = vec4<f32>(0.9, 0.7, 0.2, 0.85);   // Yellow/gold
const COLOR_PANICKED = vec4<f32>(0.9, 0.2, 0.2, 0.9);   // Red

// Colors for players/staff
const COLOR_HOME_PLAYER = vec4<f32>(0.85, 0.2, 0.2, 0.95);    // Red (home team)
const COLOR_AWAY_PLAYER = vec4<f32>(0.2, 0.4, 0.9, 0.95);     // Blue (away team)
const COLOR_STAFF = vec4<f32>(0.1, 0.1, 0.1, 0.95);           // Black (refs/officials)

// Base agent size
const AGENT_SIZE: f32 = 4.0;
const PLAYER_SIZE: f32 = 6.0;  // Players are larger

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
    let groupData = u32(agents[base + 7u]);
    
    // Decode role and team from groupData
    let role = groupData & 0x3u;
    let teamId = (groupData >> 2u) & 0x3u;
    
    // Skip off-screen agents
    if (agentPos.x < -500.0) {
        output.position = vec4<f32>(-10.0, -10.0, 0.0, 1.0);
        output.color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        output.localPos = vec2<f32>(0.0, 0.0);
        return output;
    }
    
    // Size based on role
    var baseSize = AGENT_SIZE;
    if (role == ROLE_PLAYER) {
        baseSize = PLAYER_SIZE;
    } else if (role == ROLE_STAFF) {
        baseSize = PLAYER_SIZE * 0.9;
    }
    
    // Size variation for fans only
    var sizeVariation = 1.0;
    if (role == ROLE_FAN) {
        sizeVariation = 0.7 + hash(instanceIdx) * 0.6; // 0.7 to 1.3
    }
    var size = baseSize * sizeVariation;
    
    // Slightly larger when panicked
    if (state == STATE_PANICKED) {
        size *= 1.2;
    }
    
    // Calculate world position
    let worldPos = agentPos + vertexPos * size;
    
    // Convert to clip space with aspect ratio preservation (matching SVG "xMidYMid meet")
    // Calculate scale factors for "meet" behavior
    let arenaAspect = uniforms.arenaWidth / uniforms.arenaHeight;
    let canvasAspect = uniforms.canvasWidth / uniforms.canvasHeight;
    
    var scaleX = 1.0;
    var scaleY = 1.0;
    
    if (canvasAspect > arenaAspect) {
        // Canvas is wider than arena - scale by height, add horizontal padding
        scaleX = arenaAspect / canvasAspect;
    } else {
        // Canvas is taller than arena - scale by width, add vertical padding
        scaleY = canvasAspect / arenaAspect;
    }
    
    // Normalize to 0-1 range first
    let normX = worldPos.x / uniforms.arenaWidth;
    let normY = worldPos.y / uniforms.arenaHeight;
    
    // Convert to clip space (-1 to 1) with aspect correction and centering
    let clipX = (normX * 2.0 - 1.0) * scaleX;
    let clipY = (1.0 - normY * 2.0) * scaleY; // Flip Y
    
    output.position = vec4<f32>(clipX, clipY, 0.0, 1.0);
    
    // Color based on role and team
    if (role == ROLE_PLAYER) {
        if (teamId == TEAM_HOME) {
            output.color = COLOR_HOME_PLAYER;
        } else {
            output.color = COLOR_AWAY_PLAYER;
        }
    } else if (role == ROLE_STAFF) {
        output.color = COLOR_STAFF;
    } else {
        // Fans - color based on state
        if (state == STATE_PANICKED) {
            output.color = COLOR_PANICKED;
        } else if (state == STATE_CROWDED) {
            output.color = COLOR_CROWDED;
        } else {
            output.color = COLOR_CALM;
        }
    }
    
    // Subtle color variation for visual interest (fans only)
    if (role == ROLE_FAN) {
        let colorVariation = hash(instanceIdx + 1000u) * 0.1;
        output.color.r += colorVariation - 0.05;
        output.color.g += colorVariation - 0.05;
        output.color.b += colorVariation - 0.05;
    }
    
    // Motion blur effect for fast agents
    let speed = length(velocity);
    if (speed > 2.0) {
        output.color.a *= 0.9;
    }
    
    output.localPos = vertexPos;
    
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    // Circular shape with sharp edge
    let dist = length(input.localPos);
    
    // Discard pixels outside circle
    if (dist > 1.0) {
        discard;
    }
    
    // Sharp edge with minimal anti-aliasing (0.92-1.0 = 8% fade)
    let alpha = input.color.a * smoothstep(1.0, 0.92, dist);
    
    // Flat color (no gradient) for crisp appearance
    return vec4<f32>(input.color.rgb, alpha);
}
