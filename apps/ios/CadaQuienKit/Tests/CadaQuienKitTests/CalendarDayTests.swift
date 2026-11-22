import Foundation
import Testing
@testable import CadaQuienKit

struct CalendarDayTests {
    @Test func roundTripsThroughJSON() throws {
        let day = CalendarDay(year: 2026, month: 3, day: 7)
        let data = try JSONEncoder().encode(["d": day])
        #expect(String(decoding: data, as: UTF8.self) == #"{"d":"2026-03-07"}"#)
        #expect(try JSONDecoder().decode([String: CalendarDay].self, from: data)["d"] == day)
    }

    @Test(arguments: ["", "2026-3-7", "2026-13-01", "2026-00-10", "2026-01-32", "20260307", "abcd-ef-gh", "2026-01-01T00:00:00Z"])
    func rejectsMalformedDays(value: String) {
        #expect(CalendarDay(value) == nil)
    }

    @Test func ordersChronologically() {
        #expect(CalendarDay(year: 2026, month: 12, day: 1) < CalendarDay(year: 2027, month: 1, day: 1))
        #expect(CalendarDay(year: 2026, month: 2, day: 9) < CalendarDay(year: 2026, month: 2, day: 10))
    }

    @Test func keepsTheDayWhateverTheTimeZone() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(identifier: "Pacific/Auckland"))
        let day = CalendarDay(year: 2026, month: 11, day: 20)
        let date = try #require(day.date(in: calendar))
        #expect(CalendarDay(date, calendar: calendar) == day)
    }
}
