import CadaQuienKit
import SwiftUI

struct SignInView: View {
    @Binding var path: [AuthRoute]
    @Environment(AppModel.self) private var app
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        AuthScaffold(title: "Hola de nuevo 👋", subtitle: "Entra con tu correo y contraseña.") {
            FormField(title: "Correo", text: $email, prompt: "nombre@correo.com")
                .keyboardType(.emailAddress)
                .textContentType(.username)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            FormField(title: "Contraseña", text: $password, isSecure: true)
                .textContentType(.password)
            Button("¿Olvidaste tu contraseña?") { path.append(.forgotPassword) }
                .font(.subheadline)
                .frame(maxWidth: .infinity, minHeight: Layout.minTap, alignment: .trailing)
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            Button(isSubmitting ? "Entrando…" : "Entrar", action: submit)
                .buttonStyle(.cqPrimary)
                .disabled(isSubmitting)
        } footer: {
            HStack {
                Text("¿Primera vez?").foregroundStyle(Palette.inkMid)
                Button("Crear cuenta") { path.append(.signUp) }
                    .frame(minHeight: Layout.minTap)
            }
            .font(.subheadline)
        }
        .navigationBarHidden(true)
    }

    private func submit() {
        guard !isSubmitting else { return }
        guard Validation.isValidEmail(email) else {
            errorMessage = Validation.invalidEmailMessage
            return
        }
        guard !password.isEmpty else {
            errorMessage = "Escribe tu contraseña."
            return
        }
        errorMessage = nil
        isSubmitting = true
        Task {
            defer { isSubmitting = false }
            do {
                try await app.signIn(email: email, password: password)
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos entrar"
            }
        }
    }
}
