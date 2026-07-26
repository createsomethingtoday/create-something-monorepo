import Testing
import Metal
@testable import GateReleaseFilm

@Suite("Gate release film timeline")
struct GateReleaseTimelineTests {
    @Test("The film contract is eight seconds at twenty-four FPS")
    func defaultFilmContractIsEightSecondsAtTwentyFourFPS() {
        let timeline = GateReleaseTimeline(specification: .performanceGateRelease)

        #expect(timeline.specification.width == 1_280)
        #expect(timeline.specification.height == 720)
        #expect(timeline.specification.framesPerSecond == 24)
        #expect(timeline.frameCount == 192)
    }

    @Test("Water never crosses before the gate is fully open")
    func waterNeverCrossesBeforeTheGateIsFullyOpen() throws {
        let timeline = GateReleaseTimeline(specification: .performanceGateRelease)
        let samples = (0..<timeline.frameCount).map(timeline.sample)
        let firstReleased = try #require(samples.first { $0.waterReleaseProgress > 0 })

        #expect(abs(firstReleased.gateOpenProgress - 1) < 0.000_001)
        #expect(firstReleased.frameIndex > 72)
        #expect(
            samples
                .filter { $0.gateOpenProgress < 1 }
                .allSatisfy { $0.waterReleaseProgress == 0 }
        )
    }

    @Test("Story state is monotonic and terminal proof holds")
    func everyStoryStateIsMonotonicAndTerminalProofHolds() {
        let timeline = GateReleaseTimeline(specification: .performanceGateRelease)
        let samples = (0..<timeline.frameCount).map(timeline.sample)

        #expect(isMonotonic(samples.map(\.gateOpenProgress)))
        #expect(isMonotonic(samples.map(\.waterReleaseProgress)))
        #expect(isMonotonic(samples.map(\.proofProgress)))

        let finalHold = samples.suffix(36)
        #expect(finalHold.allSatisfy { $0.gateOpenProgress == 1 })
        #expect(finalHold.allSatisfy { $0.waterReleaseProgress == 1 })
        #expect(finalHold.allSatisfy { $0.proofProgress == 1 })
    }

    @Test("Sampling is deterministic")
    func samplingIsDeterministic() {
        let first = GateReleaseTimeline(specification: .performanceGateRelease)
        let second = GateReleaseTimeline(specification: .performanceGateRelease)

        #expect(
            (0..<first.frameCount).map(first.sample)
                == (0..<second.frameCount).map(second.sample)
        )
    }

    @Test("Metal renders deterministic and distinct causal checkpoints")
    func metalRendersDeterministicAndDistinctCausalCheckpoints() throws {
        let device = try #require(MTLCreateSystemDefaultDevice())
        let specification = GateReleaseShotSpecification(
            width: 320,
            height: 180,
            framesPerSecond: 24,
            durationSeconds: 8,
            deterministicSeed: GateReleaseShotSpecification.performanceGateRelease.deterministicSeed
        )
        let timeline = GateReleaseTimeline(specification: specification)
        let renderer = try MetalGateReleaseRenderer(
            device: device,
            specification: specification
        )

        let closed = try renderer.render(sample: timeline.sample(47))
        let closedAgain = try renderer.render(sample: timeline.sample(47))
        let fullyOpen = try renderer.render(sample: timeline.sample(72))
        let released = try renderer.render(sample: timeline.sample(132))
        let proof = try renderer.render(sample: timeline.sample(156))

        #expect(closed.width == 320)
        #expect(closed.height == 180)
        #expect(closed.rgba8.count == 320 * 180 * 4)
        #expect(closed.rgba8 == closedAgain.rgba8)
        #expect(closed.rgba8 != fullyOpen.rgba8)
        #expect(fullyOpen.rgba8 != released.rgba8)
        #expect(released.rgba8 != proof.rgba8)
        #expect(
            stride(from: 3, to: closed.rgba8.count, by: 4)
                .allSatisfy { closed.rgba8[$0] == 255 }
        )
    }

    private func isMonotonic(_ values: [Float]) -> Bool {
        zip(values, values.dropFirst()).allSatisfy(<=)
    }
}
