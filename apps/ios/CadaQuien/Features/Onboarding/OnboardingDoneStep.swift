import SwiftUI

struct OnboardingDoneStep: View {
    let errorMessage: String?
    let isSaving: Bool
    let finish: () -> Void

    var body: some View {
        VStack(spacing: Layout.spacingSection) {
            Spacer()
            Text("🌿").font(.system(size: 72)).accessibilityHidden(true)
            VStack(spacing: Layout.spacingSmall) {
                Text("Listo.\nVamos a ir paso a paso.")
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.ink)
                Text("Cero tableros. Una pregunta por pantalla.")
                    .foregroundStyle(Palette.inkMid)
            }
            Spacer()
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            Button(isSaving ? "Guardando…" : "Empezar", action: finish)
                .buttonStyle(.cqPrimary)
                .disabled(isSaving)
        }
    }
}
