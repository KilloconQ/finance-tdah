import Foundation

/// What the new/edit account form holds, and the rules that turn it into a request. Mirrors the web account form.
public struct AccountDraft: Equatable, Sendable {
    public var name = ""
    public var type: AccountType = .debito
    public var balanceText = ""
    public var institution = ""
    public var last4 = ""
    public var cutoffText = ""
    public var paymentText = ""

    public init() {}

    /// Starts from an existing account; the balance is shown as a plain positive amount.
    public init(_ account: Account) {
        name = account.name
        type = account.type
        balanceText = account.balanceCents == 0 ? "" : Money.editableText(cents: abs(account.balanceCents))
        institution = account.institution ?? ""
        last4 = account.last4 ?? ""
        cutoffText = account.cutoffDay.map(String.init) ?? ""
        paymentText = account.paymentDay.map(String.init) ?? ""
    }

    public struct Failure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    public var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// An empty balance is 0. (The web rejects a typed "0" by accident; here it is accepted.)
    private func magnitude() throws -> Int {
        let text = balanceText.trimmingCharacters(in: .whitespaces)
        if text.isEmpty || text == "0" { return 0 }
        switch Money.parse(text) {
        case .success(let cents): return cents
        case .failure(let error):
            throw Failure(error == .invalid ? "El saldo no es válido" : (error.errorDescription ?? "El saldo no es válido"))
        }
    }

    /// Both statement days or neither; each from 1 to 31.
    private func statementDays() throws -> (cutoff: Int, payment: Int)? {
        let cutoffText = cutoffText.trimmingCharacters(in: .whitespaces)
        let paymentText = paymentText.trimmingCharacters(in: .whitespaces)
        if cutoffText.isEmpty && paymentText.isEmpty { return nil }
        guard !cutoffText.isEmpty, !paymentText.isEmpty else {
            throw Failure("Pon el día de corte y el de pago, o deja los dos vacíos")
        }
        guard let cutoff = Int(cutoffText), let payment = Int(paymentText), (1...31).contains(cutoff), (1...31).contains(payment)
        else { throw Failure("Los días van del 1 al 31") }
        return (cutoff, payment)
    }

    private func validatedName() throws -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw Failure("Ponle un nombre a la cuenta.") }
        return String(trimmed.prefix(60))
    }

    private func clean(_ text: String) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? nil : trimmed
    }

    /// Only digits, at most four.
    private var cleanLast4: String? {
        clean(String(last4.filter(\.isNumber).prefix(4)))
    }

    public func newAccount() -> Result<AccountsService.NewAccount, Failure> {
        Result {
            let days = type == .credito ? try statementDays() : nil
            return AccountsService.NewAccount(
                name: try validatedName(),
                type: type,
                balanceCents: AccountBalance.signed(type: type, magnitudeCents: try magnitude()),
                institution: type.showsBankDetails ? clean(institution) : nil,
                last4: type.showsBankDetails ? cleanLast4 : nil,
                cutoffDay: days?.cutoff,
                paymentDay: days?.payment)
        }.mapError { $0 as? Failure ?? Failure("No pudimos crear la cuenta") }
    }

    /// The balance keeps its sign when the type didn't change; a new type gets that type's canonical sign.
    public func update(from original: Account) -> Result<AccountsService.AccountUpdate, Failure> {
        Result {
            let magnitude = try magnitude()
            let balance: Int
            if type == original.type, original.balanceCents != 0 {
                balance = original.balanceCents < 0 ? -magnitude : magnitude
            } else {
                balance = AccountBalance.signed(type: type, magnitudeCents: magnitude)
            }
            var update = AccountsService.AccountUpdate(
                name: try validatedName(), type: type, balanceCents: balance,
                institution: type.showsBankDetails ? clean(institution) : "",
                last4: type.showsBankDetails ? cleanLast4 : "")
            if type == .credito {
                if let days = try statementDays() {
                    update.cutoffDay = .set(days.cutoff)
                    update.paymentDay = .set(days.payment)
                } else {
                    update.cutoffDay = .clear
                    update.paymentDay = .clear
                }
            }
            return update
        }.mapError { $0 as? Failure ?? Failure("No pudimos actualizar la cuenta") }
    }
}
