/**
 * Crowd Simulation Compute Shader
 *
 * Implements social force model for crowd dynamics:
 * - Goal attraction: agents move toward their targets
 * - Separation: agents avoid colliding with each other
 * - Wall avoidance: agents stay away from walls/obstacles
 * - Panic spreading: panicked agents influence nearby calm agents
 *
 * Uses spatial hashing concepts for neighbor queries, though simplified
 * for compute shader constraints.
 */

// Agent data structure (8 floats per agent)
// [0-1]: position (x, y)
// [2-3]: velocity (vx, vy)
// [4-5]: target (tx, ty)
// [6]: state (0=calm, 1=crowded, 2=panicked)
// [7]: group_id

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

struct Wall {
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
}

struct Target {
    x: f32,
    y: f32,
    radius: f32,
    weight: f32,
}

@group(0) @binding(0) var<storage, read_write> agents: array<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read> walls: array<Wall>;
@group(0) @binding(3) var<storage, read> targets: array<Target>;

// Constants
const AGENT_RADIUS: f32 = 4.0;
const PERCEPTION_RADIUS: f32 = 50.0;
const PANIC_THRESHOLD: f32 = 0.7;
const CROWD_DENSITY_THRESHOLD: f32 = 5.0;
const STATE_CALM: u32 = 0u;
const STATE_CROWDED: u32 = 1u;
const STATE_PANICKED: u32 = 2u;

// Get agent position
fn getPosition(idx: u32) -> vec2<f32> {
    let base = idx * 8u;
    return vec2<f32>(agents[base], agents[base + 1u]);
}

// Get agent velocity
fn getVelocity(idx: u32) -> vec2<f32> {
    let base = idx * 8u;
    return vec2<f32>(agents[base + 2u], agents[base + 3u]);
}

// Get agent target
fn getTarget(idx: u32) -> vec2<f32> {
    let base = idx * 8u;
    return vec2<f32>(agents[base + 4u], agents[base + 5u]);
}

// Get agent state
fn getState(idx: u32) -> u32 {
    let base = idx * 8u;
    return u32(agents[base + 6u]);
}

// Set agent position
fn setPosition(idx: u32, pos: vec2<f32>) {
    let base = idx * 8u;
    agents[base] = pos.x;
    agents[base + 1u] = pos.y;
}

// Set agent velocity
fn setVelocity(idx: u32, vel: vec2<f32>) {
    let base = idx * 8u;
    agents[base + 2u] = vel.x;
    agents[base + 3u] = vel.y;
}

// Set agent state
fn setState(idx: u32, state: u32) {
    let base = idx * 8u;
    agents[base + 6u] = f32(state);
}

// Calculate distance to line segment (wall)
fn distanceToWall(point: vec2<f32>, wall: Wall) -> f32 {
    let a = vec2<f32>(wall.x1, wall.y1);
    let b = vec2<f32>(wall.x2, wall.y2);
    let ab = b - a;
    let ap = point - a;
    
    let t = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
    let closest = a + t * ab;
    
    return length(point - closest);
}

// Get wall normal (pointing away from wall)
fn getWallNormal(point: vec2<f32>, wall: Wall) -> vec2<f32> {
    let a = vec2<f32>(wall.x1, wall.y1);
    let b = vec2<f32>(wall.x2, wall.y2);
    let ab = b - a;
    let ap = point - a;
    
    let t = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
    let closest = a + t * ab;
    
    let toPoint = point - closest;
    let dist = length(toPoint);
    
    if (dist < 0.001) {
        // Point is on the wall, use perpendicular
        return normalize(vec2<f32>(-ab.y, ab.x));
    }
    
    return toPoint / dist;
}

