import CadaQuienKit
import SwiftUI

struct OnboardingGoalStep: View {
    @Binding var draft: OnboardingDraft
    let next: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingLarge) {
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                Text("Empecemos con\nun solo frasco.")
                    .font(.largeTitle.bold())
                    .foregroundStyle(Palette.ink)
                    .accessibilityAddTraits(.isHeader)
                Text("Algo cortito. Algo que de verdad quieras.")
                    .foregroundStyle(Palette.inkMid)
            }
            HStack {
                Spacer()
                JarView(fraction: 0.15, emoji: draft.goalPreset?.emoji ?? "🌿")
                    .frame(width: 80, height: 104)
                Spacer()
            }
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Layout.spacing) {
                ForEach(Array(OnboardingContent.goalPresets.enumerated()), id: \.element.id) { index, preset in
                    presetCard(preset, isSelected: draft.goalPresetIndex == index) { draft.goalPresetIndex = index }
                }
            }
            Spacer()
            VStack(spacing: Layout.spacingSmall) {
                Button("Crear frasco", action: next)
                    .buttonStyle(.cqPrimary)
                    .disabled(draft.goalPreset == nil)
                Button("Después") {
                    draft.goalPresetIndex = nil
                    next()
                }
                .buttonStyle(.cqGhost)
            }
        }
    }

    private func presetCard(_ preset: OnboardingContent.GoalPreset, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text("\(preset.emoji) \(preset.name)")
                    .font(.subheadline.bold())
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.leading)
                Text(Money.format(cents: preset.targetCents))
                    .font(.footnote)
                    .monospacedDigit()
                    .foregroundStyle(Palette.inkMid)
            }
            .padding(Layout.spacing)
            .frame(maxWidth: .infinity, minHeight: Layout.minTap * 1.5, alignment: .leading)
            .background(isSelected ? Palette.sageBg : Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay {
                RoundedRectangle(cornerRadius: Layout.radiusControl)
                    .stroke(isSelected ? Palette.sageMuted : Palette.line, lineWidth: Layout.hairline)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
