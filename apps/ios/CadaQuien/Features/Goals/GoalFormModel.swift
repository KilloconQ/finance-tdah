import CadaQuienKit
import Foundation
import Observation

@MainActor @Observable
final class GoalFormModel {
    /// nil when creating.
    let original: Goal?
    var draft: GoalDraft
    private(set) var errorMessage: String?
    private(set) var isSaving = false

    init(original: Goal?) {
        self.original = original
        draft = original.map(GoalDraft.init) ?? GoalDraft()
    }

    var isEditing: Bool { original != nil }

    func save(app: AppModel) async -> Bool {
        guard !isSaving else { return false }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            if let original {
                _ = try await app.services.goals.update(original.id, try draft.update().get())
            } else {
                _ = try await app.services.goals.create(try draft.newGoal().get())
            }
            await app.store.refreshGoals()
            return true
        } catch {
            errorMessage =
                (error as? LocalizedError)?.errorDescription
                ?? (isEditing ? "No pudimos actualizar el frasco" : "No pudimos crear el frasco")
            return false
        }
    }
}
