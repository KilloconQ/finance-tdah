import AppIntents
import CadaQuienKit

/// The widget's one-tap buttons ("☕ $50"). Not offered in Shortcuts: it exists for the widget.
struct AddPresetExpenseIntent: AppIntent {
    static let title: LocalizedStringResource = "Anotar gasto rápido"
    static let isDiscoverable = false
    static let openAppWhenRun = false

    @Parameter(title: "Atajo")
    var presetId: String

    init() {}

    init(presetId: String) {
        self.presetId = presetId
    }

    func perform() async throws -> some IntentResult {
        guard let preset = QuickExpense.presets.first(where: { $0.id == presetId }) else {
            throw QuickAddError.message("Ese atajo ya no existe.")
        }
        try await QuickAdd.send(QuickExpense.newExpense(preset))
        return .result()
    }
}
