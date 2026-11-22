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

struct AccountDraftTests {
  private func account(type: AccountType, balance: Int, cutoff: Int? = nil, payment: Int? = nil) -> Account {
    try! JSONCoding.makeDecoder().decode(
      Account.self,
      from: Data(
        """
        {"id":"a","userId":"u","name":"BBVA","type":"\(type.rawValue)","institution":"BBVA","last4":"1234",
        "cutoffDay":\(cutoff.map(String.init) ?? "null"),"paymentDay":\(payment.map(String.init) ?? "null"),
        "balanceCents":\(balance),"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
        """.utf8))
  }

  @Test func aCreditCardIsSavedAsDebt() throws {
    var draft = AccountDraft()
    draft.name = "  Tarjeta "
    draft.type = .credito
    draft.balanceText = "1,500.50"
    draft.cutoffText = "10"
    draft.paymentText = "25"
    let request = try draft.newAccount().get()
    #expect(request.name == "Tarjeta")
    #expect(request.balanceCents == -150_050)
    #expect(request.cutoffDay == 10)
    #expect(request.paymentDay == 25)
  }

  @Test func anEmptyOrZeroBalanceIsZero() throws {
    var draft = AccountDraft()
    draft.name = "Efectivo"
    draft.type = .efectivo
    #expect(try draft.newAccount().get().balanceCents == 0)
    draft.balanceText = "0"
    #expect(try draft.newAccount().get().balanceCents == 0)
  }

  @Test func statementDaysComeTogetherAndInRange() {
    var draft = AccountDraft()
    draft.name = "T"
    draft.type = .credito
    draft.cutoffText = "10"
    #expect(draft.newAccount() == .failure(.init("Pon el día de corte y el de pago, o deja los dos vacíos")))
    draft.paymentText = "40"
    #expect(draft.newAccount() == .failure(.init("Los días van del 1 al 31")))
  }

  @Test func onlyCardsSendBankDetailsAndStatementDays() throws {
    var draft = AccountDraft()
    draft.name = "Efectivo"
    draft.type = .efectivo
    draft.institution = "BBVA"
    draft.last4 = "1234"
    draft.cutoffText = "10"
    draft.paymentText = "25"
    let request = try draft.newAccount().get()
    #expect(request.institution == nil)
    #expect(request.last4 == nil)
    #expect(request.cutoffDay == nil)
  }

  @Test func rejectsABlankNameAndABadBalance() {
    var draft = AccountDraft()
    #expect(draft.newAccount() == .failure(.init("Ponle un nombre a la cuenta.")))
    draft.name = "X"
    draft.balanceText = "abc"
    #expect(draft.newAccount() == .failure(.init("El saldo no es válido")))
  }

  @Test func editingKeepsTheDebtSignWhenTheTypeIsUnchanged() throws {
    let original = account(type: .credito, balance: -50_000, cutoff: 10, payment: 25)
    var draft = AccountDraft(original)
    #expect(draft.balanceText == "500")
    draft.balanceText = "750"
    let update = try draft.update(from: original).get()
    #expect(update.balanceCents == -75_000)
  }

  @Test func changingTheTypeUsesThatTypesSign() throws {
    let original = account(type: .credito, balance: -50_000, cutoff: 10, payment: 25)
    var draft = AccountDraft(original)
    draft.type = .debito
    #expect(try draft.update(from: original).get().balanceCents == 50_000)
  }

  @Test func clearingBothStatementDaysSendsNulls() throws {
    let original = account(type: .credito, balance: -50_000, cutoff: 10, payment: 25)
    var draft = AccountDraft(original)
    draft.cutoffText = ""
    draft.paymentText = ""
    let update = try draft.update(from: original).get()
    let json = try JSONSerialization.jsonObject(with: JSONCoding.makeEncoder().encode(update)) as? [String: Any]
    #expect(json?["cutoffDay"] is NSNull)
    #expect(json?["paymentDay"] is NSNull)
  }

  @Test func daysBetweenCalendarDays() {
    let a = CalendarDay(year: 2026, month: 11, day: 1)
    let b = CalendarDay(year: 2026, month: 11, day: 20)
    #expect(b.days(since: a) == 19)
    #expect(a.days(since: b) == -19)
    #expect(a.days(since: a) == 0)
  }

  @Test func accountTypesReadInSpanish() {
    #expect(AccountType.wallet.label == "Billetera")
    #expect(AccountType.credito.emoji == "💳")
    #expect(AccountType.efectivo.showsBankDetails == false)
  }
}

struct GoalAndSubscriptionDraftTests {
  @Test func aNewJarStartsPrefilledAndBuildsARequest() throws {
    let draft = GoalDraft()
    #expect(draft.name == "Nuevo frasco")
    let request = try draft.newGoal().get()
    #expect(request.targetCents == 500_000)
    #expect(request.emoji == "🌿")
  }

