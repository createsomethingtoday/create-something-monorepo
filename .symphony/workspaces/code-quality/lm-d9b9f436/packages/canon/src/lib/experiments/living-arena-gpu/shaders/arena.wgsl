/**
 * Arena Line Rendering Shader
 * Draws arena boundaries, court, sections directly on the WebGPU canvas
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
    _padding1: f32,
    _padding2: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Line vertex data: x, y, r, g, b, a
struct LineVertex {
    pos: vec2<f32>,
    color: vec4<f32>,
}

@vertex
fn vertexMain(
    @location(0) position: vec2<f32>,
    @location(1) color: vec4<f32>
) -> VertexOutput {
    var output: VertexOutput;
    
    // Aspect ratio correction (matching agent rendering)
    let arenaAspect = uniforms.arenaWidth / uniforms.arenaHeight;
    let canvasAspect = uniforms.canvasWidth / uniforms.canvasHeight;
    
    var scaleX = 1.0;
    var scaleY = 1.0;
    
    if (canvasAspect > arenaAspect) {
        scaleX = arenaAspect / canvasAspect;
    } else {
        scaleY = canvasAspect / arenaAspect;
    }
    
    // Convert to normalized then clip space
    let normX = position.x / uniforms.arenaWidth;
    let normY = position.y / uniforms.arenaHeight;
    
    let clipX = (normX * 2.0 - 1.0) * scaleX;
    let clipY = (1.0 - normY * 2.0) * scaleY;
    
    output.position = vec4<f32>(clipX, clipY, 0.0, 1.0);
    output.color = color;
    
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}
