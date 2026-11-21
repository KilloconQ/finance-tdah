import CadaQuienKit
import SwiftUI

struct AccountCard: View {
    let account: Account
    let envelopes: [Envelope]

    private var allocated: Int { EnvelopeRules.allocated(envelopes.map(\.balanceCents)) }
    private var shownCents: Int {
        envelopes.isEmpty ? account.balanceCents : EnvelopeRules.unassigned(accountBalance: account.balanceCents, envelopeBalances: envelopes.map(\.balanceCents))
    }

    var body: some View {
        VStack(spacing: Layout.spacing) {
            NavigationLink(value: Route.editAccount(account.id)) {
                HStack(spacing: Layout.spacing) {
                    Text(account.type.emoji)
                        .font(.title2)
                        .frame(width: 44, height: 44)
                        .background(Palette.bgAlt, in: .circle)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                        Text(account.name).font(.body.bold()).foregroundStyle(Palette.ink)
                        Text(meta).font(.footnote).foregroundStyle(Palette.inkMid)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: Layout.spacingTight) {
                        MoneyText(cents: shownCents)
                            .font(.body.bold())
                            .foregroundStyle(shownCents < 0 ? Palette.danger : Palette.ink)
                        if !envelopes.isEmpty {
                            Text("disponible").font(.footnote).foregroundStyle(Palette.inkMid)
                        }
                    }
                }
                .frame(minHeight: Layout.minTap)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Editar \(account.name)")

            if EnvelopeRules.supportsEnvelopes(account.type) {
                Divider()
                NavigationLink(value: Route.envelopes(account.id)) {
                    HStack {
                        if envelopes.isEmpty {
                            Text("📦 Cajitas: aparta dinero para algo")
                        } else {
                            HStack(spacing: 0) {
                                Text("🔒 ")
                                MoneyText(cents: allocated)
                                Text(" en cajitas")
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.footnote).accessibilityHidden(true)
                    }
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMid)
                    .frame(minHeight: Layout.minTap)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Cajitas de \(account.name)")
            }
        }
        .cardStyle()
    }

    private var meta: String {
        var text = account.type.label
        if let institution = account.institution, !institution.isEmpty { text += " · \(institution)" }
        if let last4 = account.last4, !last4.isEmpty { text += " ·· \(last4)" }
        return text
    }
}
