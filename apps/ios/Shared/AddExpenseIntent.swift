import AppIntents
import CadaQuienKit

/// "Anota un gasto en Cada Quien": amount and category, logged without opening the app.
struct AddExpenseIntent: AppIntent {
    static let title: LocalizedStringResource = "Anotar gasto"
    static let description = IntentDescription("Registra un gasto en Cada Quien sin abrir la app.")
    static let openAppWhenRun = false

    @Parameter(title: "Monto", requestValueDialog: "¿Cuánto gastaste?")
    var amount: Double

    @Parameter(title: "Categoría", default: .otro)
    var category: ExpenseCategoryOption

    @Parameter(title: "Nota")
    var note: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Anotar \(\.$amount) en \(\.$category)") {
            \.$note
        }
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let request: ExpensesService.NewExpense
        switch QuickExpense.newExpense(pesos: amount, categoryId: category.rawValue, note: note) {
        case .success(let value): request = value
        case .failure(let failure): throw QuickAddError.message(failure.message)
        }
        try await QuickAdd.send(request)
        return .result(dialog: "\(QuickExpense.confirmation(cents: request.amountCents, categoryId: request.category))")
    }
}
