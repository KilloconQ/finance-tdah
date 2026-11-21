import CadaQuienKit
import SwiftUI

/// "Ajustes".
struct SettingsView: View {
    @Environment(AppModel.self) private var app
    @AppStorage(ThemePreference.storageKey) private var theme = ThemePreference.system
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: Layout.spacingLarge) {
                BudgetSection()

                SettingsCard(title: "Apariencia", hint: "Se guarda solo en este dispositivo.") {
                    Picker("Tema", selection: $theme) {
                        ForEach(ThemePreference.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                SettingsCard(title: "Privacidad", hint: "Oculta los montos en pantalla (los reemplaza por ••••).") {
                    Toggle("Mostrar saldos", isOn: showBalances)
                        .frame(minHeight: Layout.minTap)
                }

                NotificationsSection()

                if app.push.isRegistered {
                    CalendarAlertsSection()
                }

                if let errorMessage {
                    InlineMessage(.error, errorMessage)
                }

                InviteSection()

                VStack(spacing: Layout.spacing) {
                    Button("Cerrar sesión") { Task { await app.signOut() } }
                        .buttonStyle(.cqGhost)
                    DeleteAccountSection()
                }
                .padding(.top, Layout.spacingSmall)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.bg)
        .navigationTitle("Ajustes")
        .navigationBarTitleDisplayMode(.inline)
    }

    /// A write-through binding: the toggle flips only once the server has accepted the change.
    private var showBalances: Binding<Bool> {
        Binding(
            get: { app.profile?.showBalances ?? true },
            set: { newValue in
                errorMessage = nil
                Task {
                    do { try await app.updateProfile(.init(showBalances: newValue)) } catch {
                        errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar el cambio"
                    }
                }
            }
        )
    }
}
