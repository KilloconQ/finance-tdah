import SwiftUI

/// A titled card with a one-line hint, used by Ajustes and other form-like screens.
struct SettingsCard<Content: View>: View {
    let title: String
    var hint: String?
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacing) {
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Palette.ink)
                    .accessibilityAddTraits(.isHeader)
                if let hint {
                    Text(hint)
                        .font(.footnote)
                        .foregroundStyle(Palette.inkMid)
                }
            }
            content()
        }
        .cardStyle()
    }
}
