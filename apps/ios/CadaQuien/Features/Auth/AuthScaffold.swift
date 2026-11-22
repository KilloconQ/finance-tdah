import SwiftUI

/// The shared layout of the auth screens: a title, a subtitle, the form, and a footer link.
struct AuthScaffold<Content: View, Footer: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: () -> Content
    @ViewBuilder let footer: () -> Footer

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    Text(title)
                        .font(.largeTitle.bold())
                        .foregroundStyle(Palette.ink)
                        .accessibilityAddTraits(.isHeader)
                    Text(subtitle)
                        .font(.body)
                        .foregroundStyle(Palette.inkMid)
                }
                VStack(alignment: .leading, spacing: Layout.spacingLarge) {
                    content()
                }
                .cardStyle()
                footer()
                    .frame(maxWidth: .infinity)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg)
    }
}
