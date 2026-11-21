import Foundation

/// The new/edit subscription form. The category is free text, as on the web.
public struct SubscriptionDraft: Equatable, Sendable {
    public var name = ""
    public var category = ""
    public var amountText = ""
    public var cadence: SubscriptionCadence = .monthly
    public var nextCharge: CalendarDay

    public init(today: CalendarDay = CalendarDay(Date())) {
        nextCharge = today
    }

    public init(_ subscription: Subscription) {
        name = subscription.name
        category = subscription.category
        amountText = Money.editableText(cents: subscription.amountCents)
        cadence = subscription.cadence
        nextCharge = subscription.nextChargeAt
    }

    public struct Failure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    public var canSave: Bool {
        ![name, category, amountText].contains { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func amountCents() throws -> Int {
        switch Money.parse(amountText) {
        case .success(let cents):
            guard cents <= 2_147_483_647 else { throw Failure("El monto es demasiado grande") }
            return cents
        case .failure(let error):
            let specific = error == .tooManyDecimals || error == .scientific
            throw Failure(specific ? (error.errorDescription ?? "") : "El monto debe ser mayor a $0")
        }
    }

    private var cleanName: String { String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60)) }
    private var cleanCategory: String { String(category.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40)) }

    public func newSubscription() -> Result<SubscriptionsService.NewSubscription, Failure> {
        Result {
            SubscriptionsService.NewSubscription(
                name: cleanName, category: cleanCategory, amountCents: try amountCents(), cadence: cadence, nextChargeAt: nextCharge)
        }.mapError { $0 as? Failure ?? Failure("No pudimos crear la suscripción") }
    }

    public func update() -> Result<SubscriptionsService.SubscriptionUpdate, Failure> {
        Result {
            SubscriptionsService.SubscriptionUpdate(
                name: cleanName, category: cleanCategory, amountCents: try amountCents(), cadence: cadence, nextChargeAt: nextCharge)
        }.mapError { $0 as? Failure ?? Failure("No pudimos actualizar la suscripción") }
    }
}

public enum Avatar {
    /// First letter, uppercased; `?` when the name is empty.
    public static func initial(_ name: String) -> String {
        name.trimmingCharacters(in: .whitespacesAndNewlines).first.map { String($0).uppercased() } ?? "?"
    }

    /// A stable hue in 0..<1 per name, so each subscription keeps its own tint.
    public static func hue(_ name: String) -> Double {
        var hash: UInt32 = 5381
        for byte in name.utf8 { hash = (hash &* 33) &+ UInt32(byte) }
        return Double(hash % 360) / 360
    }
}
