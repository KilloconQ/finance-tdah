import CadaQuienKit
import SwiftUI

/// Registration is invite-only: this sends someone the link to create their account.
struct InviteSection: View {
    @Environment(AppModel.self) private var app
    @State private var email = ""
    @State private var status: String?
    @State private var errorMessage: String?
    @State private var isSending = false

    var body: some View {
        SettingsCard(
            title: "Invita a alguien",
            hint: "Le mandamos un correo con el enlace para crear su cuenta en Cada Quien."
        ) {
            TextField("Correo de quien quieres invitar", text: $email, prompt: Text("correo@ejemplo.com"))
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(.horizontal, Layout.spacing)
                .frame(minHeight: Layout.minTap)
                .background(Palette.bg, in: .rect(cornerRadius: Layout.radiusControl))
                .onChange(of: email) { _, _ in
                    status = nil
                    errorMessage = nil
                }
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            if let status {
                InlineMessage(.success, status)
            }
            Button(isSending ? "Enviando…" : "Enviar invitación", action: send)
                .buttonStyle(.cqGhost)
                .disabled(isSending || email.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private func send() {
        guard Validation.isValidEmail(email) else {
            errorMessage = Validation.invalidEmailMessage
            return
        }
        isSending = true
        Task {
            defer { isSending = false }
            do {
                try await app.services.invitations.inviteToApp(email: email.trimmingCharacters(in: .whitespaces))
                email = ""
                status = "Listo. Si esa persona aún no tiene cuenta, le llegará la invitación."
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos enviar la invitación"
            }
        }
    }
}
