import CadaQuienKit
import SwiftUI

/// "Cuánto tienes": net worth with what is locked in envelopes, and every account.
struct AccountsView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator

    var body: some View {
        let store = app.store
        ScrollView {
            VStack(spacing: Layout.spacingSection) {
                if let accounts = store.accounts.value {
                    summary(accounts: accounts, envelopes: store.envelopes.value ?? [], goals: store.goals.value ?? [])
                }
                ResourceSection(title: "Tus cuentas", subject: "tus cuentas", resource: store.accounts) { accounts in
                    if accounts.isEmpty {
                        EmptyBlock(
                            title: "Aún no tienes cuentas", hint: "Agrega la primera para ver tu dinero en un solo lugar.",
                            actionTitle: "Agregar cuenta"
                        ) { navigator.moneyPath.append(.newAccount) }
                    } else {
                        ForEach(accounts) { account in
                            AccountCard(account: account, envelopes: (store.envelopes.value ?? []).filter { $0.accountId == account.id })
                        }
                    }
                }
                Button("Suscripciones", systemImage: "repeat") { navigator.moneyPath.append(.subscriptions) }
                    .buttonStyle(.cqGhost)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.bg)
        .navigationTitle("Cuánto tienes")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Agregar cuenta", systemImage: "plus") { navigator.moneyPath.append(.newAccount) }
            }
        }
        .refreshable { await reload() }
        .task { await load() }
    }

    private func summary(accounts: [Account], envelopes: [Envelope], goals: [Goal]) -> some View {
        let worth = NetWorth(accounts: accounts)
        let locked = EnvelopeRules.lockedCents(accounts: accounts, envelopes: envelopes)
        let goalsTotal = goals.reduce(0) { $0 + $1.currentCents }
        let free = max(0, worth.liquidCents - locked - goalsTotal)
        return VStack(alignment: .leading, spacing: Layout.spacing) {
            Text("Tu dinero realmente disponible").font(.subheadline).foregroundStyle(Palette.inkMid)
            MoneyText(cents: worth.netWorthCents - locked)
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Group {
                if locked > 0 {
                    MoneySentence("tienes ", .money(worth.liquidCents), " · debes ", .money(worth.debtCents), " · 🔒 ", .money(locked), " bloqueado en cajitas")
                } else {
                    MoneySentence("tienes ", .money(worth.liquidCents), " · debes ", .money(worth.debtCents))
                }
            }
            .font(.footnote)
            .foregroundStyle(Palette.inkMid)
            StackedBar(segments: [
                .init(id: "free", label: "libre", weight: Double(free), color: Palette.sage),
                .init(id: "locked", label: "cajitas (bloqueado)", weight: Double(locked), color: Palette.warn),
                .init(id: "jars", label: "frascos", weight: Double(goalsTotal), color: Palette.sageMuted),
                .init(id: "debt", label: "deuda", weight: Double(worth.debtCents), color: Palette.danger),
            ])
        }
        .cardStyle()
    }

    private func load() async {
        let store = app.store
        async let a: Void = store.accounts.loadIfNeeded()
        async let e: Void = store.envelopes.loadIfNeeded()
        async let g: Void = store.goals.loadIfNeeded()
        _ = await (a, e, g)
    }

    private func reload() async {
        let store = app.store
        async let a: Void = store.accounts.load()
        async let e: Void = store.envelopes.load()
        async let g: Void = store.goals.load()
        _ = await (a, e, g)
    }
}
