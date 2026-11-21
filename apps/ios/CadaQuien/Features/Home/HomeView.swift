import CadaQuienKit
import SwiftUI

/// "Hoy": what you can spend today, the week so far, your first jar and the current challenge.
struct HomeView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator

    var body: some View {
        let store = app.store
        ScrollView {
            VStack(spacing: Layout.spacingSection) {
                greeting(store.summary.value)
                hero(store.summary.value)
                if let message = store.summary.errorMessage, store.summary.value == nil {
                    InlineMessage(.warning, message)
                }
                GoalCard(resource: store.goals)
                if let summary = store.summary.value {
                    HStack(spacing: Layout.spacing) {
                        MiniStat(title: "gastado", cents: summary.weekSpentCents)
                        MiniStat(title: "presupuesto", cents: summary.weekTargetCents)
                    }
                }
                ChallengeLinkCard(resource: store.challenge)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.bg)
        .navigationTitle("Hoy")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Ajustes", systemImage: "gearshape") { navigator.todayPath.append(.settings) }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Modo pánico", systemImage: "lifepreserver") { navigator.isShowingPanic = true }
            }
        }
        .safeAreaInset(edge: .bottom) {
            Button("Movimiento", systemImage: "plus") { navigator.isAddingExpense = true }
                .buttonStyle(.cqPrimary)
                .padding(.horizontal, Layout.screenPadding)
                .padding(.bottom, Layout.spacingSmall)
                .frame(maxWidth: 640)
        }
        .refreshable { await reload() }
        .task { await loadAll() }
    }

    private func greeting(_ summary: HomeSummary?) -> some View {
        Text(summary.map { "\($0.greeting) 👋" } ?? " ")
            .font(.title3)
            .foregroundStyle(Palette.inkMid)
            .frame(maxWidth: .infinity)
            .redacted(reason: summary == nil ? .placeholder : [])
    }

    private func hero(_ summary: HomeSummary?) -> some View {
        let weekLeft = max(0, (summary?.weekTargetCents ?? 0) - (summary?.weekSpentCents ?? 0))
        return VStack(spacing: Layout.spacingSmall) {
            Text("Hoy puedes gastar")
                .font(.subheadline)
                .foregroundStyle(Palette.inkMid)
            MoneyText(cents: summary?.todayAvailableCents ?? 0)
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            if let summary {
                HStack(spacing: 0) {
                    MoneyText(cents: summary.weekSpentCents)
                    Text(" esta semana · te faltan ")
                    MoneyText(cents: weekLeft)
                }
                .font(.subheadline)
                .foregroundStyle(Palette.inkMid)
                .accessibilityElement(children: .combine)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Layout.spacingLarge)
    }

    private func loadAll() async {
        let store = app.store
        async let summary: Void = store.summary.loadIfNeeded()
        async let goals: Void = store.goals.loadIfNeeded()
        async let challenge: Void = store.challenge.loadIfNeeded()
        _ = await (summary, goals, challenge)
    }

    private func reload() async {
        let store = app.store
        async let summary: Void = store.summary.load()
        async let goals: Void = store.goals.load()
        async let challenge: Void = store.challenge.load()
        _ = await (summary, goals, challenge)
    }
}
