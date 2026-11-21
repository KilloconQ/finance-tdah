import Foundation

/// A month of the calendar grid, Monday first. Pure date math on `CalendarDay`, so no time zone can shift a day.
public struct CalendarMonth: Hashable, Sendable {
    public let year: Int
    public let month: Int

    public init(year: Int, month: Int) {
        self.year = year
        self.month = month
    }

    public init(_ day: CalendarDay) {
        self.init(year: day.year, month: day.month)
    }

    private static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }

    private var firstDate: Date {
        Self.calendar.date(from: DateComponents(year: year, month: month, day: 1))!
    }

    public var dayCount: Int { Self.calendar.range(of: .day, in: .month, for: firstDate)!.count }
    public var first: CalendarDay { CalendarDay(year: year, month: month, day: 1) }
    public var last: CalendarDay { CalendarDay(year: year, month: month, day: dayCount) }

    /// Empty cells before the 1st so the grid starts on Monday (Sunday = 6).
    public var leadingBlanks: Int { (Self.calendar.component(.weekday, from: firstDate) + 5) % 7 }

    public func days() -> [CalendarDay] {
        (1...dayCount).map { CalendarDay(year: year, month: month, day: $0) }
    }

    public func shifted(by months: Int) -> CalendarMonth {
        let index = year * 12 + (month - 1) + months
        return CalendarMonth(year: Int((Double(index) / 12).rounded(.down)), month: ((index % 12) + 12) % 12 + 1)
    }

    /// "noviembre de 2026".
    public var title: String {
        var style = Date.FormatStyle(locale: Locale(identifier: "es_MX"), timeZone: TimeZone(identifier: "UTC")!).month(.wide).year()
        style.calendar = Self.calendar
        return firstDate.formatted(style)
    }
}
