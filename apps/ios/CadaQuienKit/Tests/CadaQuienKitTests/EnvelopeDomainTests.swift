import Foundation
import Testing

@testable import CadaQuienKit

private func account(_ id: String, _ balance: Int, _ type: AccountType = .debito) -> Account {
  decode(
    """
    {"id":"\(id)","userId":"u","name":"A","type":"\(type.rawValue)","institution":null,"last4":null,
    "balanceCents":\(balance),"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
    """)
}

private func envelope(_ accountId: String, _ balance: Int) -> Envelope {
  decode(
    """
    {"id":"e\(balance)","userId":"u","accountId":"\(accountId)","name":"E","emoji":"📦","balanceCents":\(balance),
    "createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
    """)
}

private func decode<T: Decodable>(_ json: String) -> T {
  try! JSONCoding.makeDecoder().decode(T.self, from: Data(json.utf8))
}

struct EnvelopeDomainTests {
  @Test func allocatedIgnoresOverspentEnvelopes() {
    #expect(EnvelopeRules.allocated([10_000, -2_000, 500]) == 10_500)
  }

  @Test func unassignedCanGoNegative() {
    #expect(EnvelopeRules.unassigned(accountBalance: 50_000, envelopeBalances: [30_000, 10_000]) == 10_000)
    #expect(EnvelopeRules.unassigned(accountBalance: 5_000, envelopeBalances: [30_000]) == -25_000)
  }

  @Test func creditCardsHaveNoEnvelopes() {
    #expect(EnvelopeRules.supportsEnvelopes(.credito) == false)
    #expect(EnvelopeRules.supportsEnvelopes(.debito))
  }

  @Test func lockedMoneyCannotExceedTheRealBalance() {
    let accounts = [account("a", 50_000), account("b", 1_000)]
    let envelopes = [envelope("a", 20_000), envelope("b", 9_000)]
    #expect(EnvelopeRules.lockedCents(accounts: accounts, envelopes: envelopes) == 21_000)
  }

  @Test func settingAsideCannotExceedWhatTheAccountHolds() {
    let error = EnvelopeRules.adjustmentError(
      accountType: .debito, accountBalance: 10_000, otherEnvelopeBalances: [6_000], envelopeBalance: 1_000, delta: 5_000)
    #expect(error == .exceedsUnassigned(availableCents: 3_000))
    #expect(error?.message() == "Solo quedan $30.00 sin apartar.")
  }

  @Test func theWholeBalanceAlreadySetAsideSaysSo() {
    let error = EnvelopeRules.adjustmentError(
      accountType: .debito, accountBalance: 10_000, otherEnvelopeBalances: [10_000], envelopeBalance: 0, delta: 1)
    #expect(error?.message() == "Ya apartaste todo lo que tiene esta cuenta.")
  }

  @Test func releasingCannotTakeAnEnvelopeBelowZero() {
    let error = EnvelopeRules.adjustmentError(
      accountType: .debito, accountBalance: 10_000, otherEnvelopeBalances: [], envelopeBalance: 2_000, delta: -3_000)
    #expect(error?.message() == "La cajita solo tiene $20.00.")
    #expect(
      EnvelopeRules.adjustmentError(
        accountType: .debito, accountBalance: 10_000, otherEnvelopeBalances: [], envelopeBalance: 0, delta: -1)?.message()
        == "La cajita no tiene dinero para liberar.")
  }

  @Test func coveringAnOverspentEnvelopeSetsNothingNewAside() {
    let error = EnvelopeRules.adjustmentError(
      accountType: .debito, accountBalance: 1_000, otherEnvelopeBalances: [1_000], envelopeBalance: -500, delta: 500)
    #expect(error == nil)
  }

  @Test func creditCardsRefuseEnvelopes() {
    #expect(
      EnvelopeRules.adjustmentError(
        accountType: .credito, accountBalance: -1_000, otherEnvelopeBalances: [], envelopeBalance: 0, delta: 100)
        == .creditAccount)
  }

  @Test func hiddenBalancesMaskTheAmountInTheMessage() {
    #expect(EnvelopeRules.AdjustmentError.exceedsEnvelope(availableCents: 500).message(hidden: true) == "La cajita solo tiene ••••.")
  }

  @Test func netWorthSplitsLiquidFromDebt() {
    let worth = NetWorth(accounts: [account("a", 100_000), account("b", -30_000), account("c", 5_000)])
    #expect(worth.liquidCents == 105_000)
    #expect(worth.debtCents == 30_000)
    #expect(worth.netWorthCents == 75_000)
  }

  @Test func creditCardBalancesAreStoredNegative() {
    #expect(AccountBalance.signed(type: .credito, magnitudeCents: 5_000) == -5_000)
    #expect(AccountBalance.signed(type: .credito, magnitudeCents: 0) == 0)
    #expect(AccountBalance.signed(type: .debito, magnitudeCents: -5_000) == 5_000)
  }

  @Test func equalSplitsLoseNoCents() {
    #expect(SplitEqual.shares(amountCents: 10_000, count: 3) == [3_334, 3_333, 3_333])
    #expect(SplitEqual.shares(amountCents: 9_000, count: 3) == [3_000, 3_000, 3_000])
    #expect(SplitEqual.shares(amountCents: 100, count: 0) == [])
    #expect(SplitEqual.shares(amountCents: 10_000, count: 3).reduce(0, +) == 10_000)
  }
}
