import SwiftUI
import WaterSimulationCore

extension Color {
    init(performance color: PerformanceColor) {
        self.init(
            .sRGB,
            red: Double(color.rgba.x),
            green: Double(color.rgba.y),
            blue: Double(color.rgba.z),
            opacity: Double(color.rgba.w)
        )
    }
}

enum PerformanceStyle {
    static let background = Color(performance: PerformanceTokens.backgroundPure)
    static let shell = Color(performance: PerformanceTokens.shellSurface)
    static let shellSecondary = Color(performance: PerformanceTokens.shellSurfaceSecondary)
    static let shellHover = Color(performance: PerformanceTokens.shellSurfaceHover)
    static let surface = Color(performance: PerformanceTokens.backgroundSurface)
    static let panel = Color(performance: PerformanceTokens.panel)
    static let primary = Color(performance: PerformanceTokens.foregroundPrimary)
    static let secondary = Color(performance: PerformanceTokens.foregroundSecondary)
    static let tertiary = Color(performance: PerformanceTokens.foregroundTertiary)
    static let muted = Color(performance: PerformanceTokens.foregroundMuted)
    static let border = Color(performance: PerformanceTokens.shellBorderDefault)
    static let borderStrong = Color(performance: PerformanceTokens.shellBorderStrong)
    static let accent = Color(performance: PerformanceTokens.brandPrimary)
    static let accentSecondary = Color(performance: PerformanceTokens.brandSecondary)
    static let accentBorder = Color(performance: PerformanceTokens.brandPrimaryBorder)
    static let active = Color(performance: PerformanceTokens.active)
    static let focus = Color(performance: PerformanceTokens.focus)
    static let paper = Color(performance: PerformanceTokens.paper)
    static let court = Color(performance: PerformanceTokens.court)
    static let ink = Color(performance: PerformanceTokens.ink)
    static let inkSoft = Color(performance: PerformanceTokens.inkSoft)
    static let documentMuted = Color(performance: PerformanceTokens.documentMuted)
    static let line = Color(performance: PerformanceTokens.line)
    static let lineStrong = Color(performance: PerformanceTokens.lineStrong)

    static let spaceXS = PerformanceTokens.spaceExtraSmall
    static let spaceSM = PerformanceTokens.spaceSmall
    static let spaceMD = PerformanceTokens.spaceMedium
    static let radius = PerformanceTokens.radiusMedium
    static let instant = PerformanceTokens.durationInstant

    static func interfaceFont(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Arial", fixedSize: size).weight(weight)
    }

    static func recordFont(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    static func displayFont(size: CGFloat, weight: Font.Weight = .medium) -> Font {
        .custom("Helvetica Neue", fixedSize: size).weight(weight)
    }

    static func receiptForeground(for tone: PerformanceReceiptTone) -> Color {
        switch tone {
        case .controlled:
            Color(performance: PerformanceTokens.signal)
        case .pressure:
            Color(performance: PerformanceTokens.pressure)
        case .ready:
            Color(performance: PerformanceTokens.growth)
        case .review:
            Color(performance: PerformanceTokens.gold)
        case .stop:
            Color(performance: PerformanceTokens.risk)
        }
    }

    static func receiptBackground(for tone: PerformanceReceiptTone) -> Color {
        switch tone {
        case .controlled:
            Color(performance: PerformanceTokens.signalSoft)
        case .pressure:
            Color(performance: PerformanceTokens.pressureSoft)
        case .ready:
            Color(performance: PerformanceTokens.growthSoft)
        case .review:
            Color(performance: PerformanceTokens.goldSoft)
        case .stop:
            Color(performance: PerformanceTokens.riskSoft)
        }
    }
}

enum PerformanceHeaderButtonRole {
    case primary
    case secondary
}

struct PerformanceHeaderButton: View {
    let title: String
    let role: PerformanceHeaderButtonRole
    let shortcut: KeyboardShortcut
    let accessibilityIdentifier: String
    let action: () -> Void

    @State private var isHovered = false
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: action) {
            Text(title)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
        }
        .buttonStyle(
            PerformanceHeaderButtonStyle(
                role: role,
                isHovered: isHovered,
                isFocused: isFocused
            )
        )
        .keyboardShortcut(shortcut)
        .focused($isFocused)
        .fixedSize(horizontal: true, vertical: false)
        .layoutPriority(role == .primary ? 2 : 1)
        .onHover { isHovered = $0 }
        .accessibilityIdentifier(accessibilityIdentifier)
    }
}

