import SwiftUI

/// A goal's jar filling up. Motion is replaced by a plain change when Reduce Motion is on.
struct JarView: View {
    let fraction: Double
    var emoji: String = "🌿"
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let level = fraction.clamped(to: 0...1)
        ZStack {
            Palette.bgAlt
            GeometryReader { proxy in
                Rectangle()
                    .fill(Palette.sageMuted)
                    .frame(height: proxy.size.height * level)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.6), value: level)
            }
            Text(emoji)
                .font(.largeTitle)
                .accessibilityHidden(true)
        }
        .clipShape(.rect(cornerRadius: Layout.radiusCard))
        .overlay {
            RoundedRectangle(cornerRadius: Layout.radiusCard).stroke(Palette.line, lineWidth: Layout.hairline)
        }
        .accessibilityElement()
        .accessibilityLabel("Frasco")
        .accessibilityValue("\(Int((level * 100).rounded())) por ciento lleno")
    }
}

extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

#Preview {
    HStack {
        JarView(fraction: 0.2).frame(width: 56, height: 76)
        JarView(fraction: 0.6).frame(width: 96, height: 128)
        JarView(fraction: 1).frame(width: 96, height: 128)
    }
    .padding()
}
