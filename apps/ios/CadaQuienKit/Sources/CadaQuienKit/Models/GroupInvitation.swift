import Foundation

/// A pending invitation to join a group, as the invitee sees it.
public struct GroupInvitation: Codable, Sendable, Hashable, Identifiable {
    public let id: UUID
    public let groupId: UUID
    public let groupName: String
    public let invitedByName: String
    public let createdAt: Date
}
