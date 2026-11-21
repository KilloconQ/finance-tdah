import Foundation
import Testing

@testable import CadaQuienKit

private func account(_ id: String, _ type: AccountType = .debito, balance: Int = 100_000) -> Account {
  try! JSONCoding.makeDecoder().decode(
    Account.self,
    from: Data(
      """
      {"id":"\(id)","userId":"u","name":"\(id)","type":"\(type.rawValue)","institution":null,"last4":null,
      "balanceCents":\(balance),"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
      """.utf8))
}

private func envelope(_ id: String, account: String, balance: Int) -> Envelope {
  try! JSONCoding.makeDecoder().decode(
    Envelope.self,
    from: Data(
      """
      {"id":"\(id)","userId":"u","accountId":"\(account)","name":"E","emoji":"📦","balanceCents":\(balance),
      "createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
      """.utf8))
}

struct ExpenseFormTests {
  private let debit = account("debit")
  private let cash = account("cash", .efectivo)
  private let card = account("card", .credito, balance: -50_000)

  @Test func incomeCannotGoIntoACreditCard() {
    let available = ExpenseFormRules.availableAccounts(for: .income, accounts: [debit, card])
    #expect(available.map(\.id) == ["debit"])
    #expect(ExpenseFormRules.availableAccounts(for: .expense, accounts: [debit, card]).count == 2)
  }

  @Test func pickingAnIncomeMovesAwayFromACreditCard() {
    var draft = ExpenseDraft()
    draft.kind = .income
    draft.accountId = "card"
    let fixed = ExpenseFormRules.normalized(draft, accounts: [card, debit], envelopes: [])
    #expect(fixed.accountId == "debit")
  }

  @Test func firstAccountIsChosenWhenNoneIs() {
    let fixed = ExpenseFormRules.normalized(ExpenseDraft(), accounts: [debit, cash], envelopes: [])
    #expect(fixed.accountId == "debit")
  }

  @Test func aTransferNeedsADifferentDestination() {
    var draft = ExpenseDraft()
    draft.kind = .transfer
    draft.accountId = "debit"
    draft.toAccountId = "debit"
    let fixed = ExpenseFormRules.normalized(draft, accounts: [debit, cash], envelopes: [])
    #expect(fixed.toAccountId == "cash")
  }

  @Test func destinationIsDroppedOutsideTransfers() {
    var draft = ExpenseDraft()
    draft.accountId = "debit"
    draft.toAccountId = "cash"
    #expect(ExpenseFormRules.normalized(draft, accounts: [debit, cash], envelopes: []).toAccountId == nil)
  }

  @Test func envelopeMustBelongToTheChosenAccountAndAnExpense() {
    let own = envelope("own", account: "debit", balance: 1_000)
    let foreign = envelope("foreign", account: "cash", balance: 1_000)
    var draft = ExpenseDraft()
    draft.accountId = "debit"
    draft.envelopeId = "own"
    #expect(ExpenseFormRules.normalized(draft, accounts: [debit, cash], envelopes: [own, foreign]).envelopeId == "own")

    draft.envelopeId = "foreign"
    #expect(ExpenseFormRules.normalized(draft, accounts: [debit, cash], envelopes: [own, foreign]).envelopeId == nil)

    draft.envelopeId = "own"
    draft.kind = .income
    #expect(ExpenseFormRules.normalized(draft, accounts: [debit, cash], envelopes: [own]).envelopeId == nil)
  }

