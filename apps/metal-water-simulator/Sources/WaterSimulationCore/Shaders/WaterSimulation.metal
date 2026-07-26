#include <metal_stdlib>
using namespace metal;

constant float pi = 3.14159265358979323846;

struct Particle {
    float4 positionVelocity;
    float4 densityPressure;
};

struct SimulationUniforms {
    float4 countTimeRadiusDensity;
    float4 pressureViscosityMassParticleRadius;
    float4 gravityDamping;
    float4 bounds;
    float4 gridShape;
    float4 stability;
    float4 governedGate;
};

uint2 spatialGridCell(float2 position, constant SimulationUniforms &uniforms) {
    float2 span = max(uniforms.bounds.zw - uniforms.bounds.xy, float2(0.0001));
    float2 normalized = clamp(
        (position - uniforms.bounds.xy) / span,
        float2(0.0),
        float2(0.999999)
    );
    return uint2(normalized * uniforms.gridShape.xy);
}

uint spatialGridIndex(uint2 cell, constant SimulationUniforms &uniforms) {
    return cell.y * uint(uniforms.gridShape.x) + cell.x;
}

kernel void clearSpatialGrid(
    device atomic_uint *gridCounts [[buffer(0)]],
    device atomic_uint *overflowCount [[buffer(1)]],
    constant SimulationUniforms &uniforms [[buffer(2)]],
    uint id [[thread_position_in_grid]]
) {
    uint cellCount = uint(uniforms.gridShape.x * uniforms.gridShape.y);
    if (id >= cellCount) {
        return;
    }
    atomic_store_explicit(&gridCounts[id], 0, memory_order_relaxed);
    if (id == 0) {
        atomic_store_explicit(overflowCount, 0, memory_order_relaxed);
    }
}

kernel void populateSpatialGrid(
    device const Particle *particles [[buffer(0)]],
    device atomic_uint *gridCounts [[buffer(1)]],
    device uint *gridParticleIndices [[buffer(2)]],
    device atomic_uint *overflowCount [[buffer(3)]],
    constant SimulationUniforms &uniforms [[buffer(4)]],
    uint id [[thread_position_in_grid]]
) {
    uint particleCount = uint(uniforms.countTimeRadiusDensity.x);
    if (id >= particleCount) {
        return;
    }

    uint2 cell = spatialGridCell(particles[id].positionVelocity.xy, uniforms);
    uint cellIndex = spatialGridIndex(cell, uniforms);
    uint slot = atomic_fetch_add_explicit(
        &gridCounts[cellIndex],
        1,
        memory_order_relaxed
    );
    uint bucketCapacity = uint(uniforms.gridShape.z);
    if (slot < bucketCapacity) {
        gridParticleIndices[cellIndex * bucketCapacity + slot] = id;
    } else {
        atomic_fetch_add_explicit(overflowCount, 1, memory_order_relaxed);
    }
}

struct ImpulseUniforms {
    float4 centerRadius;
    float4 directionStrength;
};

float densityKernel(float squaredDistance, float radius) {
    float radiusSquared = radius * radius;
    if (squaredDistance >= radiusSquared) {
        return 0.0;
    }
    float term = radiusSquared - squaredDistance;
    return (4.0 / (pi * pow(radius, 8.0))) * term * term * term;
}

float2 pressureGradient(float2 offset, float distance, float radius) {
    if (distance <= 0.00001 || distance >= radius) {
        return float2(0.0);
    }
    float coefficient = -30.0 / (pi * pow(radius, 5.0));
    return coefficient * pow(radius - distance, 2.0) * (offset / distance);
}

float viscosityLaplacian(float distance, float radius) {
    if (distance >= radius) {
        return 0.0;
    }
    return (20.0 / (3.0 * pi * pow(radius, 5.0))) * (radius - distance);
}

