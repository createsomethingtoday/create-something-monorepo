// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "MetalWaterGateRelease",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "GateReleaseFilm", targets: ["GateReleaseFilm"]),
        .executable(name: "MetalGateReleaseRender", targets: ["MetalGateReleaseRender"]),
        .executable(name: "SPHFieldCapture", targets: ["SPHFieldCapture"]),
    ],
    dependencies: [
        .package(path: "../metal-water-simulator"),
        .package(url: "https://github.com/apple/swift-testing.git", from: "0.6.0"),
    ],
    targets: [
        .target(
            name: "GateReleaseFilm",
            resources: [.process("Shaders")]
        ),
        .executableTarget(
            name: "MetalGateReleaseRender",
            dependencies: ["GateReleaseFilm"]
        ),
        .target(
            name: "SPHFieldBridge",
            dependencies: [
                "GateReleaseFilm",
                .product(name: "WaterSimulationCore", package: "metal-water-simulator"),
            ]
        ),
        .executableTarget(
            name: "SPHFieldCapture",
            dependencies: ["SPHFieldBridge"]
        ),
        .testTarget(
            name: "GateReleaseFilmTests",
            dependencies: [
                "GateReleaseFilm",
                .product(name: "Testing", package: "swift-testing"),
            ]
        ),
        .testTarget(
            name: "SPHFieldBridgeTests",
            dependencies: [
                "SPHFieldBridge",
                .product(name: "WaterSimulationCore", package: "metal-water-simulator"),
                .product(name: "Testing", package: "swift-testing"),
            ]
        ),
    ]
)
