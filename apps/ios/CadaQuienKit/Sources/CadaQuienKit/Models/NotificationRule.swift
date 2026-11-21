import Foundation

/// What a calendar notification is about. The raw values are the API's.
public enum AlertKind: String, Codable, Sendable, CaseIterable {
    case income
    case cardCutoff = "card_cutoff"
    case cardPayment = "card_payment"
    case subscriptionMonthly = "subscription_monthly"
    case subscriptionYearly = "subscription_yearly"

    public var label: String {
        switch self {
        case .income: "Cuando me toca cobrar"
        case .cardCutoff: "Corte de tarjeta"
        case .cardPayment: "Pago de tarjeta"
        case .subscriptionMonthly: "Suscripciones mensuales"
        case .subscriptionYearly: "Suscripciones anuales"
        }
    }
}

/// How and when one kind of calendar notification is sent.
public struct NotificationRule: Codable, Sendable, Hashable, Identifiable {
    public let kind: AlertKind
    public var enabled: Bool
    /// `0` is the day itself.
    public var daysBefore: Int
    /// Local hour (0-23) it goes out from.
    public var hour: Int

    public var id: AlertKind { kind }

    public init(kind: AlertKind, enabled: Bool, daysBefore: Int, hour: Int) {
        self.kind = kind
        self.enabled = enabled
        self.daysBefore = daysBefore
        self.hour = hour
    }

    /// The choices offered for "how many days before": 0 to 14, 21 and 30, plus the stored value if it is none of those.
    public func daysChoices() -> [Int] {
        let base = Array(0...14) + [21, 30]
        return base.contains(daysBefore) ? base : (base + [daysBefore]).sorted()
    }

    public static func daysLabel(_ days: Int) -> String {
        switch days {
        case 0: "El mismo día"
        case 1: "1 día antes"
        default: "\(days) días antes"
        }
    }
}
