import Foundation
import Testing

@testable import CadaQuienKit

struct CalendarMonthTests {
  @Test func knowsLengthAndWhereTheWeekStarts() {
    // November 2026 starts on a Sunday: six blanks before the 1st (Monday first).
    let november = CalendarMonth(year: 2026, month: 11)
    #expect(november.dayCount == 30)
    #expect(november.leadingBlanks == 6)
    #expect(november.last == CalendarDay(year: 2026, month: 11, day: 30))
    // June 2026 starts on a Monday.
    #expect(CalendarMonth(year: 2026, month: 6).leadingBlanks == 0)
    #expect(CalendarMonth(year: 2028, month: 2).dayCount == 29)
    #expect(CalendarMonth(year: 2027, month: 2).dayCount == 28)
  }

  @Test func shiftsAcrossYears() {
    #expect(CalendarMonth(year: 2026, month: 12).shifted(by: 1) == CalendarMonth(year: 2027, month: 1))
    #expect(CalendarMonth(year: 2026, month: 1).shifted(by: -1) == CalendarMonth(year: 2025, month: 12))
    #expect(CalendarMonth(year: 2026, month: 3).shifted(by: -15) == CalendarMonth(year: 2024, month: 12))
  }

  @Test func titleIsSpanish() {
    #expect(CalendarMonth(year: 2026, month: 11).title.lowercased() == "noviembre de 2026")
  }
}

struct IncomeDraftTests {
  private let today = CalendarDay(year: 2026, month: 11, day: 21)

  @Test func needsOnlyAName() throws {
    var draft = IncomeDraft(today: today)
    #expect(!draft.canSave)
    draft.name = " Nómina "
    #expect(draft.canSave)
    #expect(try draft.newIncome().get() == .init(name: "Nómina", amountCents: nil, frequency: .semimonthly, startsOn: today))
  }

  @Test func parsesTheAmountAndRejectsABadOne() throws {
    var draft = IncomeDraft(today: today)
    draft.name = "Cobro"
    draft.amountText = "12,000.50"
    #expect(try draft.newIncome().get().amountCents == 1_200_050)
    draft.amountText = "0"
    #expect(draft.newIncome() == .failure(.init("El monto debe ser mayor a $0")))
  }

  @Test func anEmptiedAmountIsClearedOnTheServerNotKept() throws {
    var draft = IncomeDraft(today: today)
    draft.name = "Cobro"
    let body = try JSONEncoder().encode(try draft.update().get())
    let json = try #require(JSONSerialization.jsonObject(with: body) as? [String: Any])
    #expect(json["amountCents"] is NSNull)
    #expect(json["name"] as? String == "Cobro")
  }

  @Test func editingStartsFromTheStoredIncome() throws {
    let income = try JSONDecoder().decode(
      ScheduledIncome.self,
      from: Data(#"{"id":"11111111-1111-4111-8111-111111111111","name":"Nómina","amountCents":1200000,"frequency":"biweekly","startsOn":"2026-11-15"}"#.utf8))
    let draft = IncomeDraft(income)
    #expect(draft.name == "Nómina")
    #expect(draft.frequency == .biweekly)
    #expect(draft.amountText == "12000")
  }
}

struct CalendarDecodingTests {
  @Test func decodesTheServerResponse() throws {
    let body = #"{"today":"2026-11-21","events":[{"date":"2026-11-05","kind":"card_payment","title":"Visa","amountCents":null,"sourceId":"c1"},{"date":"2026-11-10","kind":"subscription","title":"Netflix","amountCents":19900,"sourceId":"s1"},{"date":"2026-11-30","kind":"income","title":"Nómina","amountCents":1200000,"sourceId":"i1"}]}"#
    let response = try JSONDecoder().decode(CalendarResponse.self, from: Data(body.utf8))
    #expect(response.today == CalendarDay(year: 2026, month: 11, day: 21))
    #expect(response.events.map(\.kind) == [.cardPayment, .subscription, .income])
    #expect(response.events[0].amountCents == nil)
    #expect(Set(response.events.map(\.id)).count == 3)
  }
}
