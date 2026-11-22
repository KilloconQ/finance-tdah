import Foundation

public enum IncomeFrequency: String, Codable, Sendable, CaseIterable {
    case once, weekly, biweekly, semimonthly, monthly

    public var label: String {
        switch self {
        case .once: "Una vez"
        case .weekly: "Cada semana"
        case .biweekly: "Cada 14 días"
        case .semimonthly: "Quincenal (15 y último)"
        case .monthly: "Cada mes"
        }
    }
}

/// Money the person expects to receive (payroll, payments owed to her). It only feeds the calendar.
public struct ScheduledIncome: Codable, Sendable, Hashable, Identifiable {
    public let id: EntityID
    public let name: String
    public let amountCents: Int?
    public let frequency: IncomeFrequency
    public let startsOn: CalendarDay
}
