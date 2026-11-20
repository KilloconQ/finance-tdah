public struct GroupDetail: Codable, Sendable, Hashable {
    public let group: ExpenseGroup
    public let expenses: [SharedExpense]
    public let settlements: [Settlement]
    public let balances: GroupBalances
}
