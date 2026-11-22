import SwiftUI

struct OnboardingWelcomeStep: View {
    let next: () -> Void

    var body: some View {
        VStack(spacing: Layout.spacingSection) {
            Spacer()
            JarView(fraction: 0.6)
                .frame(width: 96, height: 128)
            VStack(spacing: Layout.spacingSmall) {
                Text("Tus finanzas,\nsin la pereza.")
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.ink)
                Text("Diseñada para mentes TDAH. Una pregunta por pantalla, y nada de tableros densos.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.inkMid)
            }
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                Label("Frascos visuales para ahorrar", systemImage: "leaf")
                Label("Sin juicios, en segunda persona", systemImage: "heart")
            }
            .font(.subheadline)
            .foregroundStyle(Palette.inkMid)
            Spacer()
            Button("Empezar", action: next)
                .buttonStyle(.cqPrimary)
        }
    }
}
