import CadaQuienKit
import SwiftUI

struct RenameEnvelopeSheet: View {
    let envelope: Envelope
    let onDone: () -> Void
    @Environment(AppModel.self) private var app
    @State private var name: String
    @State private var emoji: String
    @State private var errorMessage: String?
    @State private var isSaving = false

    init(envelope: Envelope, onDone: @escaping () -> Void) {
        self.envelope = envelope
        self.onDone = onDone
        _name = State(initialValue: envelope.name)
        _emoji = State(initialValue: envelope.emoji)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                FormField(title: "Nombre", text: $name)
                EmojiPicker(options: EnvelopeEmoji.options, selection: $emoji)
                if let errorMessage { InlineMessage(.error, errorMessage) }
                Button(isSaving ? "Guardando…" : "Guardar", action: save)
                    .buttonStyle(.cqPrimary)
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(Layout.screenPadding)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg)
        .navigationTitle("Renombrar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancelar", action: onDone) } }
    }

    private func save() {
        errorMessage = nil
        isSaving = true
        Task {
            defer { isSaving = false }
            do {
                _ = try await app.services.envelopes.update(
                    envelope.id, .init(name: String(name.trimmingCharacters(in: .whitespaces).prefix(60)), emoji: emoji))
                await app.store.refreshMoney()
                onDone()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar los cambios"
            }
        }
    }
}
