import Foundation

public struct Expense: Codable, Sendable, Hashable, Identifiable {
    public let id: UUID
    public let userId: String
    public let accountId: UUID?
    public let toAccountId: UUID?
    public let envelopeId: UUID?
    public let kind: ExpenseKind
    public let amountCents: Int
    public let category: String
    public let description: String
    public let occurredAt: Date
    public let createdAt: Date
}
