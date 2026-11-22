import CadaQuienKit
import SwiftUI

/// The weekly budget: "hoy puedes gastar" comes from it. Saved when the field loses focus.
struct BudgetSection: View {
    @Environment(AppModel.self) private var app
    @State private var text = ""
    @State private var status: String?
    @FocusState private var isFocused: Bool

    var body: some View {
        SettingsCard(
            title: "Presupuesto",
            hint: "Cuánto quieres poder gastar por semana. De aquí sale el “hoy puedes gastar”."
        ) {
            HStack(spacing: Layout.spacingSmall) {
                Text("$").foregroundStyle(Palette.inkSoft).accessibilityHidden(true)
                TextField("Presupuesto semanal", text: $text, prompt: Text("0"))
                    .keyboardType(.decimalPad)
                    .monospacedDigit()
                    .focused($isFocused)
                Text("/ semana").foregroundStyle(Palette.inkMid)
            }
            .padding(.horizontal, Layout.spacing)
            .frame(minHeight: Layout.minTap)
            .background(Palette.bg, in: .rect(cornerRadius: Layout.radiusControl))
            if let status {
                Text(status).font(.footnote).foregroundStyle(Palette.inkMid)
            }
        }
        .onAppear { text = savedText }
        .onChange(of: text) { _, _ in status = nil }
        .onChange(of: isFocused) { _, focused in if !focused { commit() } }
    }

    private var savedText: String {
        Money.editableText(cents: app.profile?.weeklyBudgetCents ?? 0)
    }

    private func commit() {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        // "0" is a valid budget, but the amount parser rejects it, so it is handled here.
        let cents = (trimmed == "0" || trimmed.isEmpty) ? 0 : Money.parseToCents(trimmed)
        guard let cents else {
            text = savedText  // unreadable: put back what is saved
            return
        }
        guard cents != app.profile?.weeklyBudgetCents else { return }
        status = "Guardando…"
        Task {
            do {
                try await app.updateProfile(.init(weeklyBudgetCents: cents))
                text = savedText
                status = "Guardado"
            } catch {
                status = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar el presupuesto"
            }
        }
    }
}
