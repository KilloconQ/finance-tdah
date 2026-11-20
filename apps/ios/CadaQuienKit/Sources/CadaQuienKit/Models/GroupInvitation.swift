import Foundation

/// A pending invitation to join a group, as the invitee sees it.
public struct GroupInvitation: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let groupId: EntityID
    public let groupName: String
    public let invitedByName: String
    public let createdAt: Date
}