  @Test func listsExactlyWhatIsMissing() {
    var draft = ExpenseDraft()
    #expect(
      ExpenseFormRules.missingMessage(draft, accounts: [debit])
        == "Te falta: el monto, la categoría, una nota, la cuenta.")
    draft.amountText = "15"
    draft.category = "comida"
    draft.note = "Tacos"
    draft.accountId = "debit"
    #expect(ExpenseFormRules.missingMessage(draft, accounts: [debit]) == nil)
    #expect(ExpenseFormRules.canSave(draft, accounts: [debit]))
  }

  @Test func incomeAndTransfersNeedNoCategory() {
    var draft = ExpenseDraft()
    draft.kind = .income
    draft.amountText = "100"
    draft.note = "Pago"
    draft.accountId = "debit"
    #expect(ExpenseFormRules.canSave(draft, accounts: [debit]))
    #expect(ExpenseFormRules.category(for: draft) == "ingreso")

    draft.kind = .transfer
    #expect(ExpenseFormRules.missingFields(draft, accounts: [debit, cash]) == ["la cuenta de destino"])
    #expect(ExpenseFormRules.category(for: draft) == "transferencia")
  }

  @Test func noAccountsMeansNoAccountIsRequired() {
    var draft = ExpenseDraft()
    draft.amountText = "10"
    draft.category = "comida"
    draft.note = "x"
    #expect(ExpenseFormRules.canSave(draft, accounts: []))
  }

  @Test func buildsTheRequestFromWhatWasTyped() throws {
    var draft = ExpenseDraft()
    draft.amountText = "1,250.50"
    draft.category = "super"
    draft.note = "  Despensa  "
    draft.accountId = "debit"
    draft.envelopeId = "env"
    let request = try ExpenseFormRules.newExpense(from: draft).get()
    #expect(request.amountCents == 125_050)
    #expect(request.description == "Despensa")
    #expect(request.category == "super")
    #expect(request.envelopeId == "env")
    #expect(request.toAccountId == nil)
  }

  @Test func aTransferSendsItsDestinationButNeverAnEnvelope() throws {
    var draft = ExpenseDraft()
    draft.kind = .transfer
    draft.amountText = "200"
    draft.note = "Pago tarjeta"
    draft.accountId = "debit"
    draft.toAccountId = "card"
    draft.envelopeId = "env"
    let request = try ExpenseFormRules.newExpense(from: draft).get()
    #expect(request.toAccountId == "card")
    #expect(request.envelopeId == nil)
  }

  @Test func amountErrorsReadInSpanish() {
    var draft = ExpenseDraft()
    draft.amountText = "10.555"
    #expect(ExpenseFormRules.amountCents(draft) == .failure(.init("El monto admite máximo 2 decimales")))
    draft.amountText = "0"
    #expect(ExpenseFormRules.amountCents(draft) == .failure(.init("El monto debe ser mayor a $0")))
    draft.amountText = "99999999999"
    #expect(ExpenseFormRules.amountCents(draft) == .failure(.init("El monto es demasiado grande")))
  }

  @Test func editingClearsTheEnvelopeWhenNoneIsChosen() throws {
    var draft = ExpenseDraft()
    draft.amountText = "10"
    draft.category = "comida"
    draft.note = "x"
    let update = try ExpenseFormRules.update(from: draft).get()
    let json = try JSONSerialization.jsonObject(with: JSONCoding.makeEncoder().encode(update)) as? [String: Any]
    #expect(json?["envelopeId"] is NSNull)
  }

  @Test func editShowsTheStoredAmountWithoutTrailingZeros() {
    #expect(ExpenseDraft.amountText(cents: 1_500) == "15")
    #expect(ExpenseDraft.amountText(cents: 1_550) == "15.5")
    #expect(ExpenseDraft.amountText(cents: 1_505) == "15.05")
  }

  @Test func warnsAboutLockedMoney() {
    let env = envelope("e", account: "debit", balance: 20_000)
    let note = ExpenseFormRules.lockedNote(kind: .expense, account: debit, envelopes: [env], hidden: false)
    #expect(note == "🔒 $200.00 bloqueado en cajitas · puedes gastar $800.00")
    #expect(ExpenseFormRules.lockedNote(kind: .income, account: debit, envelopes: [env], hidden: false) == nil)
    #expect(ExpenseFormRules.lockedNote(kind: .expense, account: debit, envelopes: [], hidden: false) == nil)
  }

  @Test func categoriesHaveEmojiEvenForLegacyValues() {
    #expect(ExpenseCategory.emoji(for: "comida") == "🍔")
    #expect(ExpenseCategory.emoji(for: "hogar") == "🏠")
    #expect(ExpenseCategory.emoji(for: "algo raro") == "🪙")
    #expect(ExpenseCategory.all.count == 9)
  }
}
