import CadaQuienKit
import SwiftUI

/// "Frascos": every goal you are saving for.
struct GoalsView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator

    var body: some View {
        ResourceView(resource: app.store.goals) { goals in
            if goals.isEmpty {
                ContentUnavailableView {
                    Label("Aún no tienes frascos", systemImage: "leaf")
                } description: {
                    Text("Crea tu primer frasco y empieza a guardar para lo que te importa.")
                } actions: {
                    Button("Crear frasco") { navigator.moneyPath.append(.newGoal) }
                        .buttonStyle(.cqPrimary)
                        .frame(maxWidth: 280)
                }
            } else {
                list(goals)
            }
        }
        .background(Palette.bg)
        .navigationTitle("Frascos")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Nuevo frasco", systemImage: "plus") { navigator.moneyPath.append(.newGoal) }
            }
        }
        .refreshable { await app.store.goals.load() }
    }

    private func list(_ goals: [Goal]) -> some View {
        ScrollView {
            VStack(spacing: Layout.spacingLarge) {
                VStack(spacing: Layout.spacingTight) {
                    MoneyText(cents: goals.reduce(0) { $0 + $1.currentCents })
                        .font(.system(.largeTitle, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                    Text("guardado en \(goals.count == 1 ? "1 frasco" : "\(goals.count) frascos")")
                        .font(.subheadline)
                        .foregroundStyle(Palette.inkMid)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Layout.spacingLarge)
                ForEach(goals) { goal in
                    let progress = JarProgress(currentCents: goal.currentCents, targetCents: goal.targetCents)
                    NavigationLink(value: Route.goal(goal.id)) {
                        HStack(spacing: Layout.spacingLarge) {
                            JarView(fraction: progress.fraction, emoji: goal.emoji).frame(width: 64, height: 84)
                            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                                Text("\(goal.emoji) \(goal.name)").font(.body.bold()).foregroundStyle(Palette.ink)
                                MoneySentence(.money(goal.currentCents), " / ", .money(goal.targetCents))
                                .font(.footnote)
                                .foregroundStyle(Palette.inkMid)
                                Text("\(Int(progress.percent.rounded()))%")
                                    .font(.footnote)
                                    .foregroundStyle(Palette.sageStrong)
                                    .monospacedDigit()
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Palette.inkSoft).accessibilityHidden(true)
                        }
                        .cardStyle()
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}
