import CadaQuienKit
import SwiftUI

/// One subscription: what it costs, how long since you used it, and the choice to cancel, pause or keep it.
struct SubscriptionDetailScreen: View {
    let subscriptionId: EntityID
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator
    @Environment(\.dismiss) private var dismiss
    @State private var working: Action?
    @State private var errorMessage: String?

    private enum Action { case cancel, pause }

    var body: some View {
        ResourceView(resource: app.store.subscriptions) { subscriptions in
            if let subscription = subscriptions.first(where: { $0.id == subscriptionId }) {
                content(subscription)
            } else {
                ContentUnavailableView {
                    Label("No encontramos esa suscripción", systemImage: "questionmark.folder")
                } description: {
                    Text("Puede que la hayas cancelado o que el enlace esté roto.")
                } actions: {
                    Button("Volver a suscripciones") { dismiss() }.buttonStyle(.cqGhost).frame(maxWidth: 280)
                }
            }
        }
        .background(Palette.bg)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Editar", systemImage: "pencil") { navigator.moneyPath.append(.editSubscription(subscriptionId)) }
            }
        }
    }

    private func content(_ subscription: Subscription) -> some View {
        let daysSinceUse = subscription.lastOpenedAt.map { max(0, CalendarDay(Date()).days(since: $0)) }
        return ScrollView {
            VStack(spacing: Layout.spacingSection) {
                VStack(spacing: Layout.spacingSmall) {
                    AvatarView(name: subscription.name, size: 72)
                    Text(subscription.name).font(.title.bold()).foregroundStyle(Palette.ink)
                    MoneySentence(.money(subscription.amountCents), subscription.cadence == .monthly ? " / mes" : " / año")
                        .foregroundStyle(Palette.inkMid)
                }
                usage(subscription, daysSinceUse: daysSinceUse)
                if let errorMessage { InlineMessage(.error, errorMessage) }
                VStack(spacing: Layout.spacing) {
                    Button(working == .cancel ? "Cancelando…" : "Cancelar suscripción") { run(.cancel, subscription) }
                        .buttonStyle(.cqDanger)
                    Button(working == .pause ? "Pausando…" : "Pausar 1 mes") { run(.pause, subscription) }
                        .buttonStyle(.cqGhost)
                    Button("La sigo necesitando") { dismiss() }
                        .frame(minHeight: Layout.minTap)
                }
                .disabled(working != nil)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .navigationTitle(subscription.name)
    }

    @ViewBuilder private func usage(_ subscription: Subscription, daysSinceUse: Int?) -> some View {
        if subscription.unused, let days = daysSinceUse {
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                Text("No la abres hace \(Spanish.days(days))").font(.headline).foregroundStyle(Palette.danger)
                if days > 0, !app.hidesBalances {
                    MoneySentence("Llevas ", .money(SubscriptionCost.over(days: days, amountCents: subscription.amountCents, cadence: subscription.cadence)), " pagados desde la última vez que la usaste.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkMid)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Layout.cardPadding)
            .background(Palette.dangerBg, in: .rect(cornerRadius: Layout.radiusCard))
        } else {
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                Text(daysSinceUse.map { "La usaste hace \(Spanish.days($0))." } ?? "No tenemos registro de uso aún.")
                    .foregroundStyle(Palette.ink)
                Text("Próximo cobro: \(DayFormat.short(subscription.nextChargeAt))")
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkMid)
            }
            .cardStyle()
        }
    }

    private func run(_ action: Action, _ subscription: Subscription) {
        working = action
        errorMessage = nil
        Task {
            defer { working = nil }
            do {
                switch action {
                case .cancel:
                    _ = try await app.services.subscriptions.cancel(subscription.id)
                    await app.store.refreshSubscriptions()
                    dismiss()
                case .pause:
                    _ = try await app.services.subscriptions.pause(subscription.id)
                    await app.store.refreshSubscriptions()
                }
            } catch {
                errorMessage =
                    (error as? LocalizedError)?.errorDescription
                    ?? (action == .cancel ? "No pudimos cancelar la suscripción" : "No pudimos pausar la suscripción")
            }
        }
    }
}
