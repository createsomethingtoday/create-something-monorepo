import Foundation
import Metal
import SPHFieldBridge
import Testing
import WaterSimulationCore

@Suite("SPH field interchange")
struct SPHFieldDocumentTests {
    @Test("The public capture contract matches the eight-second film")
    func publicCaptureContractMatchesFilm() {
        let specification = SPHFieldCaptureSpecification.performanceGateRelease

        #expect(specification.schemaVersion == 1)
        #expect(specification.width == 96)
        #expect(specification.height == 96)
        #expect(specification.framesPerSecond == 24)
        #expect(specification.frameCount == 192)
        #expect(specification.simulationStepsPerFrame == 2)
        #expect(specification.gateOpensAfterFrame == 72)
    }

    @Test("Rasterized SPH fields are deterministic and preserve downstream occupancy")
    func rasterizedFieldsAreDeterministicAndCausal() {
        let particles = [
            WaterParticle(position: SIMD2<Float>(-0.75, 0.75), velocity: .zero),
            WaterParticle(position: SIMD2<Float>(0.75, 0.75), velocity: .zero),
            WaterParticle(position: SIMD2<Float>(0, -0.75), velocity: .zero),
        ]
        let rasterizer = SPHFieldRasterizer(
            width: 8,
            height: 8,
            bounds: SimulationBounds.unit,
            gateY: 0
        )

        let first = rasterizer.rasterize(particles)
        let second = rasterizer.rasterize(particles)

        #expect(first == second)
        #expect(first.values.count == 64)
        #expect(first.values.contains { $0 > 0 })
        #expect(first.downstreamParticleCount == 1)
        #expect(first.maximumValue == first.values.max())
    }

    @Test("Field documents encode deterministically and round-trip")
    func fieldDocumentsEncodeDeterministically() throws {
        let document = SPHFieldDocument(
            specification: .performanceGateRelease,
            source: SPHFieldSource(
                renderer: "Apple Metal SPH",
                hydraulicProjectionSHA256: String(repeating: "a", count: 64)
            ),
            bounds: SPHFieldBounds(
                minimumX: -1,
                minimumY: -1,
                maximumX: 1,
                maximumY: 1
            ),
            gateY: 0,
            gateOpeningCenterX: 0,
            gateOpeningHalfWidth: 0.25,
            particleCount: 8_192,
            frames: [
                SPHFieldFrame(
                    frameIndex: 0,
                    timeSeconds: 0,
                    gateOpenProgress: 0,
                    gateOpen: false,
                    proofProgress: 0,
                    downstreamParticleCount: 0,
                    overflowCount: 0,
                    values: [0, 1, 2, 3]
                ),
            ]
        )

        let first = try document.deterministicJSONData()
        let second = try document.deterministicJSONData()
        let decoded = try JSONDecoder().decode(SPHFieldDocument.self, from: first)

        #expect(first == second)
        #expect(decoded == document)
        #expect(decoded.source.hydraulicProjectionSHA256.count == 64)
        #expect(decoded.gateOpeningCenterX == 0)
        #expect(decoded.gateOpeningHalfWidth == 0.25)
    }

    @Test("The canonical Metal capture contains water until the gate is open")
    func canonicalMetalCaptureRespectsTheGate() throws {
        let device = try #require(MTLCreateSystemDefaultDevice())
        let capture = SPHFieldCaptureEngine(
            device: device,
            specification: .performanceGateRelease
        )

        let document = try capture.capture()

        #expect(document.particleCount == 8_192)
        #expect(document.frames.count == 192)
        #expect(document.frames.map(\.frameIndex) == Array(0..<192))
        #expect(document.frames.allSatisfy { $0.values.count == 96 * 96 })
        #expect(document.frames.allSatisfy { $0.overflowCount == 0 })
        #expect(document.frames[72].gateOpenProgress == 1)
        #expect(document.gateOpeningHalfWidth > 0)
        #expect(!document.frames[72].gateOpen)
        #expect(document.frames[72].downstreamParticleCount == 0)
        #expect(document.frames[73].gateOpen)
        #expect(
            document.frames.dropFirst(73).contains {
                $0.downstreamParticleCount > 0
            }
        )
    }
}
