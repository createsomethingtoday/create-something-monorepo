import simd

public enum PerformanceReceiptTone: Equatable, Sendable {
    case controlled
    case pressure
    case ready
    case review
    case stop

    public static func resolve(
        isPaused: Bool,
        hasPendingImpulse: Bool,
        gridOverflowCount: Int,
        hasTenSecondWindow: Bool,
        medianFPS: Double,
        minimumReadyFPS: Double = 45
    ) -> PerformanceReceiptTone {
        if gridOverflowCount > 0 {
            return .stop
        }
        if isPaused {
            return .review
        }
        if hasPendingImpulse {
            return .pressure
        }
        if hasTenSecondWindow {
            return medianFPS >= minimumReadyFPS ? .ready : .review
        }
        return .controlled
    }
}

public struct PerformanceColor: Equatable, Sendable {
    public let canonicalValue: String
    public let rgba: SIMD4<Float>

    public init(
        canonicalValue: String,
        red: Float,
        green: Float,
        blue: Float,
        alpha: Float = 1
    ) {
        self.canonicalValue = canonicalValue
        rgba = SIMD4<Float>(red, green, blue, alpha)
    }

    init(
        canonicalValue: String,
        redByte: Float,
        greenByte: Float,
        blueByte: Float,
        alpha: Float = 1
    ) {
        self.init(
            canonicalValue: canonicalValue,
            red: redByte / 255,
            green: greenByte / 255,
            blue: blueByte / 255,
            alpha: alpha
        )
    }
}

/// Native geometry and semantic treatment for the compact Performance operator
/// rail. Values mirror `performance.css` rather than the broader rounded scale.
public enum PerformanceHeaderContract {
    public static let railHeight: Double = 64
    public static let actionHeight: Double = 44
    public static let actionHorizontalPadding: Double = 18
    public static let actionFontSize: Double = 14
    public static let actionFontWeight = 700
    public static let actionCornerRadius: Double = 0
    public static let controlGap: Double = 8
    public static let provenanceGap: Double = 16
    public static let safetyTagHeight: Double = 28
    public static let safetyTagHorizontalPadding: Double = 10
    public static let labelFontSize: Double = 10
    public static let identityFontSize: Double = 15
    public static let identityTracking: Double = -0.03

    public static let primaryBackground = PerformanceTokens.panel
    public static let primaryForeground = PerformanceTokens.ink
    public static let primaryHoverBackground = PerformanceTokens.court
    public static let primaryPressedBackground = PerformanceTokens.line
    public static let secondaryBackground = PerformanceTokens.backgroundSurface
    public static let secondaryForeground = PerformanceTokens.foregroundPrimary
    public static let secondaryHoverBackground = PerformanceTokens.shellSurfaceHover
    public static let focusRing = PerformanceTokens.focus
}

/// Native geometry and structural treatment for the simulator workspace.
/// Semantic workflow color is reserved for the four-point state rail while
/// panels, gate structure, stamps, and actions retain Canon's neutral recipe.
public enum PerformanceWorkspaceContract {
    public static let scenarioRailHeight: Double = 56
    public static let scenarioCardHeight: Double = 44
    public static let stageRailHeight: Double = 52
    public static let stageMarkerSize: Double = 20
    public static let inspectorHeaderRailHeight: Double = 48
    public static let actionHeight: Double = 44
    public static let actionHorizontalPadding: Double = 18
    public static let actionFontSize: Double = 14
    public static let stampHeight: Double = 28
    public static let stampHorizontalPadding: Double = 8
    public static let semanticRailWidth: Double = 4
    public static let gateLineWidth: Double = 2
    public static let gateOpenTiltDegrees: Double = 8
    public static let gateTransitionDuration: Double = 0.28
    public static let panelCornerRadius: Double = 4
    public static let controlGap: Double = 8
    public static let sectionPadding: Double = 12

    public static let structure = PerformanceTokens.inkSoft
    public static let structureMuted = PerformanceTokens.lineStrong
    public static let panel = PerformanceTokens.panel
    public static let panelMuted = PerformanceTokens.paper

    public static func gateStateLabel(
        isOpen: Bool,
        isDrained: Bool = false
    ) -> String {
        if isOpen {
            return "gate open"
        }
        return isDrained ? "gate closed, reservoir drained" : "gate closed"
    }
}

