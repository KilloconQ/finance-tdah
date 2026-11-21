import SwiftUI

/// One bar split into colored segments, with a legend that repeats the colors in words.
struct StackedBar: View {
    struct Segment: Identifiable {
        let id: String
        let label: String
        let weight: Double
        let color: Color
    }

    let segments: [Segment]

    var body: some View {
        let total = max(1, segments.reduce(0) { $0 + max(0, $1.weight) })
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            GeometryReader { proxy in
                HStack(spacing: 2) {
                    ForEach(segments) { segment in
                        Rectangle()
                            .fill(segment.color)
                            .frame(width: proxy.size.width * max(0, segment.weight) / total)
                    }
                }
            }
            .frame(height: 12)
            .clipShape(.capsule)
            .background(Palette.bgAlt, in: .capsule)
            .accessibilityHidden(true)

            // Colors alone don't carry the meaning: each one is named.
            FlowLegend(segments: segments.filter { $0.weight > 0 })
        }
    }
}

private struct FlowLegend: View {
    let segments: [StackedBar.Segment]

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Layout.spacing) { items }
            VStack(alignment: .leading, spacing: Layout.spacingTight) { items }
        }
        .font(.footnote)
        .foregroundStyle(Palette.inkMid)
    }

    private var items: some View {
        ForEach(segments) { segment in
            HStack(spacing: Layout.spacingTight) {
                Circle().fill(segment.color).frame(width: 8, height: 8)
                Text(segment.label)
            }
        }
    }
}
