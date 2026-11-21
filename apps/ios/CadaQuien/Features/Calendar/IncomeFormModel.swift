import CadaQuienKit
import Foundation
import Observation

@MainActor @Observable
final class IncomeFormModel {
    /// nil when creating.
    let original: ScheduledIncome?
    var draft: IncomeDraft
    private(set) var errorMessage: String?
    private(set) var isSaving = false

    init(original: ScheduledIncome?) {
        self.original = original
        draft = original.map(IncomeDraft.init) ?? IncomeDraft()
    }

    var isEditing: Bool { original != nil }

    func save(app: AppModel) async -> Bool {
        await run(app) {
            if let original {
                _ = try await app.services.incomes.update(original.id, try self.draft.update().get())
            } else {
                _ = try await app.services.incomes.create(try self.draft.newIncome().get())
            }
        }
    }

    func delete(app: AppModel) async -> Bool {
        guard let original else { return false }
        return await run(app) { try await app.services.incomes.delete(original.id) }
    }

    private func run(_ app: AppModel, _ work: () async throws -> Void) async -> Bool {
        guard !isSaving else { return false }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            try await work()
            await app.store.refreshCalendar()
            return true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar el ingreso"
            return false
        }
    }
}
