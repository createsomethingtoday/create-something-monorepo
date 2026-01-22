/**
 * Crowd Simulation Compute Shader
 *
 * Implements social force model for crowd dynamics:
 * - Goal attraction: agents move toward their targets
 * - Separation: agents avoid colliding with each other
 * - Wall avoidance: agents stay away from walls/obstacles
 * - Panic spreading: panicked agents influence nearby calm agents
 * - Group cohesion: fans attending together stay near each other
 *
 * Uses spatial hash grid for O(1) neighbor queries instead of O(n²).
 * Grid divides arena into cells, agents only check neighboring cells.
 */

// Agent data structure (8 floats per agent)
// [0-1]: position (x, y)
// [2-3]: velocity (vx, vy)
// [4-5]: target (tx, ty)
// [6]: state (0=calm, 1=crowded, 2=panicked)
// [7]: encoded group_id:
//      bits 0-1: role (0=fan, 1=player, 2=staff)
//      bits 2-3: teamId (0=home, 1=away, 2=neutral)
//      bits 4-7: directive type (0-15)
//      bits 8-15: groupId for cohesion (0=solo, 1-255=group)

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
    // Ellipse parameters for arena boundary
    arenaCenterX: f32,
    arenaCenterY: f32,
    arenaRx: f32,
    arenaRy: f32,
    // Canvas dimensions (for render shader)
    canvasWidth: f32,
    canvasHeight: f32,
    // Determinism parameters
    seed: f32,
    frameCount: f32,
    // Spatial hash grid parameters
    gridSizeX: f32,
    gridSizeY: f32,
}

struct Wall {
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
}

// Cell bounds: [start, end) indices into sorted agent list
struct CellBounds {
    start: u32,
    end: u32,
}

@group(0) @binding(0) var<storage, read_write> agents: array<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read> walls: array<Wall>;
@group(0) @binding(3) var<storage, read> cellBounds: array<CellBounds>;
@group(0) @binding(4) var<storage, read> sortedAgentIndices: array<u32>;

// Spatial hash grid constants
const GRID_COLS: u32 = 32u;  // 800 / 32 = 25 pixels per cell
const GRID_ROWS: u32 = 24u;  // 600 / 24 = 25 pixels per cell
const CELL_SIZE: f32 = 25.0;
const TOTAL_CELLS: u32 = 768u;  // 32 * 24

// Constants
const AGENT_RADIUS: f32 = 4.0;
const PERCEPTION_RADIUS: f32 = 50.0;
const PANIC_THRESHOLD: f32 = 0.7;
const CROWD_DENSITY_THRESHOLD: f32 = 5.0;
const STATE_CALM: u32 = 0u;
const STATE_CROWDED: u32 = 1u;
const STATE_PANICKED: u32 = 2u;

// Group cohesion constants
const GROUP_COHESION_RADIUS: f32 = 80.0;   // Max distance to consider group members
const GROUP_COHESION_STRENGTH: f32 = 1.5;  // Strength of cohesion force
const GROUP_IDEAL_DISTANCE: f32 = 12.0;    // Ideal distance between group members

// Role constants (encoded in group_id bits 0-1)
const ROLE_FAN: u32 = 0u;
const ROLE_PLAYER: u32 = 1u;
const ROLE_STAFF: u32 = 2u;

// Court boundaries (only players/staff allowed)
// Visual court is 300-500 x 220-380, exclusion zone is larger
const COURT_MIN_X: f32 = 280.0;
const COURT_MAX_X: f32 = 520.0;
const COURT_MIN_Y: f32 = 200.0;
const COURT_MAX_Y: f32 = 400.0;
const COURT_MARGIN: f32 = 5.0; // Minimal buffer for smooth deflection

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

// Get agent role from encoded group_id (bits 0-1)
fn getRole(idx: u32) -> u32 {
    let base = idx * 8u;
    return u32(agents[base + 7u]) & 0x3u;
}

