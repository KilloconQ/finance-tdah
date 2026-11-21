import CadaQuienKit
import SwiftUI

struct SignUpView: View {
    @Binding var path: [AuthRoute]
    @Environment(AppModel.self) private var app
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        AuthScaffold(title: "Vamos a empezar", subtitle: "Solo lo mínimo para arrancar.") {
            FormField(title: "Tu nombre", text: $name)
                .textContentType(.name)
            FormField(title: "Correo", text: $email, prompt: "nombre@correo.com")
                .keyboardType(.emailAddress)
                .textContentType(.username)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            FormField(title: "Contraseña", text: $password, isSecure: true, helper: "Mínimo 8 caracteres.")
                .textContentType(.newPassword)
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            Button(isSubmitting ? "Creando…" : "Crear cuenta", action: submit)
                .buttonStyle(.cqPrimary)
                .disabled(isSubmitting)
        } footer: {
            HStack {
                Text("¿Ya tienes cuenta?").foregroundStyle(Palette.inkMid)
                Button("Entrar") { path.removeAll() }
                    .frame(minHeight: Layout.minTap)
            }
            .font(.subheadline)
        }
        .navigationBarBackButtonHidden()
    }

    private func submit() {
        guard !isSubmitting else { return }
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Escribe tu nombre."
            return
        }
        guard Validation.isValidEmail(email) else {
            errorMessage = Validation.invalidEmailMessage
            return
        }
        guard Validation.isValidPassword(password) else {
            errorMessage = Validation.shortPasswordMessage
            return
        }
        errorMessage = nil
        isSubmitting = true
        Task {
            defer { isSubmitting = false }
            do {
                try await app.signUp(email: email, password: password, name: name)
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos crear tu cuenta"
            }
        }
    }
}
