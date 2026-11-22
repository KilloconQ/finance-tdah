import CadaQuienKit
import SwiftUI

struct CreateGroupSheet: View {
    let onDone: () -> Void
    @Environment(AppModel.self) private var app
    @State private var name = ""
    @State private var errorMessage: String?
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Layout.spacingLarge) {
                FormField(title: "Nombre", text: $name, prompt: "Ej: Viaje a la playa")
                if let errorMessage { InlineMessage(.error, errorMessage) }
                Button(isSaving ? "Creando…" : "Crear grupo", action: create)
                    .buttonStyle(.cqPrimary)
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
                Spacer()
            }
            .padding(Layout.screenPadding)
            .background(Palette.bg)
            .navigationTitle("Nuevo grupo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancelar", action: onDone) } }
        }
    }

    private func create() {
        isSaving = true
        errorMessage = nil
        Task {
            defer { isSaving = false }
            do {
                _ = try await app.services.groups.create(name: String(name.trimmingCharacters(in: .whitespaces).prefix(80)))
                await app.store.groups.load()
                onDone()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos crear el grupo"
            }
        }
    }
}
