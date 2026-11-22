import SwiftUI

/// Deleting the account erases everything, so it asks first, and it says out loud if it fails.
struct DeleteAccountSection: View {
    @Environment(AppModel.self) private var app
    @State private var isConfirming = false
    @State private var isDeleting = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: Layout.spacing) {
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            Button(isDeleting ? "Borrando…" : "Borrar cuenta") { isConfirming = true }
                .buttonStyle(.cqDanger)
                .disabled(isDeleting)
                .confirmationDialog("¿Estás seguro?", isPresented: $isConfirming, titleVisibility: .visible) {
                    Button("Confirmar", role: .destructive, action: delete)
                    Button("Cancelar", role: .cancel) {}
                } message: {
                    Text("Se borrarán tu cuenta, tus gastos, frascos y suscripciones. No se puede deshacer.")
                }
        }
    }

    private func delete() {
        isDeleting = true
        errorMessage = nil
        Task {
            defer { isDeleting = false }
            do { try await app.deleteAccount() } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos borrar tu cuenta"
            }
        }
    }
}
