import SwiftUI

/// A tappable row card that pushes a route: leading content, trailing content, and a chevron.
struct NavigationRow<Leading: View, Trailing: View>: View {
    let route: Route
    @ViewBuilder let leading: () -> Leading
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        NavigationLink(value: route) {
            HStack(spacing: Layout.spacing) {
                leading()
                Spacer(minLength: Layout.spacingSmall)
                trailing()
                Image(systemName: "chevron.right")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkSoft)
                    .accessibilityHidden(true)
            }
            .frame(minHeight: Layout.minTap)
            .cardStyle()
        }
        .buttonStyle(.plain)
    }
}