// Get agent groupId from encoded group_id (bits 8-15)
// 0 = no group (solo), 1-255 = group identifier for cohesion
fn getGroupId(idx: u32) -> u32 {
    let base = idx * 8u;
    return (u32(agents[base + 7u]) >> 8u) & 0xffu;
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
// When seed != 0, uses seed ^ frameCount for deterministic, reproducible randomness
fn hash(n: u32) -> f32 {
    var x = n;
    let seed = u32(uniforms.seed);
    if (seed != 0u) {
        // Deterministic mode: combine seed and frameCount for reproducible randomness
        let frameCount = u32(uniforms.frameCount);
        x = x ^ (seed ^ frameCount);
    }
    x = ((x >> 16u) ^ x) * 0x45d9f3bu;
    x = ((x >> 16u) ^ x) * 0x45d9f3bu;
    x = (x >> 16u) ^ x;
    return f32(x) / f32(0xffffffffu);
}

// Spatial hash grid: compute cell index from position
fn getCellIndex(pos: vec2<f32>) -> u32 {
    let cellX = clamp(u32(pos.x / CELL_SIZE), 0u, GRID_COLS - 1u);
    let cellY = clamp(u32(pos.y / CELL_SIZE), 0u, GRID_ROWS - 1u);
    return cellY * GRID_COLS + cellX;
}

// Get cell coordinates from position
fn getCellCoords(pos: vec2<f32>) -> vec2<u32> {
    return vec2<u32>(
        clamp(u32(pos.x / CELL_SIZE), 0u, GRID_COLS - 1u),
        clamp(u32(pos.y / CELL_SIZE), 0u, GRID_ROWS - 1u)
    );
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
    let goalPos = getTarget(idx);
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
    
    // Group cohesion tracking
    let myGroupId = getGroupId(idx);
    var groupCenterOfMass = vec2<f32>(0.0, 0.0);
    var groupMemberCount = 0u;
    
    // 1. Goal force - move toward target
    let toTarget = goalPos - pos;
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
    // Use spatial hash grid for O(1) neighbor queries instead of O(n²)
    let cellCoords = getCellCoords(pos);
    let cellX = i32(cellCoords.x);
    let cellY = i32(cellCoords.y);
    
    // Check 3x3 neighborhood of cells (9 cells max)
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            let nx = cellX + dx;
            let ny = cellY + dy;
            
            // Bounds check for grid
            if (nx >= 0 && nx < i32(GRID_COLS) && ny >= 0 && ny < i32(GRID_ROWS)) {
                let neighborCellIdx = u32(ny) * GRID_COLS + u32(nx);
                let bounds = cellBounds[neighborCellIdx];
                
                // Iterate over agents in this cell
                for (var sortedIdx = bounds.start; sortedIdx < bounds.end; sortedIdx++) {
                    let i = sortedAgentIndices[sortedIdx];
                    
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
                        neighborCount = neighborCount + 1u;
                        
                        // Count panicked neighbors
                        let otherState = getState(i);
                        if (otherState == STATE_PANICKED) {
                            panicNeighbors = panicNeighbors + 1u;
                        }
                        
                        // Track group members for cohesion (only if we're in a group)
                        if (myGroupId > 0u && dist < GROUP_COHESION_RADIUS) {
                            let otherGroupId = getGroupId(i);
                            if (otherGroupId == myGroupId) {
                                groupCenterOfMass += otherPos;
                                groupMemberCount = groupMemberCount + 1u;
                            }
                        }
                        
                        // Separation force (stronger when closer)
                        if (dist < AGENT_RADIUS * 4.0) {
                            let separationDir = -toOther / dist;
                            let separationMag = uniforms.separationStrength * (1.0 - dist / (AGENT_RADIUS * 4.0));
                            totalForce += separationDir * separationMag;
                        }
                    }
                }
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
    
    // 3.5 Group cohesion force (fans attending together stay near each other)
    if (myGroupId > 0u && groupMemberCount > 0u) {
        // Calculate center of mass of visible group members
        groupCenterOfMass = groupCenterOfMass / f32(groupMemberCount);
        
        let toGroupCenter = groupCenterOfMass - pos;
        let distToCenter = length(toGroupCenter);
        
        // Only apply cohesion if we're farther than ideal distance from group
        if (distToCenter > GROUP_IDEAL_DISTANCE) {
            let cohesionDir = toGroupCenter / distToCenter;
            // Cohesion strength increases with distance from group center
            // but is softer than separation to allow natural movement
            let cohesionMag = GROUP_COHESION_STRENGTH * 
                min((distToCenter - GROUP_IDEAL_DISTANCE) / GROUP_COHESION_RADIUS, 1.0);
            totalForce += cohesionDir * cohesionMag;
        }
    }
    
    // 4. Court exclusion zone (only players/staff allowed on court)
    let role = getRole(idx);
    if (role == ROLE_FAN) {
        // Court center and dimensions
        let courtCenterX = (COURT_MIN_X + COURT_MAX_X) * 0.5;
        let courtCenterY = (COURT_MIN_Y + COURT_MAX_Y) * 0.5;
        let courtHalfW = (COURT_MAX_X - COURT_MIN_X) * 0.5;
        let courtHalfH = (COURT_MAX_Y - COURT_MIN_Y) * 0.5;
        
        // Calculate signed distance to court rectangle (negative = inside)
        let dxCourt = abs(pos.x - courtCenterX) - courtHalfW;
        let dyCourt = abs(pos.y - courtCenterY) - courtHalfH;
        
        // Distance to court edge (negative if inside, positive if outside)
        let distToCourtEdge = max(dxCourt, dyCourt);
        
        // Only apply force if within the margin zone (approaching or inside court)
        if (distToCourtEdge < COURT_MARGIN) {
            // Push direction - away from court center
            var pushDir = vec2<f32>(0.0, 0.0);
            
            // Determine push direction based on which edge is closest
            if (dxCourt > dyCourt) {
                // Closer to left/right edge
                pushDir.x = sign(pos.x - courtCenterX);
            } else {
                // Closer to top/bottom edge
                pushDir.y = sign(pos.y - courtCenterY);
            }
            
            // Normalize if both components are set
            let pushLen = length(pushDir);
            if (pushLen > 0.0) {
                pushDir = pushDir / pushLen;
            }
            
            // Force strength: smooth falloff from court edge to margin edge
            // Maximum at court edge (distToCourtEdge <= 0), zero at margin edge
            let normalizedDist = clamp(distToCourtEdge / COURT_MARGIN, -1.0, 1.0);
            let forceMagnitude = uniforms.wallStrength * 4.0 * (1.0 - normalizedDist);
            
            // Apply force (stronger when deeper inside court)
            totalForce += pushDir * forceMagnitude;
        }
    }
    
    // 5. Elliptical arena boundary force with gate openings
    let centerX = uniforms.arenaCenterX;
    let centerY = uniforms.arenaCenterY;
    let rx = uniforms.arenaRx;
    let ry = uniforms.arenaRy;
    
    // Gate definitions (angular positions and widths in radians)
    // Gates are wider to allow natural flow
    let gateWidth = 0.25; // Angular width of gates in radians (~15 degrees)
    
    // Calculate angle from center to agent
    let agentAngle = atan2(pos.y - centerY, pos.x - centerX);
    
    // Check if agent is near a gate (allow passage through boundary)
    let nearNorthGate = abs(agentAngle - (-1.5708)) < gateWidth; // -PI/2 (top)
    let nearSouthGate = abs(agentAngle - 1.5708) < gateWidth;     // PI/2 (bottom)
    let nearEastGate = abs(agentAngle) < gateWidth;               // 0 (right)
    let nearWestGate = abs(abs(agentAngle) - 3.1416) < gateWidth; // PI (left)
    let nearGate = nearNorthGate || nearSouthGate || nearEastGate || nearWestGate;
    
    // Normalized distance from center (1.0 = on ellipse edge)
    let dx = (pos.x - centerX) / rx;
    let dy = (pos.y - centerY) / ry;
    let ellipseDist = sqrt(dx * dx + dy * dy);
    
    // Apply boundary force when approaching edge (but not near gates)
    let boundaryThreshold = 0.92;
    if (ellipseDist > boundaryThreshold && !nearGate) {
        // Direction toward center
        let toCenter = vec2<f32>(centerX - pos.x, centerY - pos.y);
        let toCenterLen = length(toCenter);
        if (toCenterLen > 0.001) {
            let pushDir = toCenter / toCenterLen;
            // Smooth force that increases near edge
            let penetration = (ellipseDist - boundaryThreshold) / (1.0 - boundaryThreshold);
            let boundaryForce = uniforms.wallStrength * 2.0 * penetration;
            totalForce += pushDir * boundaryForce;
        }
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
    
    // Check if new position is near a gate
    let newAngle = atan2(newPos.y - centerY, newPos.x - centerX);
    let newNearNorthGate = abs(newAngle - (-1.5708)) < gateWidth * 1.2;
    let newNearSouthGate = abs(newAngle - 1.5708) < gateWidth * 1.2;
    let newNearEastGate = abs(newAngle) < gateWidth * 1.2;
    let newNearWestGate = abs(abs(newAngle) - 3.1416) < gateWidth * 1.2;
    let newNearGate = newNearNorthGate || newNearSouthGate || newNearEastGate || newNearWestGate;
    
    // Clamp to elliptical arena bounds
    let newDx = (newPos.x - centerX) / rx;
    let newDy = (newPos.y - centerY) / ry;
    let newEllipseDist = sqrt(newDx * newDx + newDy * newDy);
    
    // Allow agents through gates, otherwise keep inside ellipse
    if (!newNearGate && newEllipseDist > 0.98) {
        // Project back onto ellipse edge
        let angle = atan2(newPos.y - centerY, newPos.x - centerX);
        newPos.x = centerX + cos(angle) * rx * 0.97;
        newPos.y = centerY + sin(angle) * ry * 0.97;
        vel = vel * 0.7; // Dampen on collision
    }
    
    // Keep within overall canvas bounds
    newPos.x = clamp(newPos.x, 5.0, uniforms.arenaWidth - 5.0);
    newPos.y = clamp(newPos.y, 5.0, uniforms.arenaHeight - 5.0);
    
    // Hard clamp: Fans absolutely cannot be on or near the court
    if (role == ROLE_FAN) {
        // Use tighter bounds for the hard clamp (the actual court area)
        let courtCenterX = 400.0;
        let courtCenterY = 300.0;
        let courtHalfW = 115.0; // Slightly larger than visual court
        let courtHalfH = 95.0;
        
        let onCourtX = newPos.x > (courtCenterX - courtHalfW) && newPos.x < (courtCenterX + courtHalfW);
        let onCourtY = newPos.y > (courtCenterY - courtHalfH) && newPos.y < (courtCenterY + courtHalfH);
        
        if (onCourtX && onCourtY) {
            // Project to nearest edge with buffer
            let distLeft = newPos.x - (courtCenterX - courtHalfW);
            let distRight = (courtCenterX + courtHalfW) - newPos.x;
            let distTop = newPos.y - (courtCenterY - courtHalfH);
            let distBottom = (courtCenterY + courtHalfH) - newPos.y;
            
            let minDistH = min(distLeft, distRight);
            let minDistV = min(distTop, distBottom);
            
            if (minDistH < minDistV) {
                // Push horizontally
                if (distLeft < distRight) {
                    newPos.x = courtCenterX - courtHalfW - 15.0;
                } else {
                    newPos.x = courtCenterX + courtHalfW + 15.0;
                }
            } else {
                // Push vertically
                if (distTop < distBottom) {
                    newPos.y = courtCenterY - courtHalfH - 15.0;
                } else {
                    newPos.y = courtCenterY + courtHalfH + 15.0;
                }
            }
            
            // Zero out velocity toward court
            vel = vec2<f32>(0.0, 0.0);
        }
    }
    
    // Write back
    setPosition(idx, newPos);
    setVelocity(idx, vel);
    setState(idx, state);
}