private struct PerformanceHeaderButtonStyle: ButtonStyle {
    let role: PerformanceHeaderButtonRole
    let isHovered: Bool
    let isFocused: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(
                PerformanceStyle.interfaceFont(
                    size: PerformanceHeaderContract.actionFontSize,
                    weight: .bold
                )
            )
            .foregroundStyle(foreground)
            .padding(
                .horizontal,
                PerformanceHeaderContract.actionHorizontalPadding
            )
            .frame(minHeight: PerformanceHeaderContract.actionHeight)
            .background(background(isPressed: configuration.isPressed))
            .overlay {
                Rectangle()
                    .stroke(border, lineWidth: 1)
            }
            .overlay {
                if isFocused {
                    Rectangle()
                        .stroke(
                            Color(performance: PerformanceHeaderContract.focusRing),
                            lineWidth: 2
                        )
                        .padding(-3)
                }
            }
            .contentShape(Rectangle())
            .animation(
                .easeOut(duration: PerformanceStyle.instant),
                value: configuration.isPressed
            )
            .animation(
                .easeOut(duration: PerformanceStyle.instant),
                value: isHovered
            )
    }

    private var foreground: Color {
        Color(
            performance: role == .primary
                ? PerformanceHeaderContract.primaryForeground
                : PerformanceHeaderContract.secondaryForeground
        )
    }

    private var border: Color {
        switch role {
        case .primary:
            Color(performance: PerformanceHeaderContract.primaryBackground)
        case .secondary:
            isHovered ? PerformanceStyle.borderStrong : PerformanceStyle.border
        }
    }

    @ViewBuilder
    private func background(isPressed: Bool) -> some View {
        switch role {
        case .primary:
            if isPressed {
                Color(performance: PerformanceHeaderContract.primaryPressedBackground)
            } else if isHovered {
                Color(performance: PerformanceHeaderContract.primaryHoverBackground)
            } else {
                Color(performance: PerformanceHeaderContract.primaryBackground)
            }
        case .secondary:
            ZStack {
                Color(
                    performance: isHovered
                        ? PerformanceHeaderContract.secondaryHoverBackground
                        : PerformanceHeaderContract.secondaryBackground
                )
                if isPressed {
                    PerformanceStyle.active
                }
            }
        }
    }
}

struct PerformanceButtonStyle: ButtonStyle {
    let emphasized: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(
                PerformanceStyle.interfaceFont(
                    size: PerformanceWorkspaceContract.actionFontSize,
                    weight: .bold
                )
            )
            .foregroundStyle(PerformanceStyle.primary)
            .padding(.horizontal, PerformanceWorkspaceContract.actionHorizontalPadding)
            .frame(minHeight: PerformanceWorkspaceContract.actionHeight)
            .background {
                ZStack {
                    emphasized ? PerformanceStyle.accent : PerformanceStyle.surface
                    if configuration.isPressed {
                        PerformanceStyle.active
                    }
                }
            }
            .overlay {
                Rectangle()
                    .stroke(
                        emphasized ? PerformanceStyle.accentBorder : PerformanceStyle.border,
                        lineWidth: 1
                    )
            }
            .contentShape(Rectangle())
            .animation(.easeOut(duration: PerformanceStyle.instant), value: configuration.isPressed)
    }
}

struct PerformanceReceipt: View {
    let label: String
    let tone: PerformanceReceiptTone

    var body: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(PerformanceStyle.receiptForeground(for: tone))
                .frame(
                    width: PerformanceWorkspaceContract.semanticRailWidth,
                    height: PerformanceWorkspaceContract.stampHeight
                )
            Text(label)
                .font(PerformanceStyle.recordFont(size: 10, weight: .semibold))
                .monospacedDigit()
                .lineLimit(1)
                .padding(.horizontal, PerformanceWorkspaceContract.stampHorizontalPadding)
        }
        .foregroundStyle(PerformanceStyle.ink)
        .frame(height: PerformanceWorkspaceContract.stampHeight)
        .background(PerformanceStyle.panel)
        .overlay {
            Rectangle()
                .stroke(PerformanceStyle.lineStrong, lineWidth: 1)
        }
    }
}
