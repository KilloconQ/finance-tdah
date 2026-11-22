import SwiftUI

/// "Registrar": the add-expense form in a sheet. It can't be swiped away while there is something typed or a save running.
struct AddExpenseSheet: View {
    @Environment(Navigator.self) private var navigator
    @State private var model = ExpenseFormModel(mode: .create)

    var body: some View {
        NavigationStack {
            ExpenseForm(model: model) { navigator.isAddingExpense = false }
                .navigationTitle("Registrar")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cerrar", systemImage: "xmark") { navigator.isAddingExpense = false }
                            .disabled(model.isSaving)
                    }
                }
        }
        .interactiveDismissDisabled(model.draft.isDirty || model.isSaving)
    }
}
