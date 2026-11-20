import Foundation

public struct Expense: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let userId: String
    public let accountId: EntityID?
    public let toAccountId: EntityID?
    public let envelopeId: EntityID?
    public let kind: ExpenseKind
    public let amountCents: Int
    public let category: String
    public let description: String
    public let occurredAt: Date
    public let createdAt: Date
}
