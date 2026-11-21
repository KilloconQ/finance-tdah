import CadaQuienKit
import SwiftUI

/// The first jar on the home screen, or an invitation to create one.
struct GoalCard: View {
    let resource: Resource<[Goal]>
    @Environment(Navigator.self) private var navigator

    var body: some View {
        Group {
            if let goal = resource.value?.first {
                filled(goal)
            } else if resource.value != nil {
                empty
            } else if resource.errorMessage != nil {
                EmptyView()
            } else {
                RoundedRectangle(cornerRadius: Layout.radiusCard)
                    .fill(Palette.bgAlt)
                    .frame(height: 112)
                    .accessibilityHidden(true)
            }
        }
    }

    private func filled(_ goal: Goal) -> some View {
        let progress = JarProgress(currentCents: goal.currentCents, targetCents: goal.targetCents)
        return HStack(spacing: Layout.spacingLarge) {
            JarView(fraction: progress.fraction, emoji: goal.emoji)
                .frame(width: 56, height: 76)
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text("\(goal.emoji) \(goal.name) · frasco")
                    .font(.subheadline.bold())
                    .foregroundStyle(Palette.ink)
                HStack(spacing: 0) {
                    MoneyText(cents: goal.currentCents)
                    Text(" / ")
                    MoneyText(cents: goal.targetCents)
                }
                .font(.footnote)
                .foregroundStyle(Palette.inkMid)
            }
            Spacer()
            Button("Echar") { navigator.open(.goal(goal.id), in: .money) }
                .buttonStyle(.cqGhost)
                .frame(width: 96)
                .accessibilityLabel("Echar al frasco")
        }
        .cardStyle()
    }

    private var empty: some View {
        VStack(spacing: Layout.spacing) {
            Text("Aún no tienes un frasco").font(.headline).foregroundStyle(Palette.ink)
            Text("Crea un frasco para empezar a guardar.").font(.subheadline).foregroundStyle(Palette.inkMid)
            Button("Crear frasco") { navigator.open(.newGoal, in: .money) }
                .buttonStyle(.cqPrimary)
        }
        .multilineTextAlignment(.center)
        .cardStyle()
    }
}
