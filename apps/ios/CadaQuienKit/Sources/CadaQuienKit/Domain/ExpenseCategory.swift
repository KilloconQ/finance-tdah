/// The categories a person picks for an expense, with the emoji the web shows. The stored value is the raw `id`.
public struct ExpenseCategory: Identifiable, Hashable, Sendable {
    public let id: String
    public let label: String
    public let emoji: String

    public static let all = [
        ExpenseCategory(id: "comida", label: "Comida", emoji: "🍔"),
        ExpenseCategory(id: "café", label: "Café", emoji: "☕"),
        ExpenseCategory(id: "transporte", label: "Transporte", emoji: "🚗"),
        ExpenseCategory(id: "super", label: "Súper", emoji: "🛒"),
        ExpenseCategory(id: "salidas", label: "Salidas", emoji: "🎉"),
        ExpenseCategory(id: "salud", label: "Salud", emoji: "💊"),
        ExpenseCategory(id: "casa", label: "Casa", emoji: "🏠"),
        ExpenseCategory(id: "subs", label: "Suscripciones", emoji: "📺"),
        ExpenseCategory(id: "otro", label: "Otro", emoji: "•"),
    ]

    /// Movement rows show an emoji for any stored category, including legacy ones; unknown values fall back to a coin.
    public static func emoji(for category: String) -> String {
        switch category {
        case "comida": "🍔"
        case "café": "☕"
        case "transporte": "🚗"
        case "super": "🛒"
        case "salidas": "🎉"
        case "salud": "💊"
        case "casa", "hogar": "🏠"
        case "subs": "📺"
        case "ocio": "🎬"
        default: "🪙"
        }
    }

    public static let incomeCategory = "ingreso"
    public static let transferCategory = "transferencia"
}
