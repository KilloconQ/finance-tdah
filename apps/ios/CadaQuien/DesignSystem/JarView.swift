import SwiftUI

/// A goal's jar filling up. Motion is replaced by a plain change when Reduce Motion is on.
struct JarView: View {
    let fraction: Double
    var emoji: String = "🌿"
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let level = fraction.clamped(to: 0...1)
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height
            let lidHeight = max(height * 0.08, 6)
            let gap = max(height * 0.025, 2)
            let bodyHeight = max(height - lidHeight - gap, 1)
            VStack(spacing: gap) {
                // The lid, narrower than the body: what makes it read as a jar and not as a card.
                RoundedRectangle(cornerRadius: 3)
                    .fill(Palette.surface)
                    .overlay { RoundedRectangle(cornerRadius: 3).stroke(Palette.inkMid, lineWidth: 1.25) }
                    .frame(width: width * 0.64, height: lidHeight)
                ZStack(alignment: .bottom) {
                    Palette.bgAlt
                    Rectangle()
                        .fill(Palette.sageMuted)
                        .frame(height: bodyHeight * level)
                        .animation(reduceMotion ? nil : .easeOut(duration: 0.6), value: level)
                    // Level marks at 25, 50 and 75 percent, like the web.
                    Path { path in
                        for mark in [0.25, 0.5, 0.75] {
                            let y = bodyHeight * (1 - mark)
                            path.move(to: CGPoint(x: 0, y: y))
                            path.addLine(to: CGPoint(x: width * 0.08, y: y))
                        }
                    }
                    .stroke(Palette.inkSoft, lineWidth: Layout.hairline)
                    Text(emoji)
                        .font(.system(size: max(min(width, height) * 0.3, 14)))
                        .frame(maxHeight: .infinity)
                        .accessibilityHidden(true)
                }
                .frame(width: width * 0.84, height: bodyHeight)
                .clipShape(.rect(cornerRadius: min(width * 0.14, Layout.radiusCard)))
                .overlay {
                    RoundedRectangle(cornerRadius: min(width * 0.14, Layout.radiusCard)).stroke(Palette.inkMid, lineWidth: 1.25)
                }
            }
            .frame(width: width, height: height)
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
