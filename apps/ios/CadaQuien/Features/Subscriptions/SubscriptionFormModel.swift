import CadaQuienKit
import Foundation
import Observation

@MainActor @Observable
final class SubscriptionFormModel {
    /// nil when creating.
    let original: Subscription?
    var draft: SubscriptionDraft
    private(set) var errorMessage: String?
    private(set) var isSaving = false

    init(original: Subscription?) {
        self.original = original
        draft = original.map(SubscriptionDraft.init) ?? SubscriptionDraft()
    }

    var isEditing: Bool { original != nil }

    func save(app: AppModel) async -> Bool {
        guard !isSaving else { return false }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            if let original {
                _ = try await app.services.subscriptions.update(original.id, try draft.update().get())
            } else {
                _ = try await app.services.subscriptions.create(try draft.newSubscription().get())
            }
            await app.store.refreshSubscriptions()
            return true
        } catch {
            errorMessage =
                (error as? LocalizedError)?.errorDescription
                ?? (isEditing ? "No pudimos actualizar la suscripción" : "No pudimos crear la suscripción")
            return false
        }
    }
}
