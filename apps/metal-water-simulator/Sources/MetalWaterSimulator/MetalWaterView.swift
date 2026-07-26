import AppKit
import MetalKit
import SwiftUI
import WaterSimulationCore
import simd

struct MetalWaterView: NSViewRepresentable {
    @ObservedObject var controller: SimulatorController

    func makeNSView(context: Context) -> NSView {
        guard let device = MTLCreateSystemDefaultDevice() else {
            return messageView("This Mac does not expose a Metal device.")
        }

        let view = InteractiveMetalView(frame: .zero, device: device)
        view.colorPixelFormat = .bgra8Unorm_srgb
        let background = PerformanceTokens.paper.rgba
        view.clearColor = MTLClearColor(
            red: Double(background.x),
            green: Double(background.y),
            blue: Double(background.z),
            alpha: Double(background.w)
        )
        view.preferredFramesPerSecond = 60
        view.enableSetNeedsDisplay = false
        view.isPaused = false
        view.framebufferOnly = true

        do {
            let renderer = try WaterRenderer(view: view)
            view.delegate = renderer
            view.splashHandler = { [weak controller] point in
                Task { @MainActor in
                    controller?.injectSignal(at: point)
                }
            }
            view.replayHandler = { [weak controller] in
                Task { @MainActor in
                    controller?.replaySelectedScenario()
                }
            }
            view.pauseHandler = { [weak controller] in
                Task { @MainActor in
                    controller?.togglePaused()
                }
            }
            view.resetHandler = { [weak controller] in
                Task { @MainActor in
                    controller?.reset()
                }
            }
            view.nextArtifactHandler = { [weak controller] in
                Task { @MainActor in
                    guard controller?.isArtifactTourPresented == true else { return }
                    controller?.visitNextArtifact()
                }
            }
            view.previousArtifactHandler = { [weak controller] in
                Task { @MainActor in
                    guard controller?.isArtifactTourPresented == true else { return }
                    controller?.visitPreviousArtifact()
                }
            }
            context.coordinator.renderer = renderer
            controller.attach(renderer: renderer)
            return view
        } catch {
            return messageView(error.localizedDescription)
        }
    }

    func updateNSView(_ nsView: NSView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    @MainActor
    final class Coordinator {
        var renderer: WaterRenderer?
    }

    private func messageView(_ message: String) -> NSView {
        let label = NSTextField(labelWithString: message)
        label.alignment = .center
        label.textColor = .secondaryLabelColor
        label.translatesAutoresizingMaskIntoConstraints = false
        let container = NSView()
        container.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: container.centerYAnchor),
        ])
        return container
    }
}

final class InteractiveMetalView: MTKView {
    var splashHandler: ((SIMD2<Float>) -> Void)?
    var replayHandler: (() -> Void)?
    var pauseHandler: (() -> Void)?
    var resetHandler: (() -> Void)?
    var nextArtifactHandler: (() -> Void)?
    var previousArtifactHandler: (() -> Void)?

    override var acceptsFirstResponder: Bool { true }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.window?.makeFirstResponder(self)
        }
    }

    override func keyDown(with event: NSEvent) {
        switch event.keyCode {
        case 49:
            pauseHandler?()
        case 36, 76:
            replayHandler?()
        case 15:
            resetHandler?()
        case 30:
            nextArtifactHandler?()
        case 33:
            previousArtifactHandler?()
        default:
            super.keyDown(with: event)
        }
    }

    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        guard bounds.width > 0, bounds.height > 0 else { return }
        let aspect = Float(bounds.width / bounds.height)
        let simulationPoint = SIMD2<Float>(
            (Float(point.x / bounds.width) * 2 - 1) * aspect,
            Float(point.y / bounds.height) * 2 - 1
        )
        guard abs(simulationPoint.x) <= 1, abs(simulationPoint.y) <= 1 else { return }
        splashHandler?(simulationPoint)
    }
}
