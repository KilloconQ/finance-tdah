import Foundation

public struct Account: Codable, Sendable, Hashable, Identifiable {
    public let id: UUID
    public let userId: String
    public let name: String
    public let type: AccountType
    public let institution: String?
    public let last4: String?
    /// Day of the month a credit card closes its statement (1-31); nil for other accounts.
    public let cutoffDay: Int?
    public let paymentDay: Int?
    /// Credit cards hold debt as a negative balance.
    public let balanceCents: Int
    public let createdAt: Date
    public let updatedAt: Date
}
