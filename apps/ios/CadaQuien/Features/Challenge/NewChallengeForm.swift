import CadaQuienKit
import SwiftUI

struct NewChallengeForm: View {
    @Environment(AppModel.self) private var app
    @State private var name = ""
    @State private var details = ""
    @State private var days = 7
    @State private var savings = ""
    @State private var errorMessage: String?
    @State private var isSaving = false

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSection) {
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                Text("Crea un reto").font(.largeTitle.bold()).foregroundStyle(Palette.ink)
                Text("Un hábito pequeño que cambia todo.").foregroundStyle(Palette.inkMid)
            }
            VStack(alignment: .leading, spacing: Layout.spacingLarge) {
                FormField(title: "Nombre del reto", text: $name, prompt: "Ej: No gastar en café")
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    Text("Descripción").font(.subheadline).foregroundStyle(Palette.inkMid)
                    TextField(
                        "Descripción", text: $details, prompt: Text("Ej: Evitar comprar café fuera de casa durante la semana"),
                        axis: .vertical
                    )
                    .lineLimit(3...6)
                    .padding(Layout.spacing)
                    .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
                    .overlay { RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline) }
                }
                Stepper(value: $days, in: 1...30) {
                    HStack {
                        Text("Duración")
                        Spacer()
                        Text(Spanish.days(days)).monospacedDigit().foregroundStyle(Palette.inkMid)
                    }
                }
                .frame(minHeight: Layout.minTap)
                AmountField(text: $savings, title: "Ahorro esperado (en pesos)")
            }
            .cardStyle()
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            Button(isSaving ? "Creando…" : "Empezar reto", action: save)
                .buttonStyle(.cqPrimary)
                .disabled(isSaving)
        }
    }

    private func save() {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "El nombre es obligatorio"
            return
        }
        guard !details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "La descripción es obligatoria"
            return
        }
        var expectedCents = 0
        if !savings.trimmingCharacters(in: .whitespaces).isEmpty {
            switch Money.parse(savings) {
            case .success(let cents): expectedCents = cents
            case .failure(let error):
                errorMessage = error == .invalid ? "El ahorro esperado no es válido" : error.errorDescription
                return
            }
        }
        errorMessage = nil
        isSaving = true
        Task {
            defer { isSaving = false }
            do {
                _ = try await app.services.challenges.create(
                    .init(
                        name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                        description: details.trimmingCharacters(in: .whitespacesAndNewlines),
                        days: days, expectedSavingsCents: expectedCents))
                await app.store.challenge.load()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos crear el reto"
            }
        }
    }
}
