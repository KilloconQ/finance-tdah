import CadaQuienKit
import SwiftUI

/// "Suscripciones": what you pay for, and what you pay for without using.
struct SubscriptionsView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator

    var body: some View {
        ResourceView(resource: app.store.subscriptions) { subscriptions in
            if subscriptions.isEmpty {
                ContentUnavailableView {
                    Label("Aún no sigues ninguna suscripción", systemImage: "repeat")
                } description: {
                    Text("Agrega las que pagas cada mes y detecta las que ya no usas.")
                } actions: {
                    Button("Agregar suscripción") { navigator.moneyPath.append(.newSubscription) }
                        .buttonStyle(.cqPrimary)
                        .frame(maxWidth: 280)
                }
            } else {
                list(subscriptions)
            }
        }
        .background(Palette.bg)
        .navigationTitle("Suscripciones")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Nueva suscripción", systemImage: "plus") { navigator.moneyPath.append(.newSubscription) }
            }
        }
        .refreshable { await app.store.subscriptions.load() }
    }

    private func list(_ subscriptions: [Subscription]) -> some View {
        let unused = subscriptions.filter(\.unused)
        let active = subscriptions.filter { !$0.unused }
        return ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                if !unused.isEmpty { loss(unused) }
                if !unused.isEmpty {
                    VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                        SectionHeader("\(unused.count) que no usas")
                        ForEach(unused) { subscription in
                            NavigationRow(route: .subscription(subscription.id)) {
                                row(subscription, subtitle: lastUsed(subscription))
                            } trailing: {
                                Text("Cancelar")
                                    .font(.subheadline)
                                    .foregroundStyle(Palette.danger)
                                    .padding(.horizontal, Layout.spacing)
                                    .frame(minHeight: Layout.minTap)
                                    .background(Palette.dangerBg, in: .capsule)
                            }
                        }
                    }
                }
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    SectionHeader("Activas · \(active.count)")
                    if active.isEmpty {
                        Text("No tienes suscripciones activas.").foregroundStyle(Palette.inkMid)
                    }
                    ForEach(active) { subscription in
                        NavigationRow(route: .subscription(subscription.id)) {
                            row(subscription, subtitle: subscription.category)
                        } trailing: {
                            MoneyText(cents: subscription.amountCents).foregroundStyle(Palette.ink)
                        }
                    }
                }
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }

    private func loss(_ unused: [Subscription]) -> some View {
        let monthly = unused.reduce(0) { $0 + SubscriptionCost.monthly(amountCents: $1.amountCents, cadence: $1.cadence) }
        let yearly = unused.reduce(0) { $0 + SubscriptionCost.yearly(amountCents: $1.amountCents, cadence: $1.cadence) }
        return VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text("Estás perdiendo al mes").font(.subheadline).foregroundStyle(Palette.danger)
            MoneyText(cents: monthly).font(.system(.largeTitle, weight: .semibold)).foregroundStyle(Palette.danger)
            if !app.hidesBalances {
                HStack(spacing: 0) {
                    Text("Al año: ")
                    MoneyText(cents: yearly)
                }
                .font(.subheadline)
                .foregroundStyle(Palette.inkMid)
            }
        }
        .cardStyle()
    }

    private func row(_ subscription: Subscription, subtitle: String) -> some View {
        HStack(spacing: Layout.spacing) {
            AvatarView(name: subscription.name)
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text(subscription.name).foregroundStyle(Palette.ink)
                Text(subtitle).font(.footnote).foregroundStyle(Palette.inkMid)
            }
        }
    }

    private func lastUsed(_ subscription: Subscription) -> String {
        guard let last = subscription.lastOpenedAt else { return "nunca abierto" }
        return "hace \(Spanish.days(max(0, CalendarDay(Date()).days(since: last))))"
    }
}
