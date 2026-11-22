import CadaQuienKit
import SwiftUI

/// "Dinero": accounts, jars and subscriptions at a glance.
struct MoneyView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator

    var body: some View {
        let store = app.store
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: Layout.spacingSection) {
                    tiles(store, proxy: proxy)

                    ResourceSection(
                        title: "Cuentas", subject: "tus cuentas", resource: store.accounts,
                        onSeeAll: { navigator.moneyPath.append(.accounts) }
                    ) { accounts in
                        if accounts.isEmpty {
                            EmptyBlock(
                                title: "Aún no tienes cuentas", hint: "Agrega tu tarjeta o tu efectivo para saber cuánto tienes.",
                                actionTitle: "Agregar cuenta"
                            ) { navigator.moneyPath.append(.newAccount) }
                        } else {
                            ForEach(accounts) { account in
                                NavigationRow(route: .editAccount(account.id)) {
                                    Text(account.name).foregroundStyle(Palette.ink)
                                } trailing: {
                                    MoneyText(cents: account.balanceCents)
                                        .foregroundStyle(account.balanceCents < 0 ? Palette.danger : Palette.ink)
                                }
                            }
                        }
                    }
                    .id("accounts")

                    ResourceSection(
                        title: "Frascos", subject: "tus frascos", resource: store.goals,
                        onSeeAll: { navigator.moneyPath.append(.goals) }
                    ) { goals in
                        if goals.isEmpty {
                            EmptyBlock(
                                title: "Aún no tienes un frasco", hint: "Crea un frasco para empezar a guardar.",
                                actionTitle: "Crear frasco"
                            ) { navigator.moneyPath.append(.newGoal) }
                        } else {
                            ForEach(goals) { goal in
                                NavigationRow(route: .goal(goal.id)) {
                                    VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                                        Text("\(goal.emoji) \(goal.name)").foregroundStyle(Palette.ink)
                                        MoneySentence(.money(goal.currentCents), " / ", .money(goal.targetCents))
                                        .font(.footnote)
                                        .foregroundStyle(Palette.inkMid)
                                        ProgressView(value: JarProgress(currentCents: goal.currentCents, targetCents: goal.targetCents).fraction)
                                            .tint(Palette.sage)
                                    }
                                } trailing: {
                                    EmptyView()
                                }
                            }
                        }
                    }
                    .id("goals")

                    ResourceSection(
                        title: "Suscripciones", subject: "tus suscripciones", resource: store.subscriptions,
                        onSeeAll: { navigator.moneyPath.append(.subscriptions) }
                    ) { subscriptions in
                        if subscriptions.isEmpty {
                            EmptyBlock(
                                title: "Aún no sigues ninguna suscripción",
                                hint: "Agrega las que pagas cada mes y detecta las que ya no usas.",
                                actionTitle: "Agregar suscripción"
                            ) { navigator.moneyPath.append(.newSubscription) }
                        } else {
                            ForEach(subscriptions) { subscription in
                                NavigationRow(route: .subscription(subscription.id)) {
                                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                                        Text(subscription.name).foregroundStyle(Palette.ink)
                                        if subscription.unused {
                                            Text("Sin usar").font(.footnote).foregroundStyle(Palette.warn)
                                        }
                                    }
                                } trailing: {
                                    MoneySentence(.money(SubscriptionCost.monthly(amountCents: subscription.amountCents, cadence: subscription.cadence)), "/mes")
                                        .foregroundStyle(Palette.inkMid)
                                }
                            }
                        }
                    }
                    .id("subscriptions")
                }
                .padding(Layout.screenPadding)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
        }
        .background(Palette.bg)
        .navigationTitle("Dinero")
        .refreshable { await reload() }
        .task { await loadAll() }
    }

    // MARK: Tiles

    private func tiles(_ store: DataStore, proxy: ScrollViewProxy) -> some View {
        HStack(spacing: Layout.spacingSmall) {
            tile(title: "Cuentas", cents: store.accounts.value.map { NetWorth(accounts: $0).liquidCents }, failed: store.accounts.errorMessage != nil && store.accounts.value == nil) {
                if let accounts = store.accounts.value {
                    let worth = NetWorth(accounts: accounts)
                    if worth.debtCents > 0 {
                        MoneySentence("debes ", .money(worth.debtCents))
                            .foregroundStyle(Palette.danger)
                    } else {
                        Text(accounts.count == 1 ? "1 cuenta" : "\(accounts.count) cuentas")
                    }
                }
            } scrollTo: { proxy.scrollTo("accounts", anchor: .top) }

            tile(title: "Frascos", cents: store.goals.value.map { $0.reduce(0) { $0 + $1.currentCents } }, failed: store.goals.errorMessage != nil && store.goals.value == nil) {
                if let goals = store.goals.value {
                    Text(goals.count == 1 ? "1 frasco" : "\(goals.count) frascos")
                }
            } scrollTo: { proxy.scrollTo("goals", anchor: .top) }

            tile(title: "Suscripciones", cents: store.subscriptions.value.map { subs in subs.reduce(0) { $0 + SubscriptionCost.monthly(amountCents: $1.amountCents, cadence: $1.cadence) } }, failed: store.subscriptions.errorMessage != nil && store.subscriptions.value == nil) {
                if let subs = store.subscriptions.value { Text("al mes · \(subs.count)") }
            } scrollTo: { proxy.scrollTo("subscriptions", anchor: .top) }
        }
    }

    private func tile<Detail: View>(
        title: String, cents: Int?, failed: Bool, @ViewBuilder detail: () -> Detail, scrollTo: @escaping () -> Void
    ) -> some View {
        Button(action: scrollTo) {
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text(title).font(.footnote).foregroundStyle(Palette.inkMid).lineLimit(1)
                if failed {
                    Text("—").font(.headline).foregroundStyle(Palette.inkSoft)
                    Text("No cargó").font(.caption).foregroundStyle(Palette.inkSoft)
                } else if let cents {
                    MoneyText(cents: cents).font(.headline).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.7)
                    detail().font(.caption).foregroundStyle(Palette.inkMid).lineLimit(1)
                } else {
                    Text("…").font(.headline).foregroundStyle(Palette.inkSoft)
                }
            }
            .padding(Layout.spacing)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay { RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline) }
        }
        .buttonStyle(.plain)
    }

    private func loadAll() async {
        let store = app.store
        async let a: Void = store.accounts.loadIfNeeded()
        async let g: Void = store.goals.loadIfNeeded()
        async let s: Void = store.subscriptions.loadIfNeeded()
        _ = await (a, g, s)
    }

    private func reload() async {
        let store = app.store
        async let a: Void = store.accounts.load()
        async let g: Void = store.goals.load()
        async let s: Void = store.subscriptions.load()
        _ = await (a, g, s)
    }
}
