import Foundation

public struct SharedExpense: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let groupId: EntityID
    public let paidBy: String
    public let description: String
    public let amountCents: Int
    public let date: CalendarDay
    public let createdBy: String
    public let createdAt: Date
    public let splits: [ExpenseShare]
}
