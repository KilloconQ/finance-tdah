import Foundation

public struct CalendarEvent: Codable, Sendable, Hashable, Identifiable {
    public enum Kind: String, Codable, Sendable {
        case cardPayment = "card_payment"
        case subscription
        case income

        public var label: String {
            switch self {
            case .cardPayment: "Pago de tarjeta"
            case .subscription: "Suscripción"
            case .income: "Ingreso"
            }
        }
    }

    public let date: CalendarDay
    public let kind: Kind
    public let title: String
    /// Nil when it isn't known: a card's amount due, or an income registered without one.
    public let amountCents: Int?
    public let sourceId: String

    public var id: String { "\(date.rawValue)-\(kind.rawValue)-\(sourceId)" }
}

/// What the API answers for a date range. `today` is in the owner's time zone, so every client marks the same day.
public struct CalendarResponse: Codable, Sendable, Hashable {
    public let today: CalendarDay
    public let events: [CalendarEvent]
}