kernel void calculateDensityPressure(
    device const Particle *particles [[buffer(0)]],
    device Particle *output [[buffer(1)]],
    device atomic_uint *gridCounts [[buffer(2)]],
    device const uint *gridParticleIndices [[buffer(3)]],
    constant SimulationUniforms &uniforms [[buffer(4)]],
    uint id [[thread_position_in_grid]]
) {
    uint count = uint(uniforms.countTimeRadiusDensity.x);
    if (id >= count) {
        return;
    }

    float2 position = particles[id].positionVelocity.xy;
    float radius = uniforms.countTimeRadiusDensity.z;
    float restDensity = uniforms.countTimeRadiusDensity.w;
    float mass = uniforms.pressureViscosityMassParticleRadius.z;
    float density = 0.0;
    uint2 centerCell = spatialGridCell(position, uniforms);
    int columns = int(uniforms.gridShape.x);
    int rows = int(uniforms.gridShape.y);
    uint bucketCapacity = uint(uniforms.gridShape.z);
    float2 gridCellSize = (uniforms.bounds.zw - uniforms.bounds.xy)
        / uniforms.gridShape.xy;
    int2 reach = int2(ceil(radius / max(gridCellSize, float2(0.0001))));

    for (int y = max(int(centerCell.y) - reach.y, 0);
         y <= min(int(centerCell.y) + reach.y, rows - 1);
         ++y) {
        for (int x = max(int(centerCell.x) - reach.x, 0);
             x <= min(int(centerCell.x) + reach.x, columns - 1);
             ++x) {
            uint cellIndex = uint(y * columns + x);
            uint cellCount = min(
                atomic_load_explicit(&gridCounts[cellIndex], memory_order_relaxed),
                bucketCapacity
            );
            for (uint slot = 0; slot < cellCount; ++slot) {
                uint other = gridParticleIndices[cellIndex * bucketCapacity + slot];
                float2 offset = position - particles[other].positionVelocity.xy;
                density += mass * densityKernel(dot(offset, offset), radius);
            }
        }
    }

    float pressureStiffness = uniforms.pressureViscosityMassParticleRadius.x;
    float minimumPressure = -restDensity * pressureStiffness * uniforms.gridShape.w;
    float pressure = max(
        pressureStiffness * (density - restDensity),
        minimumPressure
    );
    output[id] = particles[id];
    output[id].densityPressure = float4(max(density, 0.0001), pressure, 0.0, 0.0);
}

