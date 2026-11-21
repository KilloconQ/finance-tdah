import SwiftUI

struct MiniStat: View {
    let title: String
    let cents: Int

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingTight) {
            Text(title)
                .font(.footnote)
                .foregroundStyle(Palette.inkMid)
            MoneyText(cents: cents)
                .font(.title3.bold())
                .foregroundStyle(Palette.ink)
        }
        .cardStyle()
        .accessibilityElement(children: .combine)
    }
}
