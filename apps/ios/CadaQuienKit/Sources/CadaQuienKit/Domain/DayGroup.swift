import Foundation

/// Expenses that happened on the same local day.
public struct DayGroup: Identifiable, Equatable, Sendable {
    public let day: CalendarDay
    public let expenses: [Expense]
    public var id: CalendarDay { day }
}

public enum DayGrouping {
    /// Groups by the local day each expense happened, keeping the order they arrive in (newest first from the API).
    public static func group(_ expenses: [Expense], calendar: Calendar = .current) -> [DayGroup] {
        var groups: [DayGroup] = []
        for expense in expenses {
            let day = CalendarDay(expense.occurredAt, calendar: calendar)
            if let index = groups.firstIndex(where: { $0.day == day }) {
                groups[index] = DayGroup(day: day, expenses: groups[index].expenses + [expense])
            } else {
                groups.append(DayGroup(day: day, expenses: [expense]))
            }
        }
        return groups
    }
}