kernel void integrateSPH(
    device const Particle *particles [[buffer(0)]],
    device Particle *output [[buffer(1)]],
    device atomic_uint *gridCounts [[buffer(2)]],
    device const uint *gridParticleIndices [[buffer(3)]],
    constant SimulationUniforms &uniforms [[buffer(4)]],
    uint id [[thread_position_in_grid]]
) {
    uint count = uint(uniforms.countTimeRadiusDensity.x);
    if (id >= count) {
        return;
    }

    Particle particle = particles[id];
    float2 position = particle.positionVelocity.xy;
    float2 velocity = particle.positionVelocity.zw;
    float density = particle.densityPressure.x;
    float pressure = particle.densityPressure.y;
    float radius = uniforms.countTimeRadiusDensity.z;
    float mass = uniforms.pressureViscosityMassParticleRadius.z;
    float viscosity = uniforms.pressureViscosityMassParticleRadius.y;
    float2 pressureForce = float2(0.0);
    float2 viscosityAcceleration = float2(0.0);
    uint2 centerCell = spatialGridCell(position, uniforms);
    int columns = int(uniforms.gridShape.x);
    int rows = int(uniforms.gridShape.y);
    uint bucketCapacity = uint(uniforms.gridShape.z);
    float2 gridCellSize = (uniforms.bounds.zw - uniforms.bounds.xy)
        / uniforms.gridShape.xy;
    int2 reach = int2(ceil(radius / max(gridCellSize, float2(0.0001))));

    for (int y = max(int(centerCell.y) - reach.y, 0);
         y <= min(int(centerCell.y) + reach.y, rows - 1);
         ++y) {
        for (int x = max(int(centerCell.x) - reach.x, 0);
             x <= min(int(centerCell.x) + reach.x, columns - 1);
             ++x) {
            uint cellIndex = uint(y * columns + x);
            uint cellCount = min(
                atomic_load_explicit(&gridCounts[cellIndex], memory_order_relaxed),
                bucketCapacity
            );
            for (uint slot = 0; slot < cellCount; ++slot) {
                uint other = gridParticleIndices[cellIndex * bucketCapacity + slot];
                if (other == id) {
                    continue;
                }
                Particle neighbor = particles[other];
                float2 offset = position - neighbor.positionVelocity.xy;
                float distance = length(offset);
                if (distance >= radius || distance <= 0.00001) {
                    continue;
                }

                float neighborDensity = max(neighbor.densityPressure.x, 0.0001);
                float sharedPressure = (pressure + neighbor.densityPressure.y) * 0.5;
                pressureForce -= mass * sharedPressure / neighborDensity
                    * pressureGradient(offset, distance, radius);
                viscosityAcceleration += viscosity * mass
                    * (neighbor.positionVelocity.zw - velocity) / neighborDensity
                    * viscosityLaplacian(distance, radius);
            }
        }
    }

    float2 acceleration = uniforms.gravityDamping.xy
        + pressureForce / max(density, 0.0001)
        + viscosityAcceleration;
    float deltaTime = uniforms.countTimeRadiusDensity.y;
    velocity += acceleration * deltaTime;
    velocity *= exp(-uniforms.gravityDamping.w * deltaTime);
    float maximumSpeed = uniforms.stability.x;
    float speed = length(velocity);
    if (maximumSpeed > 0.0 && speed > maximumSpeed) {
        velocity *= maximumSpeed / speed;
    }
    float2 previousPosition = position;
    position += velocity * deltaTime;

    float particleRadius = uniforms.pressureViscosityMassParticleRadius.w;
    float2 lower = uniforms.bounds.xy + particleRadius;
    float2 upper = uniforms.bounds.zw - particleRadius;
    float damping = uniforms.gravityDamping.z;

    float gateY = uniforms.governedGate.x;
    float gateHalfWidth = uniforms.governedGate.z;
    bool gateEnabled = gateHalfWidth > 0.0;
    bool gateOpen = uniforms.governedGate.w > 0.5;
    bool blockedAtX = !gateOpen;
    bool crossedDown = previousPosition.y >= gateY && position.y < gateY;
    bool crossedUp = previousPosition.y <= gateY && position.y > gateY;
    if (gateEnabled && blockedAtX && crossedDown) {
        position.y = gateY + particleRadius;
        velocity.y = abs(velocity.y) * damping;
    } else if (gateEnabled && blockedAtX && crossedUp) {
        position.y = gateY - particleRadius;
        velocity.y = -abs(velocity.y) * damping;
    }

    if (position.x < lower.x) {
        position.x = lower.x;
        velocity.x = abs(velocity.x) * damping;
    } else if (position.x > upper.x) {
        position.x = upper.x;
        velocity.x = -abs(velocity.x) * damping;
    }
    if (position.y < lower.y) {
        position.y = lower.y;
        velocity.y = abs(velocity.y) * damping;
    } else if (position.y > upper.y) {
        position.y = upper.y;
        velocity.y = -abs(velocity.y) * damping;
    }

    output[id].positionVelocity = float4(position, velocity);
    output[id].densityPressure = particle.densityPressure;
}

kernel void applyRadialImpulse(
    device Particle *particles [[buffer(0)]],
    constant ImpulseUniforms &uniforms [[buffer(1)]],
    uint id [[thread_position_in_grid]]
) {
    float2 position = particles[id].positionVelocity.xy;
    float2 offset = position - uniforms.centerRadius.xy;
    float distance = length(offset);
    float radius = uniforms.centerRadius.z;
    if (distance >= radius) {
        return;
    }

    float falloff = 1.0 - distance / radius;
    float2 radial = distance > 0.0001 ? offset / distance : float2(0.0, 1.0);
    float2 direction = normalize(uniforms.directionStrength.xy + radial * 0.65);
    particles[id].positionVelocity.zw += direction
        * uniforms.directionStrength.z * falloff * falloff;
}
