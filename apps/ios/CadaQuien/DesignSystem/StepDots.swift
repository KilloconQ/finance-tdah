import SwiftUI

struct StepDots: View {
    let count: Int
    let filled: Int

    var body: some View {
        HStack(spacing: Layout.spacingSmall) {
            ForEach(0..<count, id: \.self) { index in
                Circle()
                    .fill(index < filled ? Palette.sage : Palette.line)
                    .frame(width: 8, height: 8)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Paso \(filled) de \(count)")
    }
}
