// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "WorkWayVisionOS",
    platforms: [
        .macOS(.v14),
        .visionOS(.v1),
    ],
    products: [
        .library(name: "WorkWaySpatialContract", targets: ["WorkWaySpatialContract"]),
        .library(name: "WorkWayRealityKitAdapter", targets: ["WorkWayRealityKitAdapter"]),
        .executable(name: "WorkWaySpatialContractVerifier", targets: ["WorkWaySpatialContractVerifier"]),
    ],
    targets: [
        .target(
            name: "WorkWaySpatialContract",
            resources: [.process("Resources")]
        ),
        .target(
            name: "WorkWayRealityKitAdapter",
            dependencies: ["WorkWaySpatialContract"]
        ),
        .executableTarget(
            name: "WorkWaySpatialContractVerifier",
            dependencies: ["WorkWaySpatialContract"]
        ),
        .testTarget(
            name: "WorkWaySpatialContractTests",
            dependencies: ["WorkWaySpatialContract"]
        ),
    ]
)
