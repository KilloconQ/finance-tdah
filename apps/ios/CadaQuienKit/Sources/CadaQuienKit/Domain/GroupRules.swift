import Foundation

/// Display rules for shared-expense groups. Mirrors the web groups screens.
public enum GroupRules {
    public struct Totals: Equatable, Sendable {
        /// What other people owe you, across every group.
        public let owedToYou: Int
        /// What you owe, across every group.
        public let youOwe: Int
    }

    public static func totals(_ groups: [ExpenseGroup]) -> Totals {
        Totals(
            owedToYou: groups.reduce(0) { $0 + max($1.myBalanceCents, 0) },
            youOwe: groups.reduce(0) { $0 + max(-$1.myBalanceCents, 0) })
    }

    /// "Le debes a Ana", "Ana te debe", or "Ana le debe a Luis" for a debt between two other people.
    public static func debtLabel(_ debt: GroupDebt, me: String, names: [String: String]) -> String {
        let from = names[debt.from] ?? "Alguien"
        let to = names[debt.to] ?? "Alguien"
        if debt.from == me { return "Le debes a \(to)" }
        if debt.to == me { return "\(from) te debe" }
        return "\(from) le debe a \(to)"
    }

    /// The person on the other side of a debt, from your point of view: who the avatar shows.
    public static func otherParty(_ debt: GroupDebt, me: String) -> String {
        debt.from == me ? debt.to : debt.from
    }

    /// Only whoever paid or logged an expense can change it.
    public static func canEdit(_ expense: SharedExpense, me: String) -> Bool {
        expense.paidBy == me || expense.createdBy == me
    }

    public static func payerLabel(_ expense: SharedExpense, me: String, names: [String: String]) -> String {
        let who = expense.paidBy == me ? "Pagaste tú" : "Pagó \(names[expense.paidBy] ?? "Alguien")"
        return "\(who) · entre \(expense.splits.count)"
    }

    /// An expense whose shares aren't the equal split opens in "montos personalizados".
    public static func isEqualSplit(_ expense: SharedExpense) -> Bool {
        let expected = SplitEqual.shares(amountCents: expense.amountCents, count: expense.splits.count)
        let sorted = expense.splits.map(\.shareCents).sorted(by: >)
        return sorted == expected.sorted(by: >)
    }

    public static func balanceTitle(_ cents: Int) -> String {
        cents > 0 ? "Te deben" : cents < 0 ? "Debes" : "Estás al día"
    }
}
