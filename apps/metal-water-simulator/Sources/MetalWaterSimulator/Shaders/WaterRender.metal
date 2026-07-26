#include <metal_stdlib>
using namespace metal;

struct Particle {
    float4 positionVelocity;
    float4 densityPressure;
};

struct ViewUniforms {
    float4 viewportAspectPointSize;
    float4 timeParticleRadiusTexelX;
    float4 deepWater;
    float4 surfaceWater;
    float4 highlightWater;
    float4 turbulentWater;
    float4 backgroundPaper;
    float4 backgroundCourt;
    float4 backgroundGrid;
    float4 pressureAccent;
};

struct ThicknessVertexOutput {
    float4 position [[position]];
    float pointSize [[point_size]];
    float speed;
    float pressure;
};

vertex ThicknessVertexOutput waterThicknessVertex(
    uint id [[vertex_id]],
    device const Particle *particles [[buffer(0)]],
    constant ViewUniforms &uniforms [[buffer(1)]]
) {
    Particle particle = particles[id];
    float aspect = max(uniforms.viewportAspectPointSize.z, 0.001);
    ThicknessVertexOutput output;
    output.position = float4(
        particle.positionVelocity.x / aspect,
        particle.positionVelocity.y,
        0.0,
        1.0
    );
    output.pointSize = max(
        3.0,
        uniforms.timeParticleRadiusTexelX.y
            * uniforms.viewportAspectPointSize.y
            * uniforms.viewportAspectPointSize.w
    );
    output.speed = length(particle.positionVelocity.zw);
    output.pressure = particle.densityPressure.y;
    return output;
}

fragment float4 waterThicknessFragment(
    ThicknessVertexOutput input [[stage_in]],
    float2 pointCoordinate [[point_coord]]
) {
    float2 disk = pointCoordinate * 2.0 - 1.0;
    float radiusSquared = dot(disk, disk);
    if (radiusSquared > 1.0) {
        discard_fragment();
    }

    float radialWeight = pow(max(1.0 - radiusSquared, 0.0), 1.5);
    float foamSeed = smoothstep(1.1, 3.6, input.speed);
    return float4(
        radialWeight * 0.19,
        radialWeight * foamSeed * 0.018,
        radialWeight * min(input.speed, 8.0) * 0.018,
        radialWeight * 0.12
    );
}

kernel void blurWaterField(
    texture2d<float, access::read> source [[texture(0)]],
    texture2d<float, access::write> destination [[texture(1)]],
    constant uint2 &direction [[buffer(0)]],
    uint2 position [[thread_position_in_grid]]
) {
    if (position.x >= destination.get_width() || position.y >= destination.get_height()) {
        return;
    }

    constexpr float weights[7] = {
        0.1995,
        0.1760,
        0.1210,
        0.0648,
        0.0270,
        0.0088,
        0.0022
    };
    int2 center = int2(position);
    int2 axis = int2(direction);
    int2 upper = int2(int(source.get_width()) - 1, int(source.get_height()) - 1);
    float4 result = source.read(position) * weights[0];
    for (int offset = 1; offset < 7; ++offset) {
        int2 lowSample = clamp(center - axis * offset, int2(0), upper);
        int2 highSample = clamp(center + axis * offset, int2(0), upper);
        result += source.read(uint2(lowSample)) * weights[offset];
        result += source.read(uint2(highSample)) * weights[offset];
    }
    destination.write(result, position);
}

struct CompositeVertexOutput {
    float4 position [[position]];
    float2 uv;
};

vertex CompositeVertexOutput waterCompositeVertex(uint id [[vertex_id]]) {
    constexpr float2 positions[3] = {
        float2(-1.0, -1.0),
        float2(3.0, -1.0),
        float2(-1.0, 3.0)
    };
    CompositeVertexOutput output;
    output.position = float4(positions[id], 0.0, 1.0);
    output.uv = positions[id] * float2(0.5, -0.5) + 0.5;
    return output;
}

