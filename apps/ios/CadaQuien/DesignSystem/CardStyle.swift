import SwiftUI

private struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(Layout.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusCard))
            .overlay {
                RoundedRectangle(cornerRadius: Layout.radiusCard).stroke(Palette.line, lineWidth: Layout.hairline)
            }
    }
}

extension View {
    /// White card on the warm background, with a hairline border.
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
