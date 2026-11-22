import CadaQuienKit
import SwiftUI

struct ForgotPasswordView: View {
    @Binding var path: [AuthRoute]
    @Environment(AppModel.self) private var app
    @State private var email = ""
    @State private var errorMessage: String?
    @State private var isSubmitting = false
    @State private var isSent = false

    var body: some View {
        AuthScaffold(title: "¿Olvidaste tu contraseña?", subtitle: "Te mandamos un enlace para restablecerla.") {
            if isSent {
                // Same text for every address, so the screen never reveals which emails have an account.
                InlineMessage(.success, "Si ese correo existe, te mandamos un enlace para restablecer tu contraseña.")
                Text("El enlace abre la página web de Cada Quien, donde eliges la contraseña nueva. Después vuelve aquí y entra.")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMid)
            } else {
                FormField(title: "Correo", text: $email, prompt: "nombre@correo.com")
                    .keyboardType(.emailAddress)
                    .textContentType(.username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                if let errorMessage {
                    InlineMessage(.error, errorMessage)
                }
                Button(isSubmitting ? "Enviando…" : "Enviar enlace", action: submit)
                    .buttonStyle(.cqPrimary)
                    .disabled(isSubmitting)
            }
        } footer: {
            Button("Volver a entrar") { path.removeAll() }
                .font(.subheadline)
                .frame(minHeight: Layout.minTap)
        }
        .navigationBarBackButtonHidden()
    }

    private func submit() {
        guard !isSubmitting else { return }
        guard Validation.isValidEmail(email) else {
            errorMessage = Validation.invalidEmailMessage
            return
        }
        errorMessage = nil
        isSubmitting = true
        Task {
            defer { isSubmitting = false }
            do {
                // The emailed link lands on the web app, which has the reset page.
                let redirect = app.environment.baseURL.appending(path: "auth/reset-password").absoluteString
                try await app.services.auth.requestPasswordReset(email: email, redirectTo: redirect)
                isSent = true
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos procesar el pedido"
            }
        }
    }
}