// Hash function for pseudo-random behavior
fn hash(n: u32) -> f32 {
    var x = n;
    x = ((x >> 16u) ^ x) * 0x45d9f3bu;
    x = ((x >> 16u) ^ x) * 0x45d9f3bu;
    x = (x >> 16u) ^ x;
    return f32(x) / f32(0xffffffffu);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    let agentCount = u32(uniforms.agentCount);
    
    // Bounds check
    if (idx >= agentCount) {
        return;
    }
    
    let pos = getPosition(idx);
    var vel = getVelocity(idx);
    let target = getTarget(idx);
    var state = getState(idx);
    
    // Skip inactive agents (off-screen)
    if (pos.x < -500.0) {
        return;
    }
    
    // ============================================
    // Force Accumulation
    // ============================================
    
    var totalForce = vec2<f32>(0.0, 0.0);
    var neighborCount = 0u;
    var panicNeighbors = 0u;
    
    // 1. Goal force - move toward target
    let toTarget = target - pos;
    let targetDist = length(toTarget);
    if (targetDist > 1.0) {
        let goalDirection = toTarget / targetDist;
        // Speed based on state (panicked agents move faster)
        var desiredSpeed = uniforms.maxSpeed;
        if (state == STATE_PANICKED) {
            desiredSpeed *= 1.5;
        } else if (state == STATE_CROWDED) {
            desiredSpeed *= 0.8;
        }
        let desiredVel = goalDirection * desiredSpeed;
        totalForce += (desiredVel - vel) * uniforms.goalStrength;
    }
    
    // 2. Separation force - avoid other agents
    // Check nearby agents (simplified spatial query)
    for (var i = 0u; i < agentCount; i++) {
        if (i == idx) {
            continue;
        }
        
        let otherPos = getPosition(i);
        
        // Skip inactive agents
        if (otherPos.x < -500.0) {
            continue;
        }
        
        let toOther = otherPos - pos;
        let dist = length(toOther);
        
        if (dist < PERCEPTION_RADIUS && dist > 0.001) {
            neighborCount++;
            
            // Count panicked neighbors
            let otherState = getState(i);
            if (otherState == STATE_PANICKED) {
                panicNeighbors++;
            }
            
            // Separation force (stronger when closer)
            if (dist < AGENT_RADIUS * 4.0) {
                let separationDir = -toOther / dist;
                let separationMag = uniforms.separationStrength * (1.0 - dist / (AGENT_RADIUS * 4.0));
                totalForce += separationDir * separationMag;
            }
        }
    }
    
    // 3. Wall avoidance force
    let wallCount = u32(uniforms.wallCount);
    for (var w = 0u; w < wallCount; w++) {
        let wall = walls[w];
        let dist = distanceToWall(pos, wall);
        
        if (dist < AGENT_RADIUS * 6.0 && dist > 0.001) {
            let normal = getWallNormal(pos, wall);
            let wallForce = uniforms.wallStrength * (1.0 - dist / (AGENT_RADIUS * 6.0));
            totalForce += normal * wallForce;
        }
    }
    
    // 4. Arena boundary force
    let margin = 20.0;
    if (pos.x < margin) {
        totalForce.x += uniforms.wallStrength * (margin - pos.x) / margin;
    }
    if (pos.x > uniforms.arenaWidth - margin) {
        totalForce.x -= uniforms.wallStrength * (pos.x - (uniforms.arenaWidth - margin)) / margin;
    }
    if (pos.y < margin) {
        totalForce.y += uniforms.wallStrength * (margin - pos.y) / margin;
    }
    if (pos.y > uniforms.arenaHeight - margin) {
        totalForce.y -= uniforms.wallStrength * (pos.y - (uniforms.arenaHeight - margin)) / margin;
    }
    
    // ============================================
    // State Updates
    // ============================================
    
    // Update state based on crowd density and panic neighbors
    if (state != STATE_PANICKED) {
        // Check for crowding
        if (neighborCount > u32(CROWD_DENSITY_THRESHOLD)) {
            state = STATE_CROWDED;
        } else {
            state = STATE_CALM;
        }
        
        // Panic spreads from nearby panicked agents
        if (panicNeighbors > 0u) {
            let panicProbability = f32(panicNeighbors) / f32(max(neighborCount, 1u));
            let random = hash(idx + u32(uniforms.deltaTime * 1000.0));
            if (random < panicProbability * PANIC_THRESHOLD) {
                state = STATE_PANICKED;
            }
        }
    } else {
        // Panicked agents gradually calm down if no panic neighbors
        if (panicNeighbors == 0u) {
            let calmProbability = 0.01;
            let random = hash(idx + u32(uniforms.deltaTime * 1000.0) + 12345u);
            if (random < calmProbability) {
                state = STATE_CROWDED;
            }
        }
    }
    
    // ============================================
    // Integration
    // ============================================
    
    // Apply forces to velocity
    vel += totalForce * uniforms.deltaTime;
    
    // Limit speed
    let speed = length(vel);
    var maxSpd = uniforms.maxSpeed;
    if (state == STATE_PANICKED) {
        maxSpd *= 1.5;
    }
    if (speed > maxSpd) {
        vel = vel / speed * maxSpd;
    }
    
    // Add slight randomness for more natural movement
    let noise = vec2<f32>(
        hash(idx * 2u) - 0.5,
        hash(idx * 2u + 1u) - 0.5
    ) * 0.1;
    vel += noise;
    
    // Update position
    var newPos = pos + vel * uniforms.deltaTime * 60.0; // Scale for visible movement
    
    // Clamp to arena bounds
    newPos.x = clamp(newPos.x, 0.0, uniforms.arenaWidth);
    newPos.y = clamp(newPos.y, 0.0, uniforms.arenaHeight);
    
    // Write back
    setPosition(idx, newPos);
    setVelocity(idx, vel);
    setState(idx, state);
}