  @Test func aJarTargetMustBeAboveZero() {
    var draft = GoalDraft()
    draft.targetText = "0"
    #expect(draft.newGoal() == .failure(.init("La meta debe ser mayor a $0")))
    draft.targetText = "10.555"
    #expect(draft.newGoal() == .failure(.init("El monto admite máximo 2 decimales")))
    draft.targetText = ""
    #expect(draft.canSave == false)
  }

  @Test func aSubscriptionNeedsEveryField() {
    var draft = SubscriptionDraft(today: CalendarDay(year: 2026, month: 11, day: 20))
    #expect(draft.canSave == false)
    draft.name = "Netflix"
    draft.category = "Entretenimiento"
    draft.amountText = "199"
    #expect(draft.canSave)
  }

  @Test func aSubscriptionBuildsItsRequest() throws {
    var draft = SubscriptionDraft(today: CalendarDay(year: 2026, month: 11, day: 20))
    draft.name = " Netflix "
    draft.category = "Entretenimiento"
    draft.amountText = "199.50"
    draft.cadence = .yearly
    let request = try draft.newSubscription().get()
    #expect(request.name == "Netflix")
    #expect(request.amountCents == 19_950)
    #expect(request.cadence == .yearly)
    #expect(request.nextChargeAt == CalendarDay(year: 2026, month: 11, day: 20))
  }

  @Test func aSubscriptionAmountMustBeAboveZero() {
    var draft = SubscriptionDraft()
    draft.name = "x"
    draft.category = "y"
    draft.amountText = "0"
    #expect(draft.newSubscription() == .failure(.init("El monto debe ser mayor a $0")))
  }

  @Test func avatarsAreStable() {
    #expect(Avatar.initial("  netflix") == "N")
    #expect(Avatar.initial("") == "?")
    #expect(Avatar.hue("Netflix") == Avatar.hue("Netflix"))
    #expect(Avatar.hue("Netflix") != Avatar.hue("Spotify"))
    #expect((0..<1).contains(Avatar.hue("x")))
  }
}

struct GroupRulesTests {
  private func group(balance: Int) -> ExpenseGroup {
    try! JSONCoding.makeDecoder().decode(
      ExpenseGroup.self,
      from: Data(
        """
        {"id":"g\(balance)","name":"G","createdBy":"u1","createdAt":"2026-01-01T00:00:00.000Z",
        "members":[{"userId":"u1","name":"Ana","email":"a@b.co"},{"userId":"u2","name":"Luis","email":"l@b.co"}],
        "myBalanceCents":\(balance)}
        """.utf8))
  }

  private func members() -> [GroupMember] {
    [GroupMember(userId: "u1", name: "Ana", email: "a"), GroupMember(userId: "u2", name: "Luis", email: "l"), GroupMember(userId: "u3", name: "Eva", email: "e")]
  }

  @Test func totalsSplitWhatYouAreOwedFromWhatYouOwe() {
    let totals = GroupRules.totals([group(balance: 5_000), group(balance: -2_000), group(balance: 300), group(balance: 0)])
    #expect(totals == GroupRules.Totals(owedToYou: 5_300, youOwe: 2_000))
  }

  @Test func debtLabelsReadFromYourPointOfView() {
    let names = ["u1": "Ana", "u2": "Luis"]
    #expect(GroupRules.debtLabel(GroupDebt(from: "u1", to: "u2", amountCents: 1), me: "u1", names: names) == "Le debes a Luis")
    #expect(GroupRules.debtLabel(GroupDebt(from: "u2", to: "u1", amountCents: 1), me: "u1", names: names) == "Luis te debe")
    #expect(GroupRules.debtLabel(GroupDebt(from: "u2", to: "u3", amountCents: 1), me: "u1", names: names) == "Luis le debe a Alguien")
    #expect(GroupRules.otherParty(GroupDebt(from: "u1", to: "u2", amountCents: 1), me: "u1") == "u2")
  }

  @Test func balanceTitles() {
    #expect(GroupRules.balanceTitle(10) == "Te deben")
    #expect(GroupRules.balanceTitle(-10) == "Debes")
    #expect(GroupRules.balanceTitle(0) == "Estás al día")
  }

  @Test func equalSharesOpenInEqualMode() throws {
    let expense = try JSONCoding.makeDecoder().decode(
      SharedExpense.self,
      from: Data(
        """
        {"id":"x","groupId":"g","paidBy":"u1","description":"Super","amountCents":10000,"date":"2026-11-10","createdBy":"u1",
        "createdAt":"2026-11-10T10:00:00.000Z","splits":[{"userId":"u1","shareCents":3334},{"userId":"u2","shareCents":3333},{"userId":"u3","shareCents":3333}]}
        """.utf8))
    #expect(GroupRules.isEqualSplit(expense))
    #expect(GroupRules.canEdit(expense, me: "u1"))
    #expect(GroupRules.canEdit(expense, me: "u2") == false)
    #expect(GroupRules.payerLabel(expense, me: "u1", names: [:]) == "Pagaste tú · entre 3")
    #expect(GroupRules.payerLabel(expense, me: "u2", names: ["u1": "Ana"]) == "Pagó Ana · entre 3")
    #expect(SharedExpenseDraft(expense).isCustom == false)
  }

