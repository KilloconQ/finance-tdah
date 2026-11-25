import SwiftUI

/// Decides what the person sees: a splash while the session is checked, sign-in, onboarding, or the app.
struct RootView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        Group {
            switch app.phase {
            case .launching:
                ProgressView("Cargando")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Palette.bg)
            case .signedOut:
                AuthFlow()
            case .onboarding:
                OnboardingFlow()
            case .paywall:
                PaywallView()
            case .ready:
                MainTabs()
            case .failed(let message):
                ContentUnavailableView {
                    Label("No pudimos conectar", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(message)
                } actions: {
                    Button("Reintentar") { Task { await app.start() } }
                        .buttonStyle(.cqPrimary)
                        .frame(maxWidth: 240)
                }
                .background(Palette.bg)
            }
        }
        .task { await app.start() }
        .animation(.default, value: app.phase)
    }
}
