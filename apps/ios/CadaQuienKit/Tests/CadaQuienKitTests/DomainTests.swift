import Foundation
import Testing

@testable import CadaQuienKit

/// The same cases the web tests use (`format.test.ts`, `money.test.ts`, `subscription.test.ts`, `jar.test.ts`).
struct DomainTests {
  @Test func formatsPesosWithABare$AndGrouping() {
    #expect(Money.format(cents: 123_450) == "$1,234.50")
    #expect(Money.format(cents: 0) == "$0.00")
    #expect(Money.format(cents: 100_000_000) == "$1,000,000.00")
    #expect(Money.format(cents: -5_000) == "-$50.00")
    #expect(Money.format(cents: 5) == "$0.05")
  }

  @Test func masksHiddenAmounts() {
    #expect(Money.format(cents: 123_450, hidden: true) == "••••")
    #expect(Money.delta(cents: -5_000, hidden: true) == "••••")
  }

  @Test func deltaUsesARealMinus() {
    #expect(Money.delta(cents: 5_000) == "+$50.00")
    #expect(Money.delta(cents: -5_000) == "−$50.00")
    #expect(Money.delta(cents: 0) == "$0.00")
  }

  @Test(arguments: [
    ("180", 18_000), ("180.50", 18_050), ("1,200.50", 120_050), ("  $65 ", 6_500),
    ("12,50", 1_250), ("0,5", 50), ("1.234,50", 123_450), ("1,250.50", 125_050),
    ("1,250", 125_000), ("1,234,567.89", 123_456_789),
  ])
  func parsesWhatPeopleType(raw: String, cents: Int) {
    #expect(Money.parseToCents(raw) == cents)
  }

  @Test func rejectsTooManyDecimalsInsteadOfRounding() {
    #expect(Money.parseToCents("12.999") == nil)
    #expect(Money.parse("10.555") == .failure(.tooManyDecimals))
    #expect(Money.parse("10,5555") == .failure(.tooManyDecimals))
  }

  @Test func rejectsScientificNotationAndGarbage() {
    #expect(Money.parse("1e9") == .failure(.scientific))
    for raw in ["", "abc", "0", "0.00", "-5", "1.2.3,4", "$", "."] {
      #expect(Money.parseToCents(raw) == nil, "\(raw)")
    }
  }

  @Test func errorsReadInSpanish() {
    #expect(Money.ParseError.tooManyDecimals.errorDescription == "El monto admite máximo 2 decimales")
  }

  @Test func subscriptionCosts() {
    #expect(SubscriptionCost.monthly(amountCents: 26_900, cadence: .monthly) == 26_900)
    #expect(SubscriptionCost.monthly(amountCents: 120_000, cadence: .yearly) == 10_000)
    #expect(SubscriptionCost.monthly(amountCents: 29_900, cadence: .yearly) == 2_492)
    #expect(SubscriptionCost.yearly(amountCents: 16_900, cadence: .monthly) == 202_800)
    #expect(SubscriptionCost.yearly(amountCents: 120_000, cadence: .yearly) == 120_000)
    #expect(SubscriptionCost.over(days: 15, amountCents: 30_000, cadence: .monthly) == 15_000)
    #expect(SubscriptionCost.over(days: 60, amountCents: 120_000, cadence: .yearly) == 19_726)
    #expect(SubscriptionCost.over(days: 0, amountCents: 120_000, cadence: .yearly) == 0)
  }

  @Test func jarProgress() {
    let half = JarProgress(currentCents: 500, targetCents: 1_000)
    #expect(half.fraction == 0.5)
    #expect(half.isComplete == false)

    let over = JarProgress(currentCents: 1_200, targetCents: 1_000)
    #expect(over.fraction == 1)
    #expect(over.isComplete)
    #expect(over.overflowCents == 200)

    #expect(JarProgress(currentCents: -50, targetCents: 1_000).fraction == 0)
    #expect(JarProgress(currentCents: 10, targetCents: 0).fraction == 0)
  }

  @Test func pluralizesDays() {
    #expect(Spanish.days(1) == "1 día")
    #expect(Spanish.days(3) == "3 días")
  }
}

struct APIMessagesTests {
  @Test func translatesBetterAuthEnglishToSpanish() {
    #expect(APIMessages.translate("Invalid email or password") == "Correo o contraseña incorrectos.")
    #expect(APIMessages.translate("User already exists") == APIMessages.byCode["USER_ALREADY_EXISTS"])
  }

  @Test func leavesOurOwnSpanishAlone() {
    #expect(APIMessages.translate("Esa cajita está bloqueada") == "Esa cajita está bloqueada")
  }

  @Test func readsTheErrorCode() {
    let data = Data(#"{"code":"PASSWORD_TOO_SHORT","message":"Password too short"}"#.utf8)
    #expect(APIClient.message(in: data, status: 400) == "La contraseña tiene que tener al menos 8 caracteres.")
  }

  @Test func calmsRateLimits() {
    #expect(APIClient.message(in: Data(), status: 429) == APIMessages.rateLimited)
  }
}
