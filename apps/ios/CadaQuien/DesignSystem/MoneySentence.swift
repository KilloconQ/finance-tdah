import CadaQuienKit
import SwiftUI

/// A sentence with amounts inside it, as one `Text`: it wraps like a sentence, and VoiceOver reads it whole.
/// Amounts are masked when the "hide balances" setting is on.
///
///     MoneySentence("tienes ", .money(a), " · debes ", .money(b))
struct MoneySentence: View {
    enum Part: ExpressibleByStringInterpolation {
        case text(String)
        case money(Int)

        init(stringLiteral value: String) {
            self = .text(value)
        }

        /// Lets a part be written as `"hace \(days) días"`.
        init(stringInterpolation: DefaultStringInterpolation) {
            self = .text(String(stringInterpolation: stringInterpolation))
        }
    }

    private let parts: [Part]
    @Environment(\.hideBalances) private var hidden

    init(_ parts: Part...) {
        self.parts = parts
    }

    var body: some View {
        Text(sentence)
            .monospacedDigit()
    }

    private var sentence: String {
        parts.map { part in
            switch part {
            case .text(let text): text
            case .money(let cents): Money.format(cents: cents, hidden: hidden)
            }
        }.joined()
    }
}

#Preview {
    MoneySentence("tienes ", .money(496_500), " · debes ", .money(98_000), " · 🔒 ", .money(12_500), " bloqueado en cajitas")
        .padding()
}
