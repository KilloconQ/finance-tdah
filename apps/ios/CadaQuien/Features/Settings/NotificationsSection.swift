import CadaQuienKit
import SwiftUI
import UIKit

/// "Notificaciones": the phone's permission, the daily reminder, and the hour it arrives.
struct NotificationsSection: View {
    @Environment(AppModel.self) private var app
    @Environment(\.openURL) private var openURL
    @State private var errorMessage: String?

    var body: some View {
        let push = app.push
        SettingsCard(
            title: "Notificaciones",
            hint: "Avisos cuando llegas al presupuesto semanal, completas un frasco o no has anotado nada en el día."
        ) {
            if push.isDenied {
                InlineMessage(.warning, "Las notificaciones están bloqueadas para Cada Quien. Actívalas en Ajustes del iPhone.")
                Button("Abrir Ajustes del iPhone") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
                .buttonStyle(.cqGhost)
            } else {
                Toggle("Activar notificaciones", isOn: pushBinding)
                    .frame(minHeight: Layout.minTap)
            }

            if push.isRegistered {
                Toggle("Recordarme si no anoto nada en el día", isOn: reminderBinding)
                    .frame(minHeight: Layout.minTap)
                if app.profile?.dailyReminderEnabled == true {
                    LabeledContent("A qué hora") {
                        Picker("A qué hora", selection: hourBinding) {
                            ForEach(ReminderHour.all, id: \.self) { Text(ReminderHour.label($0)).tag($0) }
                        }
                        .labelsHidden()
                        .pickerStyle(.menu)
                    }
                    .frame(minHeight: Layout.minTap)
                }
            }

            if let message = push.errorMessage ?? errorMessage {
                InlineMessage(.error, message)
            }
        }
        .task { await push.refresh() }
    }

    // MARK: Bindings

    /// Flips only when the server has taken the change; the registrar reports back through `isRegistered`.
    private var pushBinding: Binding<Bool> {
        Binding(
            get: { app.push.isRegistered },
            set: { isOn in
                errorMessage = nil
                Task {
                    if isOn {
                        await app.push.enable()
                        // The reminder's clock needs this phone's time zone, saved together with turning it on.
                        await save(.init(timeZone: TimeZone.current.identifier))
                    } else {
                        await app.push.disable()
                    }
                }
            })
    }

    private var reminderBinding: Binding<Bool> {
        Binding(
            get: { app.profile?.dailyReminderEnabled ?? true },
            set: { isOn in Task { await save(.init(dailyReminderEnabled: isOn, timeZone: TimeZone.current.identifier)) } })
    }

    private var hourBinding: Binding<Int> {
        Binding(
            get: { app.profile?.dailyReminderHour ?? 21 },
            set: { hour in Task { await save(.init(dailyReminderHour: hour, timeZone: TimeZone.current.identifier)) } })
    }

    private func save(_ update: ProfileService.ProfileUpdate) async {
        do {
            try await app.updateProfile(update)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar el cambio."
        }
    }
}
