import Foundation

/// Logging an expense in one step, from the widget or from Siri/Shortcuts: an amount, a category and an optional note.
/// Like the web's voice capture, it records no account (the person can assign one later).
public enum QuickExpense {
    public struct Preset: Identifiable, Equatable, Sendable {
        public let id: String
        public let amountCents: Int
        public let categoryId: String

        public init(id: String, amountCents: Int, categoryId: String) {
            self.id = id
            self.amountCents = amountCents
            self.categoryId = categoryId
        }

        public var category: ExpenseCategory? { ExpenseCategory.all.first { $0.id == categoryId } }
        public var emoji: String { ExpenseCategory.emoji(for: categoryId) }
        public var title: String { Money.format(cents: amountCents).replacingOccurrences(of: ".00", with: "") }
    }

    /// The one-tap buttons of the widget.
    public static let presets = [
        Preset(id: "cafe-50", amountCents: 5_000, categoryId: "café"),
        Preset(id: "comida-120", amountCents: 12_000, categoryId: "comida"),
        Preset(id: "transporte-40", amountCents: 4_000, categoryId: "transporte"),
    ]

    public struct Failure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    /// `pesos` comes from Siri as a Double ("150" or "150.5"), so it is rounded to whole cents.
    public static func newExpense(pesos: Double, categoryId: String, note: String?) -> Result<ExpensesService.NewExpense, Failure> {
        guard pesos.isFinite, pesos > 0 else { return .failure(.init("El monto debe ser mayor a $0")) }
        let cents = Money.cents(fromUnits: pesos)
        guard cents >= 1 else { return .failure(.init("El monto debe ser mayor a $0")) }
        guard cents <= 2_147_483_647 else { return .failure(.init("El monto es demasiado grande")) }

        let label = ExpenseCategory.all.first { $0.id == categoryId }?.label ?? categoryId.capitalized
        let cleanNote = note?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let description = cleanNote.isEmpty ? label : String(cleanNote.prefix(ExpenseFormRules.noteLimit))
        return .success(.init(kind: .expense, amountCents: cents, category: categoryId, description: description))
    }

    public static func newExpense(_ preset: Preset) -> ExpensesService.NewExpense {
        let label = preset.category?.label ?? preset.categoryId.capitalized
        return .init(kind: .expense, amountCents: preset.amountCents, category: preset.categoryId, description: label)
    }

    /// What Siri says back: "Anotado: $150.00 en comida."
    public static func confirmation(cents: Int, categoryId: String) -> String {
        "Anotado: \(Money.format(cents: cents)) en \(categoryId)."
    }
}
