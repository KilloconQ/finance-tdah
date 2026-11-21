public struct ExpenseShare: Codable, Sendable, Hashable {
    public init(userId: String, shareCents: Int) {
        self.userId = userId
        self.shareCents = shareCents
    }

    public let userId: String
    public let shareCents: Int
}