/// Native mappings for the canonical Performance contract in
/// `packages/canon-tokens/tokens.json`.
public enum PerformanceTokens {
    public static let backgroundPure = PerformanceColor(
        canonicalValue: "#000000",
        red: 0,
        green: 0,
        blue: 0
    )
    public static let backgroundSurface = PerformanceColor(
        canonicalValue: "#111111",
        redByte: 17,
        greenByte: 17,
        blueByte: 17
    )
    public static let shellSurface = PerformanceColor(
        canonicalValue: "#0d0d0d",
        redByte: 13,
        greenByte: 13,
        blueByte: 13
    )
    public static let shellSurfaceSecondary = PerformanceColor(
        canonicalValue: "#101010",
        redByte: 16,
        greenByte: 16,
        blueByte: 16
    )
    public static let shellSurfaceHover = PerformanceColor(
        canonicalValue: "#1c1c1c",
        redByte: 28,
        greenByte: 28,
        blueByte: 28
    )
    public static let foregroundPrimary = PerformanceColor(
        canonicalValue: "#ffffff",
        red: 1,
        green: 1,
        blue: 1
    )
    public static let foregroundSecondary = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.8)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.8
    )
    public static let foregroundTertiary = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.6)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.6
    )
    public static let foregroundMuted = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.46)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.46
    )
    public static let shellBorderDefault = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.12)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.12
    )
    public static let shellBorderStrong = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.2)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.2
    )
    public static let brandPrimary = PerformanceColor(
        canonicalValue: "#315cff",
        redByte: 49,
        greenByte: 92,
        blueByte: 255
    )
    public static let brandSecondary = PerformanceColor(
        canonicalValue: "#a7b8ff",
        redByte: 167,
        greenByte: 184,
        blueByte: 255
    )
    public static let brandInk = PerformanceColor(
        canonicalValue: "#dce4ff",
        redByte: 220,
        greenByte: 228,
        blueByte: 255
    )
    public static let brandPrimaryBorder = PerformanceColor(
        canonicalValue: "rgba(49, 92, 255, 0.28)",
        redByte: 49,
        greenByte: 92,
        blueByte: 255,
        alpha: 0.28
    )
    public static let paper = PerformanceColor(
        canonicalValue: "#f3f3f0",
        redByte: 243,
        greenByte: 243,
        blueByte: 240
    )
    public static let panel = PerformanceColor(
        canonicalValue: "#ffffff",
        red: 1,
        green: 1,
        blue: 1
    )
    public static let ink = PerformanceColor(
        canonicalValue: "#090909",
        redByte: 9,
        greenByte: 9,
        blueByte: 9
    )
    public static let inkSoft = PerformanceColor(
        canonicalValue: "#262626",
        redByte: 38,
        greenByte: 38,
        blueByte: 38
    )
    public static let documentMuted = PerformanceColor(
        canonicalValue: "#5e6268",
        redByte: 94,
        greenByte: 98,
        blueByte: 104
    )
    public static let line = PerformanceColor(
        canonicalValue: "#d7d7d2",
        redByte: 215,
        greenByte: 215,
        blueByte: 210
    )
    public static let lineStrong = PerformanceColor(
        canonicalValue: "#9c9c96",
        redByte: 156,
        greenByte: 156,
        blueByte: 150
    )
    public static let grid = PerformanceColor(
        canonicalValue: "rgb(9 9 9 / 0.055)",
        redByte: 9,
        greenByte: 9,
        blueByte: 9,
        alpha: 0.055
    )
    public static let court = PerformanceColor(
        canonicalValue: "#e6e6e0",
        redByte: 230,
        greenByte: 230,
        blueByte: 224
    )
    public static let growth = PerformanceColor(
        canonicalValue: "#007a4d",
        redByte: 0,
        greenByte: 122,
        blueByte: 77
    )
    public static let growthSoft = PerformanceColor(
        canonicalValue: "#dcece5",
        redByte: 220,
        greenByte: 236,
        blueByte: 229
    )
    public static let signal = PerformanceColor(
        canonicalValue: "#0057b8",
        redByte: 0,
        greenByte: 87,
        blueByte: 184
    )
    public static let signalSoft = PerformanceColor(
        canonicalValue: "#dce8f5",
        redByte: 220,
        greenByte: 232,
        blueByte: 245
    )
    public static let pressure = PerformanceColor(
        canonicalValue: "#e54800",
        redByte: 229,
        greenByte: 72,
        blueByte: 0
    )
    public static let pressureSoft = PerformanceColor(
        canonicalValue: "#f7e2d7",
        redByte: 247,
        greenByte: 226,
        blueByte: 215
    )
    public static let risk = PerformanceColor(
        canonicalValue: "#c62026",
        redByte: 198,
        greenByte: 32,
        blueByte: 38
    )
    public static let riskSoft = PerformanceColor(
        canonicalValue: "#f3dadd",
        redByte: 243,
        greenByte: 218,
        blueByte: 221
    )
    public static let gold = PerformanceColor(
        canonicalValue: "#8b6b00",
        redByte: 139,
        greenByte: 107,
        blueByte: 0
    )
    public static let goldSoft = PerformanceColor(
        canonicalValue: "#eee6cc",
        redByte: 238,
        greenByte: 230,
        blueByte: 204
    )
    public static let active = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.1)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.1
    )
    public static let focus = PerformanceColor(
        canonicalValue: "rgba(255, 255, 255, 0.5)",
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.5
    )
    public static let dataOne = PerformanceColor(
        canonicalValue: "#60a5fa",
        redByte: 96,
        greenByte: 165,
        blueByte: 250
    )
    public static let liquidGlassCyan = PerformanceColor(
        canonicalValue: "#22d3ee",
        redByte: 34,
        greenByte: 211,
        blueByte: 238
    )

    public static let spaceExtraSmall: Double = 0.618 * 16
    public static let spaceSmall: Double = 16
    public static let spaceMedium: Double = 1.618 * 16
    public static let radiusSmall: Double = 0
    public static let radiusMedium: Double = 4
    public static let durationInstant: Double = 0.1

    public static let canonicalValues: [String: String] = [
        "--color-performance-bg-pure": backgroundPure.canonicalValue,
        "--color-performance-bg-surface": backgroundSurface.canonicalValue,
        "--color-performance-shell-surface": shellSurface.canonicalValue,
        "--color-performance-shell-surface-secondary": shellSurfaceSecondary.canonicalValue,
        "--color-performance-shell-surface-hover": shellSurfaceHover.canonicalValue,
        "--color-performance-fg-primary": foregroundPrimary.canonicalValue,
        "--color-performance-fg-secondary": foregroundSecondary.canonicalValue,
        "--color-performance-fg-tertiary": foregroundTertiary.canonicalValue,
        "--color-performance-fg-muted": foregroundMuted.canonicalValue,
        "--color-performance-shell-border-default": shellBorderDefault.canonicalValue,
        "--color-performance-shell-border-strong": shellBorderStrong.canonicalValue,
        "--color-performance-brand-primary": brandPrimary.canonicalValue,
        "--color-performance-brand-secondary": brandSecondary.canonicalValue,
        "--color-performance-brand-ink": brandInk.canonicalValue,
        "--color-performance-brand-primary-border": brandPrimaryBorder.canonicalValue,
        "--color-performance-paper": paper.canonicalValue,
        "--color-performance-panel": panel.canonicalValue,
        "--color-performance-ink": ink.canonicalValue,
        "--color-performance-ink-soft": inkSoft.canonicalValue,
        "--color-performance-muted": documentMuted.canonicalValue,
        "--color-performance-line": line.canonicalValue,
        "--color-performance-line-strong": lineStrong.canonicalValue,
        "--color-performance-grid": grid.canonicalValue,
        "--color-performance-court": court.canonicalValue,
        "--color-performance-growth": growth.canonicalValue,
        "--color-performance-growth-soft": growthSoft.canonicalValue,
        "--color-performance-signal": signal.canonicalValue,
        "--color-performance-signal-soft": signalSoft.canonicalValue,
        "--color-performance-pressure": pressure.canonicalValue,
        "--color-performance-pressure-soft": pressureSoft.canonicalValue,
        "--color-performance-risk": risk.canonicalValue,
        "--color-performance-risk-soft": riskSoft.canonicalValue,
        "--color-performance-gold": gold.canonicalValue,
        "--color-performance-gold-soft": goldSoft.canonicalValue,
        "--color-performance-active": active.canonicalValue,
        "--color-performance-focus": focus.canonicalValue,
        "--color-performance-data-1": dataOne.canonicalValue,
        "--liquid-glass-performance-tint-cyan": liquidGlassCyan.canonicalValue,
        "--space-performance-xs": "0.618rem",
        "--space-performance-sm": "1rem",
        "--space-performance-md": "1.618rem",
        "--radius-performance-sm": "0",
        "--radius-performance-md": "4px",
        "--duration-performance-instant": "100ms",
    ]
}
