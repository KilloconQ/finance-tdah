import Foundation

/// A "cajita": money set aside inside an account.
public struct Envelope: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let userId: String
    public let accountId: EntityID
    public let name: String
    public let emoji: String
    /// Negative when more was spent from it than it held.
    public let balanceCents: Int
    public let createdAt: Date
    public let updatedAt: Date
}
