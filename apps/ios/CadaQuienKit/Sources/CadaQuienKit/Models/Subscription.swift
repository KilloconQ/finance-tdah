import Foundation

public struct Subscription: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let userId: String
    public let name: String
    public let category: String
    public let amountCents: Int
    public let cadence: SubscriptionCadence
    public let nextChargeAt: CalendarDay
    public let lastOpenedAt: CalendarDay?
    public let unused: Bool
    public let cancelledAt: Date?
    public let createdAt: Date
    public let updatedAt: Date
}
