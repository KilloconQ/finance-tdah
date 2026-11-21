import SwiftUI

/// A goal's jar filling up. Motion is replaced by a plain change when Reduce Motion is on.
struct JarView: View {
    let fraction: Double
    var emoji: String = "🌿"
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: Layout.radiusCard)
                .fill(Palette.bgAlt)
            Rectangle()
                .fill(Palette.sageMuted)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .containerRelativeFrame(.vertical) { length, _ in length * fraction.clamped(to: 0...1) }
                .animation(reduceMotion ? nil : .easeOut(duration: 0.6), value: fraction)
            Text(emoji)
                .font(.largeTitle)
                .frame(maxHeight: .infinity)
                .accessibilityHidden(true)
        }
        .clipShape(.rect(cornerRadius: Layout.radiusCard))
        .overlay {
            RoundedRectangle(cornerRadius: Layout.radiusCard).stroke(Palette.line, lineWidth: Layout.hairline)
        }
        .accessibilityElement()
        .accessibilityLabel("Frasco")
        .accessibilityValue("\(Int((fraction.clamped(to: 0...1) * 100).rounded())) por ciento lleno")
    }
}

extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

#Preview {
    JarView(fraction: 0.4).frame(width: 96, height: 120)
}
