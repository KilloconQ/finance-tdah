import Foundation

public struct Goal: Codable, Sendable, Hashable, Identifiable {
    public let id: UUID
    public let userId: String
    public let name: String
    public let emoji: String
    public let targetCents: Int
    public let currentCents: Int
    public let deadline: CalendarDay?
    public let archivedAt: Date?
    public let createdAt: Date
    public let updatedAt: Date
}