float3 performanceBackground(float2 uv, constant ViewUniforms &uniforms) {
    float2 fineCell = abs(fract(uv * float2(28.0, 21.0)) - 0.5);
    float2 majorCell = abs(fract(uv * float2(4.0, 3.0)) - 0.5);
    float fineGrid = smoothstep(0.470, 0.495, max(fineCell.x, fineCell.y));
    float majorGrid = smoothstep(0.465, 0.495, max(majorCell.x, majorCell.y));
    float vignette = 1.0 - smoothstep(0.35, 0.82, distance(uv, float2(0.5)));
    float3 base = mix(
        uniforms.backgroundCourt.rgb,
        uniforms.backgroundPaper.rgb,
        0.72 + vignette * 0.20
    );
    float gridOpacity = uniforms.backgroundGrid.a * saturate(fineGrid + majorGrid * 1.35);
    return mix(base, uniforms.backgroundGrid.rgb, gridOpacity);
}

fragment float4 waterCompositeFragment(
    CompositeVertexOutput input [[stage_in]],
    texture2d<float, access::sample> waterField [[texture(0)]],
    constant ViewUniforms &uniforms [[buffer(0)]]
) {
    constexpr sampler fieldSampler(filter::linear, address::clamp_to_edge);
    float2 texel = uniforms.timeParticleRadiusTexelX.zw;
    float4 field = waterField.sample(fieldSampler, input.uv);
    float left = waterField.sample(fieldSampler, input.uv - float2(texel.x * 3.0, 0.0)).r;
    float right = waterField.sample(fieldSampler, input.uv + float2(texel.x * 3.0, 0.0)).r;
    float down = waterField.sample(fieldSampler, input.uv - float2(0.0, texel.y * 3.0)).r;
    float up = waterField.sample(fieldSampler, input.uv + float2(0.0, texel.y * 3.0)).r;
    float2 gradient = float2(right - left, up - down);
    float time = uniforms.timeParticleRadiusTexelX.x;
    float2 microRipple = float2(
        sin(input.uv.y * 61.0 + time * 0.72),
        cos(input.uv.x * 47.0 - time * 0.58)
    ) * 0.0018;
    float3 normal = normalize(float3(-(gradient + microRipple) * 2.4, 0.22));

    float coverage = smoothstep(0.008, 0.050, field.r);
    float edge = smoothstep(0.006, 0.042, length(gradient));
    float2 refractedUV = input.uv + normal.xy * (0.007 + min(field.r, 1.0) * 0.008);
    float3 background = performanceBackground(refractedUV, uniforms);

    float thickness = saturate(field.r * 0.48);
    float verticalDepth = saturate(input.uv.y * 1.25);
    float3 water = mix(
        uniforms.surfaceWater.rgb,
        uniforms.deepWater.rgb * 0.48,
        thickness * 0.72 + verticalDepth * 0.22
    );
    float3 lightDirection = normalize(float3(-0.36, -0.48, 0.8));
    float diffuse = saturate(dot(normal, lightDirection));
    float fresnel = pow(1.0 - saturate(normal.z), 3.2);
    float specular = pow(saturate(dot(reflect(-lightDirection, normal), float3(0, 0, 1))), 52.0);
    water += uniforms.turbulentWater.rgb * (diffuse * 0.16 + edge * 0.12);
    water += uniforms.surfaceWater.rgb * fresnel * 0.44;
    water += uniforms.highlightWater.rgb * specular * 0.38;
    float surfaceVariation = (
        sin(input.uv.x * 37.0 + time * 0.43)
            * cos(input.uv.y * 29.0 - time * 0.31)
            * 0.5 + 0.5
    );
    water += uniforms.highlightWater.rgb * surfaceVariation * 0.028;

    float foam = smoothstep(0.006, 0.032, field.g + edge * field.b * 0.06) * coverage;
    water = mix(water, uniforms.highlightWater.rgb, foam * 0.88);
    float pressureTrace = smoothstep(0.018, 0.095, field.b) * edge * coverage;
    water = mix(water, uniforms.pressureAccent.rgb, pressureTrace * 0.16);
    float3 color = mix(background, water, coverage * 0.92);
    color += uniforms.turbulentWater.rgb * edge * coverage * 0.08;
    return float4(color, 1.0);
}
