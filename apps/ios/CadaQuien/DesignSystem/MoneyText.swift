import CadaQuienKit
import SwiftUI

/// An amount in pesos, with tabular digits so columns line up. Honors the "hide balances" setting.
struct MoneyText: View {
    enum Style { case plain, delta }

    let cents: Int
    var style: Style = .plain
    @Environment(\.hideBalances) private var hidden

    var body: some View {
        Text(text)
            .monospacedDigit()
            .accessibilityLabel(hidden ? "Monto oculto" : text)
    }

    private var text: String {
        switch style {
        case .plain: Money.format(cents: cents, hidden: hidden)
        case .delta: Money.delta(cents: cents, hidden: hidden)
        }
    }
}

#Preview {
    VStack(spacing: Layout.spacing) {
        MoneyText(cents: 123_450)
        MoneyText(cents: -5_000, style: .delta)
        MoneyText(cents: 123_450).environment(\.hideBalances, true)
    }
    .padding()
}
