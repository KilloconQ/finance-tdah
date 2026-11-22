import CadaQuienKit
import SwiftUI

/// Four short steps, one question each. Nothing is sent until the last one.
struct OnboardingFlow: View {
    @Environment(AppModel.self) private var app
    @State private var step = 1
    @State private var draft = OnboardingDraft.load()
    @State private var errorMessage: String?
    @State private var isSaving = false

    private let totalSteps = 4

    var body: some View {
        VStack(spacing: Layout.spacingLarge) {
            header
            Group {
                switch step {
                case 1: OnboardingWelcomeStep(next: { step = 2 })
                case 2: OnboardingPainStep(draft: $draft, next: { step = 3 })
                case 3: OnboardingGoalStep(draft: $draft, next: { step = 4 })
                default: OnboardingDoneStep(errorMessage: errorMessage, isSaving: isSaving, finish: finish)
                }
            }
            .frame(maxWidth: 560)
        }
        .padding(Layout.screenPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.bg)
        .onChange(of: draft) { _, newValue in newValue.save() }
    }

    private var header: some View {
        HStack {
            if step > 1 {
                Button("Volver", systemImage: "chevron.backward") { step -= 1 }
                    .labelStyle(.iconOnly)
                    .frame(minWidth: Layout.minTap, minHeight: Layout.minTap)
            } else {
                Color.clear.frame(width: Layout.minTap, height: Layout.minTap)
            }
            Spacer()
            VStack(spacing: Layout.spacingTight) {
                Text("\(step) / \(totalSteps)")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkSoft)
                    .monospacedDigit()
                StepDots(count: totalSteps, filled: step)
            }
            Spacer()
            Color.clear.frame(width: Layout.minTap, height: Layout.minTap)
        }
    }

    private func finish() {
        guard !isSaving, let user = app.user else { return }
        isSaving = true
        errorMessage = nil
        let trimmed = user.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let displayName = trimmed.isEmpty ? "Tú" : String(trimmed.prefix(60))
        let goal = draft.goalPreset.map {
            ProfileService.Onboarding.FirstGoal(name: $0.name, emoji: $0.emoji, targetCents: $0.targetCents)
        }
        Task {
            defer { isSaving = false }
            do {
                try await app.completeOnboarding(
                    .init(displayName: displayName, pain: draft.pain, inputPreference: .manual, firstGoal: goal))
                OnboardingDraft.clear()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar tu setup"
            }
        }
    }
}
