/// What the add/edit expense form holds while the person types.
public struct ExpenseDraft: Equatable, Sendable {
    public var kind: ExpenseKind = .expense
    public var amountText = ""
    public var category: String?
    public var note = ""
    public var accountId: EntityID?
    public var toAccountId: EntityID?
    public var envelopeId: EntityID?

    public init() {}

    public init(_ expense: Expense) {
        kind = expense.kind
        amountText = Self.amountText(cents: expense.amountCents)
        category = expense.kind == .expense ? expense.category : nil
        note = expense.description
        accountId = expense.accountId
        toAccountId = expense.toAccountId
        envelopeId = expense.envelopeId
    }

    /// `1500` -> `15`, `1550` -> `15.5`: what the field shows when editing.
    static func amountText(cents: Int) -> String {
        let whole = cents / 100
        let fraction = cents % 100
        if fraction == 0 { return String(whole) }
        return fraction % 10 == 0 ? "\(whole).\(fraction / 10)" : "\(whole).\(String(format: "%02d", fraction))"
    }

    /// Whether the person has typed anything: used to stop a stray swipe from throwing the form away.
    public var isDirty: Bool {
        !amountText.isEmpty || !note.isEmpty
    }
}
