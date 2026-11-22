import Foundation

public struct Challenge: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let userId: String
    public let name: String
    public let description: String
    public let days: Int
    public let doneDays: Int
    public let expectedSavingsCents: Int
    public let lastCheckedAt: CalendarDay?
    public let startedAt: Date
    public let completedAt: Date?
    public let failedAt: Date?
    public let createdAt: Date
}
