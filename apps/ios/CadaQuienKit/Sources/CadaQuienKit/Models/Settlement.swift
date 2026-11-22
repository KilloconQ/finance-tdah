import Foundation

public struct Settlement: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let groupId: EntityID
    public let fromUserId: String
    public let toUserId: String
    public let amountCents: Int
    public let date: CalendarDay
    public let createdAt: Date
}
