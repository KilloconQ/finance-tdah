import CadaQuienKit
import Foundation
import Observation

/// State and actions of the add/edit expense form. The rules live in `ExpenseFormRules`.
@MainActor @Observable
final class ExpenseFormModel {
    enum Mode {
        case create
        case edit(Expense)
    }

    let mode: Mode
    var draft: ExpenseDraft
    private(set) var errorMessage: String?
    private(set) var isSaving = false

    init(mode: Mode) {
        self.mode = mode
        switch mode {
        case .create: draft = ExpenseDraft()
        case .edit(let expense): draft = ExpenseDraft(expense)
        }
    }

    var isEditing: Bool {
        if case .edit = mode { true } else { false }
    }

    /// Keeps the account, destination and envelope choices valid; call whenever the draft or the data changes.
    func normalize(accounts: [Account], envelopes: [Envelope]) {
        let fixed = ExpenseFormRules.normalized(draft, accounts: accounts, envelopes: envelopes)
        if fixed != draft { draft = fixed }
    }

    /// Saves and returns true when the form can close.
    func save(app: AppModel) async -> Bool {
        guard !isSaving else { return false }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            switch mode {
            case .create:
                let request = try ExpenseFormRules.newExpense(from: draft).get()
                _ = try await app.services.expenses.create(request)
            case .edit(let expense):
                let request = try ExpenseFormRules.update(from: draft).get()
                _ = try await app.services.expenses.update(expense.id, request)
            }
            await app.store.refreshMoney()
            return true
        } catch let failure as ExpenseFormRules.ValidationFailure {
            errorMessage = failure.message
        } catch {
            errorMessage =
                (error as? LocalizedError)?.errorDescription
                ?? (isEditing ? "No pudimos actualizar el gasto" : "No pudimos guardar el gasto")
        }
        return false
    }
}
