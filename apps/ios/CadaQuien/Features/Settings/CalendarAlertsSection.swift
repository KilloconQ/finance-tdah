import CadaQuienKit
import SwiftUI

/// "Avisos del calendario": for each kind of event, whether to be told, how many days before and at what hour.
struct CalendarAlertsSection: View {
    @Environment(AppModel.self) private var app
    @State private var rules: [NotificationRule] = []
    @State private var didLoad = false
    @State private var errorMessage: String?

    var body: some View {
        SettingsCard(
            title: "Avisos del calendario",
            hint: "Cobros, cortes y pagos de tarjeta y suscripciones. Elige cuándo te avisamos de cada uno."
        ) {
            ForEach($rules) { $rule in
                RuleRow(rule: $rule) { save(rule) }
            }
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
        }
        .task {
            guard !didLoad else { return }
            do {
                rules = try await app.services.notificationRules.list()
                didLoad = true
            } catch {
                errorMessage = "No pudimos cargar tus avisos del calendario."
            }
        }
    }

    private func save(_ rule: NotificationRule) {
        errorMessage = nil
        Task {
            do {
                try await app.services.notificationRules.save(rule)
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar el cambio."
            }
        }
    }
}

private struct RuleRow: View {
    @Binding var rule: NotificationRule
    let onChange: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Toggle(rule.kind.label, isOn: $rule.enabled)
                .frame(minHeight: Layout.minTap)
            if rule.enabled {
                LabeledContent("Cuándo") {
                    Picker("Cuándo", selection: $rule.daysBefore) {
                        ForEach(rule.daysChoices(), id: \.self) { Text(NotificationRule.daysLabel($0)).tag($0) }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                }
                .frame(minHeight: Layout.minTap)
                LabeledContent("A qué hora") {
                    Picker("A qué hora", selection: $rule.hour) {
                        ForEach(ReminderHour.all, id: \.self) { Text(ReminderHour.label($0)).tag($0) }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                }
                .frame(minHeight: Layout.minTap)
            }
        }
        .onChange(of: rule) { _, _ in onChange() }
    }
}
