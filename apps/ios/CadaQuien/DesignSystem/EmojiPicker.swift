import SwiftUI

/// A short row of emoji to pick from. The web offers a fixed set, not free text.
struct EmojiPicker: View {
    let options: [String]
    @Binding var selection: String
    var title = "Emoji"

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text(title).font(.subheadline).foregroundStyle(Palette.inkMid)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: Layout.minTap), spacing: Layout.spacingSmall)], alignment: .leading, spacing: Layout.spacingSmall) {
                ForEach(options, id: \.self) { emoji in
                    Button {
                        selection = emoji
                    } label: {
                        Text(emoji)
                            .font(.title2)
                            .frame(width: Layout.minTap, height: Layout.minTap)
                            .background(selection == emoji ? Palette.sageBg : Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
                            .overlay {
                                RoundedRectangle(cornerRadius: Layout.radiusControl)
                                    .stroke(selection == emoji ? Palette.sage : Palette.line, lineWidth: Layout.hairline)
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(emoji)
                    .accessibilityAddTraits(selection == emoji ? .isSelected : [])
                }
            }
        }
    }
}
