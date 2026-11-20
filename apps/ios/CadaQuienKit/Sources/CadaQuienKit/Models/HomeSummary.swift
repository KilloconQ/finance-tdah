public struct HomeSummary: Codable, Sendable, Hashable {
    public let todayAvailableCents: Int
    public let weekSpentCents: Int
    public let weekTargetCents: Int
    public let netWorthCents: Int
    public let liquidCents: Int
    public let jarsCents: Int
    public let debtCents: Int
    public let greeting: String
}
