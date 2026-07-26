#include <metal_stdlib>
using namespace metal;

struct GateReleaseRenderUniforms {
    uint4 dimensionsFrameSeed;
    float4 timeline;
};

float hash21(float2 point, uint seed) {
    float seedOffset = float(seed % 8191u) * 0.000122085;
    point = fract(point * float2(123.34, 456.21) + seedOffset);
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
}

float rectangleMask(float2 point, float2 lower, float2 upper, float feather) {
    float distanceToEdge = min(
        min(point.x - lower.x, upper.x - point.x),
        min(point.y - lower.y, upper.y - point.y)
    );
    return smoothstep(-feather, feather, distanceToEdge);
}

float lineMask(float value, float center, float width) {
    return 1.0 - smoothstep(width, width * 1.8, abs(value - center));
}

float3 composite(float3 base, float3 layer, float opacity) {
    return mix(base, layer, saturate(opacity));
}

kernel void renderGateReleaseFrame(
    texture2d<float, access::write> output [[texture(0)]],
    constant GateReleaseRenderUniforms &uniforms [[buffer(0)]],
    uint2 position [[thread_position_in_grid]]
) {
    uint width = uniforms.dimensionsFrameSeed.x;
    uint height = uniforms.dimensionsFrameSeed.y;
    if (position.x >= width || position.y >= height) {
        return;
    }

    float2 uv = (float2(position) + 0.5) / float2(width, height);
    float time = uniforms.timeline.x;
    float gateProgress = uniforms.timeline.y;
    float releaseProgress = uniforms.timeline.z;
    float proofProgress = uniforms.timeline.w;
    uint seed = uniforms.dimensionsFrameSeed.w;

    const float3 paper = float3(0.953, 0.953, 0.941);
    const float3 panel = float3(1.0);
    const float3 court = float3(0.902, 0.902, 0.878);
    const float3 line = float3(0.843, 0.843, 0.824);
    const float3 lineStrong = float3(0.612, 0.612, 0.588);
    const float3 ink = float3(0.035, 0.035, 0.035);
    const float3 onyx = float3(0.051, 0.051, 0.051);
    const float3 signal = float3(0.0, 0.341, 0.722);
    const float3 cobalt = float3(0.192, 0.361, 1.0);
    const float3 cyan = float3(0.133, 0.827, 0.933);
    const float3 porcelain = float3(0.988, 0.988, 0.978);

    float grain = hash21(float2(position) + float(uniforms.dimensionsFrameSeed.z) * 19.0, seed) - 0.5;
    float3 color = paper + grain * 0.010;

    // Quiet measurement field: paper, court grid, and a single architectural datum.
    float verticalGrid = lineMask(fract(uv.x * 20.0), 0.0, 0.010);
    float horizontalGrid = lineMask(fract(uv.y * 12.0), 0.0, 0.014);
    float grid = max(verticalGrid, horizontalGrid) * 0.33;
    color = composite(color, line, grid);
    color = composite(color, panel, rectangleMask(uv, float2(0.055, 0.205), float2(0.945, 0.805), 0.002));

    // Monumental dry lock architecture.
    float outerChannel = rectangleMask(uv, float2(0.075, 0.315), float2(0.925, 0.715), 0.002);
    color = composite(color, lineStrong, outerChannel);
    float channel = rectangleMask(uv, float2(0.084, 0.329), float2(0.916, 0.701), 0.002);
    color = composite(color, court, channel);

    float upperDatum = lineMask(uv.y, 0.286, 0.0014) * rectangleMask(
        uv,
        float2(0.075, 0.27),
        float2(0.925, 0.30),
        0.001
    );
    color = composite(color, ink, upperDatum * 0.62);

    // The receipt plate exists throughout and becomes the terminal proof surface.
    float receiptShadow = rectangleMask(uv, float2(0.782, 0.574), float2(0.902, 0.676), 0.002);
    color = composite(color, ink, receiptShadow * 0.18);
    float receipt = rectangleMask(uv, float2(0.776, 0.566), float2(0.896, 0.668), 0.002);
    color = composite(color, porcelain, receipt);
    float receiptBorder = receipt * (
        lineMask(uv.x, 0.776, 0.0015)
        + lineMask(uv.x, 0.896, 0.0015)
        + lineMask(uv.y, 0.566, 0.0015)
        + lineMask(uv.y, 0.668, 0.0015)
    );
    color = composite(color, mix(lineStrong, signal, proofProgress), saturate(receiptBorder));
    for (uint row = 0; row < 4; ++row) {
        float y = 0.590 + float(row) * 0.016;
        float rowLine = lineMask(uv.y, y, 0.0012)
            * rectangleMask(uv, float2(0.798, y - 0.004), float2(0.870, y + 0.004), 0.001);
        color = composite(color, mix(lineStrong, signal, proofProgress), rowLine * (0.34 + proofProgress * 0.50));
    }
    float rivet = 1.0 - smoothstep(0.006, 0.008, distance(uv, float2(0.836, 0.578)));
    color = composite(color, onyx, rivet);

    // Water is one continuous cobalt signal. It remains behind the gate until
    // the timeline proves the gate completely clear.
    const float gateX = 0.494;
    const float channelBottom = 0.684;
    float leftSurface = 0.430
        + sin(uv.x * 31.0 + time * 1.35) * 0.0035
        + sin(uv.x * 83.0 - time * 0.72) * 0.0015;
    float leftWater = rectangleMask(
        uv,
        float2(0.096, leftSurface),
        float2(gateX - 0.008, channelBottom),
        0.003
    );

    float frontX = mix(gateX + 0.006, 0.903, releaseProgress);
    float normalizedFlowX = saturate((uv.x - gateX) / max(frontX - gateX, 0.001));
    float rightSurface = 0.500
        + normalizedFlowX * 0.040
        + sin(uv.x * 47.0 - time * 4.2) * 0.006 * releaseProgress
        + sin(uv.x * 101.0 + time * 2.1) * 0.0025 * releaseProgress;
    float rightVertical = smoothstep(rightSurface - 0.004, rightSurface + 0.004, uv.y)
        * (1.0 - smoothstep(channelBottom - 0.003, channelBottom + 0.003, uv.y));
    float rightHorizontal = smoothstep(gateX - 0.004, gateX + 0.004, uv.x)
        * (1.0 - smoothstep(frontX - 0.006, frontX + 0.008, uv.x));
    float rightWater = rightVertical * rightHorizontal * step(0.0001, releaseProgress);
    float waterMask = saturate(leftWater + rightWater);

    float flowBands = 0.5 + 0.5 * sin(uv.x * 92.0 - time * 8.0 + uv.y * 24.0);
    float depth = saturate((uv.y - 0.42) / 0.28);
    float3 water = mix(cyan, signal, depth * 0.72);
    water = mix(water, cobalt, flowBands * 0.10 * waterMask);
    color = composite(color, water, waterMask * 0.88);

    float leftFoam = lineMask(uv.y, leftSurface, 0.0045)
        * rectangleMask(uv, float2(0.096, 0.40), float2(gateX - 0.008, 0.46), 0.002);
    float rightFoam = lineMask(uv.y, rightSurface, 0.0055) * rightHorizontal;
    float frontFoam = lineMask(uv.x, frontX, 0.0055)
        * smoothstep(rightSurface - 0.010, rightSurface + 0.010, uv.y)
        * (1.0 - smoothstep(channelBottom - 0.018, channelBottom, uv.y));
    color = composite(color, porcelain, saturate(leftFoam * 0.60 + rightFoam * 0.62 + frontFoam * 0.82));

    // Proof is an inspectable trace, not a caption or a new moving object.
    float proofTrace = lineMask(uv.y, 0.548, 0.002)
        * rectangleMask(uv, float2(0.705, 0.542), float2(mix(0.705, 0.836, proofProgress), 0.554), 0.001);
    color = composite(color, signal, proofTrace * proofProgress);

    // One solid onyx gate retracts upward. It is drawn after water so the
    // closed state visibly occludes and contains the signal.
    float gateBottom = mix(0.716, 0.300, gateProgress);
    float gatePlate = rectangleMask(
        uv,
        float2(gateX - 0.014, 0.160),
        float2(gateX + 0.014, gateBottom),
        0.0015
    );
    color = composite(color, onyx, gatePlate);
    float gateHighlight = lineMask(uv.x, gateX - 0.010, 0.0012)
        * rectangleMask(uv, float2(gateX - 0.014, 0.16), float2(gateX + 0.014, gateBottom), 0.001);
    color = composite(color, lineStrong, gateHighlight * 0.45);
    float gateHousing = rectangleMask(uv, float2(gateX - 0.052, 0.142), float2(gateX + 0.052, 0.310), 0.002);
    color = composite(color, ink, gateHousing);
    float housingFace = rectangleMask(uv, float2(gateX - 0.044, 0.151), float2(gateX + 0.044, 0.292), 0.002);
    color = composite(color, onyx, housingFace);
    float statusLine = rectangleMask(
        uv,
        float2(gateX - 0.030, 0.172),
        float2(mix(gateX - 0.030, gateX + 0.030, gateProgress), 0.179),
        0.001
    );
    color = composite(color, signal, statusLine);

    // Architectural edge vignette and restrained temporal film grain.
    float vignette = 1.0 - smoothstep(0.30, 0.86, distance(uv, float2(0.5)));
    color *= 0.965 + vignette * 0.035;
    color += grain * 0.004;
    color = saturate(color);

    output.write(float4(color, 1.0), position);
}
