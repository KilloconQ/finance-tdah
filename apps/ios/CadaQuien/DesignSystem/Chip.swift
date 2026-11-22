import SwiftUI

/// A selectable pill. Selected is sage on soft sage, never black.
struct Chip: View {
    let title: String
    var systemImage: String?
    var isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if let systemImage {
                    Label(title, systemImage: systemImage)
                } else {
                    Text(title)
                }
            }
            .font(.subheadline)
            .lineLimit(1)
            .foregroundStyle(isSelected ? Palette.sageStrong : Palette.inkMid)
            .padding(.horizontal, Layout.spacingLarge)
            .frame(minHeight: Layout.minTap)
            .background(isSelected ? Palette.sageBg : Palette.surface, in: .capsule)
            .overlay {
                Capsule().stroke(isSelected ? Palette.sageMuted : Palette.line, lineWidth: Layout.hairline)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

#Preview {
    HStack {
        Chip(title: "Comida", isSelected: true) {}
        Chip(title: "Transporte", isSelected: false) {}
    }
    .padding()
}
