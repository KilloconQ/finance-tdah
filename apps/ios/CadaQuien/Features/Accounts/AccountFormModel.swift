import CadaQuienKit
import Foundation
import Observation

@MainActor @Observable
final class AccountFormModel {
    /// nil when creating.
    let original: Account?
    var draft: AccountDraft
    private(set) var errorMessage: String?
    private(set) var isSaving = false

    init(original: Account?) {
        self.original = original
        draft = original.map(AccountDraft.init) ?? AccountDraft()
    }

    var isEditing: Bool { original != nil }

    /// Saves and returns true when the form can close.
    func save(app: AppModel) async -> Bool {
        guard !isSaving else { return false }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            if let original {
                let request = try draft.update(from: original).get()
                _ = try await app.services.accounts.update(original.id, request)
            } else {
                _ = try await app.services.accounts.create(try draft.newAccount().get())
            }
            await app.store.refreshMoney()
            return true
        } catch {
            errorMessage =
                (error as? LocalizedError)?.errorDescription
                ?? (isEditing ? "No pudimos actualizar la cuenta" : "No pudimos crear la cuenta")
            return false
        }
    }
}
