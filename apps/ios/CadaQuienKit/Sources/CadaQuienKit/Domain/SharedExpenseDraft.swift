import Foundation

/// The add/edit shared-expense form and the rules that turn it into a request.
public struct SharedExpenseDraft: Equatable, Sendable {
    public var description = ""
    public var amountText = ""
    public var paidBy: String
    /// Everyone is in by default.
    public var participants: Set<String>
    public var isCustom = false
    /// Typed amount per person when `isCustom`.
    public var customAmounts: [String: String] = [:]

    public init(me: String, members: [GroupMember]) {
        paidBy = me
        participants = Set(members.map(\.userId))
    }

    public init(_ expense: SharedExpense) {
        description = expense.description
        amountText = Money.editableText(cents: expense.amountCents)
        paidBy = expense.paidBy
        participants = Set(expense.splits.map(\.userId))
        isCustom = !GroupRules.isEqualSplit(expense)
        if isCustom {
            for share in expense.splits { customAmounts[share.userId] = Money.editableText(cents: share.shareCents) }
        }
    }

    public struct Failure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    public var canSave: Bool {
        !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !amountText.trimmingCharacters(in: .whitespaces).isEmpty
    }

    public func request(date: CalendarDay, members: [GroupMember]) -> Result<GroupsService.SharedExpenseInput, Failure> {
        let cents: Int
        switch Money.parse(amountText) {
        case .success(let value): cents = value
        case .failure(let error):
            let specific = error == .tooManyDecimals || error == .scientific
            return .failure(.init(specific ? (error.errorDescription ?? "") : "El monto debe ser mayor a $0"))
        }
        guard cents <= 2_147_483_647 else { return .failure(.init("El monto es demasiado grande")) }

        // Keep member order stable so the request is predictable.
        let chosen = members.map(\.userId).filter(participants.contains)
        guard !chosen.isEmpty else { return .failure(.init("Elige al menos a una persona")) }

        let note = String(description.trimmingCharacters(in: .whitespacesAndNewlines).prefix(120))
        guard isCustom else {
            return .success(.init(paidBy: paidBy, description: note, amountCents: cents, date: date, participantIds: chosen))
        }

        var shares: [ExpenseShare] = []
        for id in chosen {
            // An unreadable share counts as zero, like the web.
            let share = Money.parseToCents(customAmounts[id] ?? "") ?? 0
            guard share <= 2_147_483_647 else { return .failure(.init("El monto es demasiado grande")) }
            shares.append(ExpenseShare(userId: id, shareCents: share))
        }
        let sum = shares.reduce(0) { $0 + $1.shareCents }
        guard sum == cents else {
            return .failure(.init("Las partes suman \(Money.format(cents: sum)) y el gasto es de \(Money.format(cents: cents))"))
        }
        return .success(.init(paidBy: paidBy, description: note, amountCents: cents, date: date, splits: shares))
    }
}
