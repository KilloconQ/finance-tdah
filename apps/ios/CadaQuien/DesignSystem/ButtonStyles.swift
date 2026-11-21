import SwiftUI

/// Filled sage button: the one primary action on a screen.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.bold())
            .foregroundStyle(Palette.surface)
            .frame(maxWidth: .infinity, minHeight: Layout.minTap)
            .padding(.horizontal, Layout.spacingLarge)
            .background(isEnabled ? Palette.sage : Palette.inkGhost, in: .rect(cornerRadius: Layout.radiusControl))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

/// Outlined button for secondary actions.
struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body)
            .foregroundStyle(Palette.ink)
            .frame(maxWidth: .infinity, minHeight: Layout.minTap)
            .padding(.horizontal, Layout.spacingLarge)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay {
                RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline)
            }
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

/// Destructive action, kept calm: danger text on a soft danger background.
struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body)
            .foregroundStyle(Palette.danger)
            .frame(maxWidth: .infinity, minHeight: Layout.minTap)
            .padding(.horizontal, Layout.spacingLarge)
            .background(Palette.dangerBg, in: .rect(cornerRadius: Layout.radiusControl))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var cqPrimary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == GhostButtonStyle {
    static var cqGhost: GhostButtonStyle { GhostButtonStyle() }
}

extension ButtonStyle where Self == DangerButtonStyle {
    static var cqDanger: DangerButtonStyle { DangerButtonStyle() }
}
