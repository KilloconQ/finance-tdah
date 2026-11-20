import Foundation

public struct ExpenseGroup: Codable, Sendable, Hashable, Identifiable {
    public let id: UUID
    public let name: String
    public let createdBy: String
    public let createdAt: Date
    public let members: [GroupMember]
    /// The signed-in user's net balance: positive = is owed, negative = owes.
    public let myBalanceCents: Int
}
