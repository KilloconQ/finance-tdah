import CadaQuienKit
import SwiftUI

struct InviteMemberSheet: View {
    let groupId: EntityID
    let onDone: () -> Void
    @Environment(AppModel.self) private var app
    @State private var email = ""
    @State private var errorMessage: String?
    @State private var isSending = false
    @State private var isSent = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Layout.spacingLarge) {
                if isSent {
                    // The same message for every address: it never says which emails have an account.
                    InlineMessage(.success, "Si ese email tiene cuenta, le llegará la invitación. Entrará al grupo cuando la acepte.")
                    Button("Listo", action: onDone).buttonStyle(.cqPrimary)
                } else {
                    FormField(title: "Email", text: $email, prompt: "correo@ejemplo.com")
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if let errorMessage { InlineMessage(.error, errorMessage) }
                    Button(isSending ? "Enviando…" : "Enviar invitación", action: send)
                        .buttonStyle(.cqPrimary)
                        .disabled(isSending || email.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                Spacer()
            }
            .padding(Layout.screenPadding)
            .background(Palette.bg)
            .navigationTitle("Invitar miembro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cerrar", action: onDone) } }
        }
    }

    private func send() {
        guard Validation.isValidEmail(email) else {
            errorMessage = "Email inválido"
            return
        }
        isSending = true
        errorMessage = nil
        Task {
            defer { isSending = false }
            do {
                try await app.services.groups.invite(to: groupId, email: email.trimmingCharacters(in: .whitespaces).lowercased())
                isSent = true
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos enviar la invitación"
            }
        }
    }
}
