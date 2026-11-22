public struct AccountsBreakdown: Codable, Sendable, Hashable {
    public let liquidCents: Int
    public let jarsCents: Int
    public let debtCents: Int
    public let netWorthCents: Int
}
