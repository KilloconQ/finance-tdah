import Foundation

/// The add/edit expense form's rules, mirroring `apps/web/src/features/expenses`.
public enum ExpenseFormRules {
    public static let noteLimit = 120

    /// An income can't go into a credit card: its balance is debt.
    public static func availableAccounts(for kind: ExpenseKind, accounts: [Account]) -> [Account] {
        kind == .income ? accounts.filter { $0.type != .credito } : accounts
    }

    /// Keeps the account, destination and envelope choices valid after any change to the draft.
    public static func normalized(_ draft: ExpenseDraft, accounts: [Account], envelopes: [Envelope]) -> ExpenseDraft {
        var draft = draft
        let available = availableAccounts(for: draft.kind, accounts: accounts)

        if draft.accountId == nil || !available.contains(where: { $0.id == draft.accountId }) {
            draft.accountId = available.first?.id
        }

        if draft.kind == .transfer {
            let valid = accounts.contains { $0.id == draft.toAccountId } && draft.toAccountId != draft.accountId
            if !valid { draft.toAccountId = accounts.first { $0.id != draft.accountId }?.id }
        } else {
            draft.toAccountId = nil
        }

        // Only an expense can come out of an envelope, and only one of the chosen account's.
        if draft.kind != .expense
            || !envelopes.contains(where: { $0.id == draft.envelopeId && $0.accountId == draft.accountId })
        {
            draft.envelopeId = nil
        }
        return draft
    }

    /// What is still missing before the form can be saved, in the order the form shows it.
    public static func missingFields(_ draft: ExpenseDraft, accounts: [Account]) -> [String] {
        var missing: [String] = []
        if draft.amountText.trimmingCharacters(in: .whitespaces).isEmpty { missing.append("el monto") }
        if draft.kind == .expense, draft.category == nil { missing.append("la categoría") }
        if draft.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { missing.append("una nota") }
        if !availableAccounts(for: draft.kind, accounts: accounts).isEmpty, draft.accountId == nil {
            missing.append("la cuenta")
        }
        if draft.kind == .transfer, draft.toAccountId == nil { missing.append("la cuenta de destino") }
        return missing
    }

    public static func missingMessage(_ draft: ExpenseDraft, accounts: [Account]) -> String? {
        let missing = missingFields(draft, accounts: accounts)
        return missing.isEmpty ? nil : "Te falta: \(missing.joined(separator: ", "))."
    }

    public static func canSave(_ draft: ExpenseDraft, accounts: [Account]) -> Bool {
        missingFields(draft, accounts: accounts).isEmpty
    }

    public static func category(for draft: ExpenseDraft) -> String {
        switch draft.kind {
        case .expense: draft.category ?? ""
        case .income: ExpenseCategory.incomeCategory
        case .transfer: ExpenseCategory.transferCategory
        }
    }

    /// The amount in cents, or the Spanish reason it can't be saved.
    public static func amountCents(_ draft: ExpenseDraft) -> Result<Int, ValidationFailure> {
        switch Money.parse(draft.amountText) {
        case .success(let cents):
            guard cents <= 2_147_483_647 else { return .failure(.init("El monto es demasiado grande")) }
            return .success(cents)
        case .failure(let error):
            // Decimals and scientific notation get their own explanation; anything else is "not above zero".
            let specific = error == .tooManyDecimals || error == .scientific
            return .failure(.init(specific ? (error.errorDescription ?? "") : "El monto debe ser mayor a $0"))
        }
    }

    public struct ValidationFailure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    public static func newExpense(from draft: ExpenseDraft) -> Result<ExpensesService.NewExpense, ValidationFailure> {
        amountCents(draft).map { cents in
            ExpensesService.NewExpense(
                kind: draft.kind,
                amountCents: cents,
                category: category(for: draft),
                description: String(draft.note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(noteLimit)),
                accountId: draft.accountId,
                toAccountId: draft.kind == .transfer ? draft.toAccountId : nil,
                envelopeId: draft.kind == .expense ? draft.envelopeId : nil
            )
        }
    }

    /// Edits send every field, and `envelopeId: .clear` takes the expense out of its envelope.
    public static func update(from draft: ExpenseDraft) -> Result<ExpensesService.ExpenseUpdate, ValidationFailure> {
        amountCents(draft).map { cents in
            ExpensesService.ExpenseUpdate(
                kind: draft.kind,
                amountCents: cents,
                category: category(for: draft),
                description: String(draft.note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(noteLimit)),
                accountId: draft.accountId,
                toAccountId: draft.kind == .transfer ? draft.toAccountId : nil,
                envelopeId: draft.kind == .expense ? draft.envelopeId.map { .set($0) } ?? .clear : .clear
            )
        }
    }

    /// "🔒 $200.00 bloqueado en cajitas · puedes gastar $300.00": warns before the API would refuse locked money.
    public static func lockedNote(kind: ExpenseKind, account: Account?, envelopes: [Envelope], hidden: Bool) -> String? {
        guard kind != .income, let account else { return nil }
        let allocated = EnvelopeRules.allocated(envelopes.filter { $0.accountId == account.id }.map(\.balanceCents))
        guard allocated > 0 else { return nil }
        let free = max(0, account.balanceCents - allocated)
        return "🔒 \(Money.format(cents: allocated, hidden: hidden)) bloqueado en cajitas · puedes gastar \(Money.format(cents: free, hidden: hidden))"
    }
}