  @Test func unequalSharesOpenInCustomMode() throws {
    let expense = try JSONCoding.makeDecoder().decode(
      SharedExpense.self,
      from: Data(
        """
        {"id":"x","groupId":"g","paidBy":"u1","description":"Cena","amountCents":10000,"date":"2026-11-10","createdBy":"u1",
        "createdAt":"2026-11-10T10:00:00.000Z","splits":[{"userId":"u1","shareCents":7000},{"userId":"u2","shareCents":3000}]}
        """.utf8))
    let draft = SharedExpenseDraft(expense)
    #expect(draft.isCustom)
    #expect(draft.customAmounts["u1"] == "70")
  }

  @Test func anEqualSplitSendsOnlyParticipants() throws {
    var draft = SharedExpenseDraft(me: "u1", members: members())
    draft.description = " Super "
    draft.amountText = "90"
    draft.participants = ["u1", "u3"]
    let request = try draft.request(date: CalendarDay(year: 2026, month: 11, day: 20), members: members()).get()
    #expect(request.participantIds == ["u1", "u3"])
    #expect(request.splits == nil)
    #expect(request.description == "Super")
    #expect(request.amountCents == 9_000)
  }

  @Test func customSharesMustAddUpToTheTotal() throws {
    var draft = SharedExpenseDraft(me: "u1", members: members())
    draft.description = "Cena"
    draft.amountText = "100"
    draft.isCustom = true
    draft.participants = ["u1", "u2"]
    draft.customAmounts = ["u1": "60", "u2": "30"]
    #expect(
      draft.request(date: CalendarDay(year: 2026, month: 11, day: 20), members: members())
        == .failure(.init("Las partes suman $90.00 y el gasto es de $100.00")))
    draft.customAmounts["u2"] = "40"
    let request = try draft.request(date: CalendarDay(year: 2026, month: 11, day: 20), members: members()).get()
    #expect(request.splits?.map(\.shareCents) == [6_000, 4_000])
    #expect(request.participantIds == nil)
  }

  @Test func needsAtLeastOnePersonAndAPositiveAmount() {
    var draft = SharedExpenseDraft(me: "u1", members: members())
    draft.description = "x"
    draft.amountText = "10"
    draft.participants = []
    #expect(draft.request(date: CalendarDay(year: 2026, month: 1, day: 1), members: members()) == .failure(.init("Elige al menos a una persona")))
    draft.participants = ["u1"]
    draft.amountText = "0"
    #expect(draft.request(date: CalendarDay(year: 2026, month: 1, day: 1), members: members()) == .failure(.init("El monto debe ser mayor a $0")))
  }
}

struct QuickExpenseTests {
  @Test func sirisAmountBecomesWholeCents() throws {
    let request = try QuickExpense.newExpense(pesos: 150.5, categoryId: "comida", note: nil).get()
    #expect(request.amountCents == 15_050)
    #expect(request.category == "comida")
    #expect(request.kind == .expense)
    #expect(request.accountId == nil)
  }

  @Test func floatingPointDriftDoesNotLoseACent() throws {
    #expect(try QuickExpense.newExpense(pesos: 0.29, categoryId: "otro", note: nil).get().amountCents == 29)
    #expect(try QuickExpense.newExpense(pesos: 1.15, categoryId: "otro", note: nil).get().amountCents == 115)
  }

  @Test func theNoteDefaultsToTheCategoryLabel() throws {
    #expect(try QuickExpense.newExpense(pesos: 10, categoryId: "super", note: "  ").get().description == "Súper")
    #expect(try QuickExpense.newExpense(pesos: 10, categoryId: "super", note: " Leche ").get().description == "Leche")
  }

  @Test func rejectsNonsenseAmounts() {
    for pesos in [0, -5, Double.nan, Double.infinity, 0.001] {
      #expect(QuickExpense.newExpense(pesos: pesos, categoryId: "comida", note: nil) == .failure(.init("El monto debe ser mayor a $0")))
    }
    #expect(QuickExpense.newExpense(pesos: 1e12, categoryId: "comida", note: nil) == .failure(.init("El monto es demasiado grande")))
  }

  @Test func presetsBuildTheirRequest() {
    let preset = QuickExpense.presets[0]
    #expect(preset.title == "$50")
    #expect(preset.emoji == "☕")
    let request = QuickExpense.newExpense(preset)
    #expect(request.amountCents == 5_000)
    #expect(request.description == "Café")
  }

  @Test func sirisConfirmation() {
    #expect(QuickExpense.confirmation(cents: 15_000, categoryId: "comida") == "Anotado: $150.00 en comida.")
  }
}
