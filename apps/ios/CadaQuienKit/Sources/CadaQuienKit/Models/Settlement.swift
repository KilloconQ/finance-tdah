import Foundation

public struct Settlement: Codable, Sendable, Hashable, Identifiable {
    public let id: UUID
    public let groupId: UUID
    public let fromUserId: String
    public let toUserId: String
    public let amountCents: Int
    public let date: CalendarDay
    public let createdAt: Date
}
