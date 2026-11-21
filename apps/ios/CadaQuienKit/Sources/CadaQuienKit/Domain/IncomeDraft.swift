import Foundation

/// The new/edit income form. The amount is optional: not everyone knows what the next payment will be.
public struct IncomeDraft: Equatable, Sendable {
    public var name = ""
    public var amountText = ""
    public var frequency: IncomeFrequency = .semimonthly
    public var startsOn: CalendarDay

    public init(today: CalendarDay = CalendarDay(Date())) {
        startsOn = today
    }

    public init(_ income: ScheduledIncome) {
        name = income.name
        amountText = income.amountCents.map { Money.editableText(cents: $0) } ?? ""
        frequency = income.frequency
        startsOn = income.startsOn
    }

    public struct Failure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    public var canSave: Bool { !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    private var cleanName: String { String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60)) }
    private var hasAmount: Bool { !amountText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    /// Nil when the amount was left empty.
    private func amountCents() throws -> Int? {
        guard hasAmount else { return nil }
        switch Money.parse(amountText) {
        case .success(let cents):
            guard cents <= 2_147_483_647 else { throw Failure("El monto es demasiado grande") }
            return cents
        case .failure(let error):
            let specific = error == .tooManyDecimals || error == .scientific
            throw Failure(specific ? (error.errorDescription ?? "") : "El monto debe ser mayor a $0")
        }
    }

    public func newIncome() -> Result<IncomesService.NewIncome, Failure> {
        Result {
            IncomesService.NewIncome(name: cleanName, amountCents: try amountCents(), frequency: frequency, startsOn: startsOn)
        }.mapError { $0 as? Failure ?? Failure("No pudimos guardar el ingreso") }
    }

    /// An emptied amount clears it on the server instead of leaving the old one.
    public func update() -> Result<IncomesService.IncomeUpdate, Failure> {
        Result {
            IncomesService.IncomeUpdate(
                name: cleanName, amountCents: try amountCents().map { .set($0) } ?? .clear, frequency: frequency, startsOn: startsOn)
        }.mapError { $0 as? Failure ?? Failure("No pudimos guardar el ingreso") }
    }
}
