// swift-tools-version: 5.9
// Meeting Capture - "Tools recede, understanding remains"

import PackageDescription

let package = Package(
    name: "MeetingCapture",
    platforms: [
        .macOS(.v13) // Requires macOS 13+ for ScreenCaptureKit audio
    ],
    products: [
        .executable(name: "MeetingCapture", targets: ["MeetingCapture"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-testing.git", from: "0.6.0")
    ],
    targets: [
        .executableTarget(
            name: "MeetingCapture",
            path: "Sources",
            resources: [
                .process("../Resources")
            ]
        ),
        .testTarget(
            name: "MeetingCaptureTests",
            dependencies: [
                "MeetingCapture",
                .product(name: "Testing", package: "swift-testing")
            ],
            path: "Tests"
        )
    ]
)
