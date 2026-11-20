public struct GroupBalances: Codable, Sendable, Hashable {
    /// Net balance per user id: positive = is owed, negative = owes.
    public let balances: [String: Int]
    /// The fewest payments that settle everyone.
    public let debts: [GroupDebt]
}
