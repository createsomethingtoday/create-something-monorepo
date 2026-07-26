// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "MetalWaterSimulator",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "WaterSimulationCore", targets: ["WaterSimulationCore"]),
        .executable(name: "MetalWaterSimulator", targets: ["MetalWaterSimulator"]),
        .executable(name: "MetalWaterProofVerifier", targets: ["MetalWaterProofVerifier"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-testing.git", from: "0.6.0"),
    ],
    targets: [
        .target(
            name: "WaterSimulationCore",
            resources: [
                .process("Shaders"),
                .copy("WorkflowArtifacts"),
                .copy("SimulatorArtifacts"),
            ]
        ),
        .executableTarget(
            name: "MetalWaterSimulator",
            dependencies: ["WaterSimulationCore"],
            resources: [.process("Shaders")]
        ),
        .executableTarget(
            name: "MetalWaterProofVerifier",
            dependencies: ["WaterSimulationCore"]
        ),
        .testTarget(
            name: "WaterSimulationCoreTests",
            dependencies: [
                "WaterSimulationCore",
                .product(name: "Testing", package: "swift-testing"),
            ]
        ),
    ]
)
