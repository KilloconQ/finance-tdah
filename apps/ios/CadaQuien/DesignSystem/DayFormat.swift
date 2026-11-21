import CadaQuienKit
import Foundation

/// Date text in Mexican Spanish. Day-only values never go through UTC, so they never shift a day.
enum DayFormat {
    private static let locale = Locale(identifier: "es_MX")

    /// "10 dic".
    static func short(_ day: CalendarDay) -> String {
        format(day, .dateTime.day().month(.abbreviated))
    }

    /// "jueves, 20 nov".
    static func long(_ day: CalendarDay) -> String {
        format(day, .dateTime.weekday(.wide).day().month(.abbreviated))
    }

    private static func format(_ day: CalendarDay, _ style: Date.FormatStyle) -> String {
        guard let date = day.date() else { return day.rawValue }
        var style = style
        style.locale = locale
        return date.formatted(style)
    }
}
